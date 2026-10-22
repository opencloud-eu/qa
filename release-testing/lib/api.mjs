// API access for scripts: log in through the browser once, take the user's OIDC access token from browser storage
// and call Graph / WebDAV with it. No basic auth, no passwords in requests.
//   const alan = await session('alan')            // demo user
//   const qa = await session({ user, pass })      // any user
//   const drive = await alan.personalDrive()
//   await alan.put(drive.id, 'qa/a.txt', 'hello')
import crypto from 'node:crypto';
import { request } from '@playwright/test';
import { open, login, URL } from './oc.mjs';

export const ROLES = {
  viewer: 'b1e2218d-eef8-4d4c-b82d-0f1a1b48f3b5',
  editor: 'fb6c3e19-e378-47e5-b277-9732f9de6e21', // folder
  fileEditor: '2d00ce52-1fc2-4dbc-8b95-a73b73395f5a',
  spaceViewer: 'a8d5fe5e-96e3-418d-825b-534dbdf22b99',
  spaceEditor: '58c63c02-1d89-4572-916a-870abc5a1b7d',
  manager: '312c0871-5ef7-4b3a-85b6-0e4074c64049',
};
export const APP_ROLES = { spaceAdmin: '2aadd357-682c-406b-8874-293091995fdd' };

export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
export const randomPassword = () => 'Qa#' + crypto.randomBytes(9).toString('base64url') + '9a';
export const days = (n) => new Date(Date.now() + n * 864e5).toISOString();
const enc = (p) => p.split('/').map(encodeURIComponent).join('/');

async function token(who) {
  const { browser, page } = await open();
  try {
    await login(page, who);
    const t = await page.evaluate(() => {
      for (const s of [localStorage, sessionStorage]) {
        for (let i = 0; i < s.length; i++) {
          const k = s.key(i);
          if (k.startsWith('oc_oAuth.user:')) return JSON.parse(s.getItem(k)).access_token;
        }
      }
      return null;
    });
    if (!t) throw new Error('no OIDC token in browser storage');
    return t;
  } finally { await browser.close(); }
}

export async function anonymous() {
  return request.newContext({ baseURL: URL, ignoreHTTPSErrors: true });
}

/** Authenticated API session for a user (demo user name or { user, pass }). */
export async function session(who) {
  let ctx = await request.newContext({ baseURL: URL, ignoreHTTPSErrors: true,
    extraHTTPHeaders: { Authorization: `Bearer ${await token(who)}` } });

  // one retry with a fresh token on 401 (tokens are short-lived)
  async function call(method, path, opts = {}) {
    let res = await ctx.fetch(path, { method, ...opts });
    if (res.status() === 401) {
      await ctx.dispose();
      ctx = await request.newContext({ baseURL: URL, ignoreHTTPSErrors: true,
        extraHTTPHeaders: { Authorization: `Bearer ${await token(who)}` } });
      res = await ctx.fetch(path, { method, ...opts });
    }
    return res;
  }
  async function json(method, path, data, ok = [200, 201, 204]) {
    const res = await call(method, path, data === undefined ? {} : { data });
    const body = await res.text();
    if (!ok.includes(res.status())) throw new Error(`${method} ${path} → HTTP ${res.status()} ${body.slice(0, 300)}`);
    return body ? JSON.parse(body) : null;
  }
  const props = (xml, name) => [...xml.matchAll(new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([^<]*)<`, 'g'))].map(m => m[1]);

  const api = {
    who, call, json,
    graph: (method, path, data, ok) => json(method, `/graph${path}`, data, ok),
    me: () => json('GET', '/graph/v1.0/me?$expand=memberOf'),
    drives: () => json('GET', '/graph/v1.0/me/drives').then(r => r.value),
    personalDrive: async () => (await api.drives()).find(d => d.driveType === 'personal'),

    dav: (method, path, opts) => call(method, `/dav/spaces/${path}`, opts),
    async mkdir(driveId, path) {
      let cur = '';
      for (const part of path.split('/')) {
        cur = cur ? `${cur}/${part}` : part;
        const res = await call('MKCOL', `/dav/spaces/${driveId}/${enc(cur)}`);
        if (![201, 405].includes(res.status())) throw new Error(`MKCOL ${cur} → HTTP ${res.status()}`);
      }
    },
    async put(driveId, path, body, headers = {}) {
      const res = await call('PUT', `/dav/spaces/${driveId}/${enc(path)}`, { data: Buffer.from(body), headers });
      if (![201, 204].includes(res.status())) throw new Error(`PUT ${path} → HTTP ${res.status()} ${(await res.text()).slice(0, 200)}`);
      return res.headers()['oc-fileid'];
    },
    async get(driveId, path) {
      const res = await call('GET', `/dav/spaces/${driveId}/${enc(path)}`);
      return { status: res.status(), body: res.ok() ? await res.body() : null };
    },
    async remove(driveId, path) {
      const res = await call('DELETE', `/dav/spaces/${driveId}/${enc(path)}`);
      if (res.status() !== 204) throw new Error(`DELETE ${path} → HTTP ${res.status()}`);
    },
    /** PROPFIND depth 0 or 1 → [{ href, fileid, size, favorite, tags, mtime }] */
    async list(driveId, path = '', depth = 1) {
      const body = `<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns"><d:prop>
        <oc:fileid/><oc:size/><oc:favorite/><oc:tags/><d:getlastmodified/><d:getcontentlength/><oc:checksums/></d:prop></d:propfind>`;
      const res = await call('PROPFIND', `/dav/spaces/${driveId}/${enc(path)}`, { data: body, headers: { Depth: String(depth) } });
      if (res.status() !== 207) return { status: res.status(), items: [] };
      const xml = await res.text();
      const items = xml.split(/<d:response>/).slice(1).map(r => ({
        href: decodeURIComponent(props(r, 'href')[0] ?? ''),
        fileid: props(r, 'fileid')[0],
        size: Number(props(r, 'size')[0] ?? props(r, 'getcontentlength')[0]),
        favorite: props(r, 'favorite')[0],
        tags: props(r, 'tags')[0],
        mtime: props(r, 'getlastmodified')[0],
      }));
      return { status: 207, items };
    },
    async fileId(driveId, path) {
      const { items } = await api.list(driveId, path, 0);
      if (!items[0]?.fileid) throw new Error(`no fileid for ${path}`);
      return items[0].fileid;
    },
    async favorite(driveId, path, on = true) {
      const body = `<?xml version="1.0"?><d:propertyupdate xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns"><d:set><d:prop><oc:favorite>${on}</oc:favorite></d:prop></d:set></d:propertyupdate>`;
      const res = await call('PROPPATCH', `/dav/spaces/${driveId}/${enc(path)}`, { data: body });
      if (res.status() !== 207) throw new Error(`PROPPATCH favorite ${path} → HTTP ${res.status()}`);
    },
    async versions(fileId) {
      const res = await call('PROPFIND', `/dav/meta/${encodeURIComponent(fileId)}/v`, { headers: { Depth: '1' } });
      if (res.status() !== 207) return [];
      return [...(await res.text()).matchAll(/<d:href>([^<]+)<\/d:href>/g)].map(m => m[1]).slice(1);
    },
    async trash(driveId) {
      const res = await call('PROPFIND', `/dav/spaces/trash-bin/${driveId}`, { headers: { Depth: '1' },
        data: `<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns"><d:prop><oc:trashbin-original-location/><oc:trashbin-original-filename/></d:prop></d:propfind>` });
      if (res.status() !== 207) return [];
      const xml = await res.text();
      return xml.split(/<d:response>/).slice(2).map(r => ({
        href: props(r, 'href')[0], location: props(r, 'trashbin-original-location')[0], name: props(r, 'trashbin-original-filename')[0],
      }));
    },
    async restore(driveId, item) {
      const dest = `${URL}/dav/spaces/${driveId}/${enc(item.location)}`;
      const res = await call('MOVE', item.href, { headers: { Destination: dest } });
      if (![201, 204].includes(res.status())) throw new Error(`restore ${item.location} → HTTP ${res.status()}`);
    },
    /** KQL search, returns names of matching resources */
    async search(kql, limit = 50) {
      const body = `<?xml version="1.0"?><oc:search-files xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns"><d:prop><oc:name/><oc:fileid/></d:prop><oc:search><oc:pattern>${kql.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</oc:pattern><oc:limit>${limit}</oc:limit></oc:search></oc:search-files>`;
      const res = await call('REPORT', '/dav/spaces/', { data: body });
      if (res.status() !== 207) throw new Error(`search ${kql} → HTTP ${res.status()}`);
      return props(await res.text(), 'name');
    },
    setTags: (resourceId, tags) => json('PUT', '/graph/v1.0/extensions/org.libregraph/tags', { resourceId, tags }),
    activities: (fileId) => json('GET', `/graph/v1beta1/extensions/org.libregraph/activities?kql=${encodeURIComponent(`itemid:${fileId} AND limit:100 AND sort:desc`)}`).then(r => r?.value ?? []),
    invite: (driveId, itemId, recipients, role, expirationDateTime) =>
      json('POST', itemId ? `/graph/v1beta1/drives/${driveId}/items/${encodeURIComponent(itemId)}/invite` : `/graph/v1beta1/drives/${driveId}/root/invite`,
        { roles: [role], recipients, ...(expirationDateTime && { expirationDateTime }) }).then(r => r.value[0]),
    createLink: (driveId, itemId, body) =>
      json('POST', itemId ? `/graph/v1beta1/drives/${driveId}/items/${encodeURIComponent(itemId)}/createLink` : `/graph/v1beta1/drives/${driveId}/root/createLink`,
        { '@libre.graph.quickLink': false, ...body }),
    permissions: (driveId, itemId) =>
      json('GET', itemId ? `/graph/v1beta1/drives/${driveId}/items/${encodeURIComponent(itemId)}/permissions` : `/graph/v1beta1/drives/${driveId}/root/permissions`).then(r => r.value ?? []),
    sharedWithMe: () => json('GET', '/graph/v1beta1/me/drive/sharedWithMe').then(r => r.value ?? []),
    dispose: () => ctx.dispose(),
  };
  return api;
}

/** Find a user or group id by name (needs a session that may list users, e.g. admin). */
export async function userId(api, name) {
  // $filter on onPremisesSamAccountName is not supported by older versions (7.x: HTTP 501) → fall back to $search
  const r = await api.graph('GET', `/v1.0/users?$filter=${encodeURIComponent(`onPremisesSamAccountName eq '${name}'`)}`, undefined, [200, 400, 501]);
  let u = r?.value?.[0];
  if (!u) {
    const s = await api.graph('GET', `/v1.0/users?$search=${encodeURIComponent(`"${name}"`)}`);
    u = s.value?.find(x => x.onPremisesSamAccountName === name);
  }
  if (!u) throw new Error(`user ${name} not found`);
  return u.id;
}
export async function groupByName(api, name) {
  const r = await api.graph('GET', `/v1.0/groups?$search=${encodeURIComponent(`"${name}"`)}`);
  return r.value?.find(g => g.displayName === name);
}
