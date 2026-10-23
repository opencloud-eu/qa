// Shares of alan: user share with expiration, group share, public links (password, expiration, edit, file drop),
// internal link. Recipients: lynn (user), mary via group qa-up-share-group.
import { session, userId, groupByName, ROLES, days, randomPassword, anonymous } from '../../lib/api.mjs';
import { URL } from '../../lib/oc.mjs';

const DIR = 'qa-up-sharing';

export async function seed(t) {
  const admin = await session('admin');
  let group = await groupByName(admin, 'qa-up-share-group');
  if (!group) group = await admin.graph('POST', '/v1.0/groups', { displayName: 'qa-up-share-group' });
  const maryId = await userId(admin, 'mary');
  await admin.graph('POST', `/v1.0/groups/${group.id}/members/$ref`, { '@odata.id': `${URL}/graph/v1.0/users/${maryId}` }, [204, 400, 409]);
  const lynnId = await userId(admin, 'lynn');
  await admin.dispose();

  const alan = await session('alan');
  const d = (await alan.personalDrive()).id;
  const s = t.state = { driveId: d, items: {}, links: {}, expiration: days(60) };
  for (const f of ['for-group', 'link-folder', 'drop']) await alan.mkdir(d, `${DIR}/${f}`);
  await alan.put(d, `${DIR}/for-lynn.txt`, 'shared with lynn');
  await alan.put(d, `${DIR}/for-group/inside.txt`, 'shared with group');
  await alan.put(d, `${DIR}/link-folder/inside.txt`, 'public link');
  for (const p of ['for-lynn.txt', 'for-group', 'link-folder', 'drop']) s.items[p] = await alan.fileId(d, `${DIR}/${p}`);

  await alan.invite(d, s.items['for-lynn.txt'], [{ objectId: lynnId, '@libre.graph.recipient.type': 'user' }], ROLES.fileEditor, s.expiration);
  await alan.invite(d, s.items['for-group'], [{ objectId: group.id, '@libre.graph.recipient.type': 'group' }], ROLES.viewer);

  const linkPw = randomPassword();
  const view = await alan.createLink(d, s.items['link-folder'], { type: 'view', password: linkPw, expirationDateTime: s.expiration, displayName: 'qa-up view link' });
  const edit = await alan.createLink(d, s.items['link-folder'], { type: 'edit', password: linkPw, displayName: 'qa-up edit link' });
  const drop = await alan.createLink(d, s.items['drop'], { type: 'createOnly', password: linkPw, displayName: 'qa-up file drop' });
  const internal = await alan.createLink(d, s.items['for-lynn.txt'], { type: 'internal', displayName: 'qa-up internal link' });
  s.linkPassword = linkPw;
  for (const [k, l] of Object.entries({ view, edit, drop, internal })) s.links[k] = { id: l.id, url: l.link.webUrl, type: l.link.type };

  s.permissions = {};
  for (const [p, id] of Object.entries(s.items)) s.permissions[p] = (await alan.permissions(d, id)).length;
  await alan.dispose();
}

const token = (url) => url.split('/').pop();

export async function verify(t) {
  const s = t.state;
  const alan = await session('alan');
  for (const [p, id] of Object.entries(s.items)) {
    await t.check(`permissions on ${p}`, async () => {
      const perms = await alan.permissions(s.driveId, id);
      return perms.length === s.permissions[p] || `${perms.length} now, ${s.permissions[p]} before`;
    });
  }
  await t.check('user share keeps role and expiration', async () => {
    const perms = await alan.permissions(s.driveId, s.items['for-lynn.txt']);
    const share = perms.find(p => p.grantedToV2?.user?.displayName?.toLowerCase().includes('lynn'));
    if (!share) return 'no share for lynn';
    if (!share.roles?.includes(ROLES.fileEditor)) return `roles ${share.roles}`;
    return share.expirationDateTime?.slice(0, 10) === s.expiration.slice(0, 10) || `expiration ${share.expirationDateTime}`;
  });
  await t.check('links keep type and url', async () => {
    const all = [...await alan.permissions(s.driveId, s.items['link-folder']), ...await alan.permissions(s.driveId, s.items['drop']),
      ...await alan.permissions(s.driveId, s.items['for-lynn.txt'])].filter(p => p.link);
    const missing = Object.entries(s.links).filter(([, l]) => !all.some(p => p.link.webUrl === l.url && p.link.type === l.type));
    return missing.length === 0 || `missing: ${missing.map(([k]) => k).join(', ')}`;
  });
  await alan.dispose();

  const lynn = await session('lynn');
  await t.check('lynn sees the user share', async () => (await lynn.sharedWithMe()).some(i => i.name === 'for-lynn.txt') || 'not in shared with me');
  await lynn.dispose();
  const mary = await session('mary');
  await t.check('mary sees the group share', async () => (await mary.sharedWithMe()).some(i => i.name === 'for-group') || 'not in shared with me');
  await mary.dispose();

  const anon = await anonymous();
  const auth = { Authorization: 'Basic ' + Buffer.from(`public:${s.linkPassword}`).toString('base64') };
  await t.check('public link opens with password', async () => {
    const res = await anon.fetch(`/dav/public-files/${token(s.links.view.url)}/inside.txt`, { headers: auth });
    return (res.status() === 200 && (await res.text()) === 'public link') || `HTTP ${res.status()}`;
  });
  await t.check('public link refuses without password', async () => {
    const res = await anon.fetch(`/dav/public-files/${token(s.links.view.url)}/inside.txt`);
    return [401, 403, 404].includes(res.status()) || `HTTP ${res.status()}`;
  });
  await t.check('edit link can upload', async () => {
    const res = await anon.fetch(`/dav/public-files/${token(s.links.edit.url)}/qa-up-${t.phase}.txt`, { method: 'PUT', data: 'x', headers: auth });
    return [201, 204].includes(res.status()) || `HTTP ${res.status()}`;
  });
  await t.check('file drop accepts upload', async () => {
    const res = await anon.fetch(`/dav/public-files/${token(s.links.drop.url)}/qa-up-drop-${t.phase}.txt`, { method: 'PUT', data: 'x', headers: auth });
    return [201, 204].includes(res.status()) || `HTTP ${res.status()}`;
  });
  await anon.dispose();
}
