// Project spaces of margaret (Space Admin): quota, description, readme, image, members with roles and expiration,
// public link, files with versions and trash, a disabled space.
import { session, userId, ROLES, days, randomPassword, sha256 } from '../../lib/api.mjs';

const GB = 1024 ** 3;
// 1×1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

export async function seed(t) {
  const admin = await session('admin');
  const lynnId = await userId(admin, 'lynn');
  const maryId = await userId(admin, 'mary');
  await admin.dispose();

  const m = await session('margaret');
  const space = await m.graph('POST', '/v1.0/drives?template=default', { name: 'qa-up-space', description: 'qa upgrade subtitle', quota: { total: 2 * GB } });
  const d = space.id;
  const s = t.state = { driveId: d, expiration: days(60), files: {} };

  await m.graph('PATCH', `/v1.0/drives/${d}`, { quota: { total: 3 * GB } });
  await m.mkdir(d, '.space');
  const readmeId = await m.put(d, '.space/readme.md', '# qa upgrade readme') ?? await m.fileId(d, '.space/readme.md');
  const imageId = await m.put(d, '.space/image.png', PNG) ?? await m.fileId(d, '.space/image.png');
  await m.graph('PATCH', `/v1.0/drives/${d}`, { special: [{ specialFolder: { name: 'readme' }, id: readmeId }] });
  await m.graph('PATCH', `/v1.0/drives/${d}`, { special: [{ specialFolder: { name: 'image' }, id: imageId }] });

  await m.invite(d, null, [{ objectId: lynnId, '@libre.graph.recipient.type': 'user' }], ROLES.spaceEditor);
  await m.invite(d, null, [{ objectId: maryId, '@libre.graph.recipient.type': 'user' }], ROLES.spaceViewer, s.expiration);
  s.linkPassword = randomPassword();
  const link = await m.createLink(d, null, { type: 'view', password: s.linkPassword, displayName: 'qa-up space link' });
  s.linkUrl = link.link.webUrl;

  await m.mkdir(d, 'docs/sub');
  for (const v of ['space v1', 'space v2', 'space v3']) await m.put(d, 'docs/versions.txt', v);
  s.files['docs/versions.txt'] = sha256(Buffer.from('space v3'));
  await m.put(d, 'docs/sub/file.txt', 'in a project space');
  s.files['docs/sub/file.txt'] = sha256(Buffer.from('in a project space'));
  s.versionsId = await m.fileId(d, 'docs/versions.txt');
  await m.put(d, 'docs/trashed.txt', 'space trash');
  await m.remove(d, 'docs/trashed.txt');

  const lynnUpload = await session('lynn');
  await lynnUpload.put(d, 'docs/by-lynn.txt', 'uploaded by a space editor');
  s.files['docs/by-lynn.txt'] = sha256(Buffer.from('uploaded by a space editor'));
  await lynnUpload.dispose();

  const disabled = await m.graph('POST', '/v1.0/drives?template=default', { name: 'qa-up-space-disabled' });
  await m.graph('DELETE', `/v1.0/drives/${disabled.id}`, undefined, [204]);
  s.disabledId = disabled.id;
  s.permissions = (await m.permissions(d)).length;
  await m.dispose();
}

export async function verify(t) {
  const s = t.state;
  const m = await session('margaret');
  const drive = await m.graph('GET', `/v1.0/drives/${s.driveId}`);
  await t.check('space name and description', () => (drive.name === 'qa-up-space' && drive.description === 'qa upgrade subtitle') || `${drive.name} / ${drive.description}`);
  await t.check('space quota 3 GB', () => drive.quota?.total === 3 * GB || `quota ${drive.quota?.total}`);
  await t.check('space image and readme', () => {
    const names = (drive.special ?? []).map(x => x.specialFolder?.name);
    return (names.includes('image') && names.includes('readme')) || `special: ${names.join(', ')}`;
  });
  await t.check('space image content', async () => {
    const { status, body } = await m.get(s.driveId, '.space/image.png');
    return (status === 200 && sha256(body) === sha256(PNG)) || `HTTP ${status}`;
  });
  await t.check('space members and link', async () => {
    const n = (await m.permissions(s.driveId)).length;
    return n === s.permissions || `${n} now, ${s.permissions} before`;
  });
  await t.check('viewer membership keeps expiration', async () => {
    const p = (await m.permissions(s.driveId)).find(x => x.grantedToV2?.user?.displayName?.toLowerCase().includes('mary'));
    return p?.expirationDateTime?.slice(0, 10) === s.expiration.slice(0, 10) || `expiration ${p?.expirationDateTime}`;
  });
  for (const [p, hash] of Object.entries(s.files)) {
    await t.check(`content: ${p}`, async () => {
      const { status, body } = await m.get(s.driveId, p);
      return (status === 200 && sha256(body) === hash) || `HTTP ${status}`;
    });
  }
  await t.check('space file versions', async () => (await m.versions(s.versionsId)).length >= 2 || 'less than 2 versions');
  await t.check('space trash', async () => (await m.trash(s.driveId)).some(i => i.name === 'trashed.txt') || 'trashed.txt missing');
  await t.check('disabled space stays disabled', async () => {
    const x = await m.graph('GET', `/v1.0/drives/${s.disabledId}`, undefined, [200, 404]);
    return x?.root?.deleted?.state === 'trashed' || `state ${JSON.stringify(x?.root?.deleted)}`;
  });
  await m.dispose();

  for (const who of ['lynn', 'mary']) {
    const u = await session(who);
    await t.check(`${who} still sees the space`, async () => (await u.drives()).some(x => x.id === s.driveId) || 'space not listed');
    await u.dispose();
  }
  if (t.phase === 'after') {
    const lynn = await session('lynn');
    await t.check('space editor can upload after upgrade', async () => {
      await lynn.put(s.driveId, 'docs/after-upgrade.txt', 'after');
      return true;
    });
    await lynn.dispose();
  }
}
