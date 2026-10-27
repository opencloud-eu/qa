// Personal space of alan: content, names, sizes, versions, mtime, favorites, tags, trash, activities, file ids.
import crypto from 'node:crypto';
import { session, sha256 } from '../../lib/api.mjs';

const DIR = 'qa-up-files';
const LONG = 'qa-up-' + 'x'.repeat(190) + '.txt';
const FILES = {
  [`${DIR}/plain.txt`]: 'plain text before upgrade',
  [`${DIR}/empty.txt`]: '',
  [`${DIR}/ünïcödé 😀 #%&+ name.txt`]: 'unicode name',
  [`${DIR}/${LONG}`]: 'long name without spaces',
  [`${DIR}/deep/l2/l3/l4/l5/deep.txt`]: 'five levels deep',
  [`${DIR}/fav.txt`]: 'favorite',
  [`${DIR}/tagged.txt`]: 'tagged',
};
const OLD_MTIME = Date.UTC(2020, 0, 15) / 1000;

export async function seed(t) {
  const alan = await session('alan');
  const drive = await alan.personalDrive();
  const s = t.state = { driveId: drive.id, files: {}, ids: {} };

  for (const [p, content] of Object.entries(FILES)) {
    await alan.mkdir(drive.id, p.split('/').slice(0, -1).join('/'));
    await alan.put(drive.id, p, content);
    s.files[p] = sha256(Buffer.from(content));
  }
  const big = crypto.randomBytes(5 * 1024 * 1024);
  await alan.put(drive.id, `${DIR}/big.bin`, big);
  s.files[`${DIR}/big.bin`] = sha256(big);

  await alan.put(drive.id, `${DIR}/old-2020.txt`, 'old mtime', { 'X-OC-Mtime': String(OLD_MTIME) });
  s.files[`${DIR}/old-2020.txt`] = sha256(Buffer.from('old mtime'));

  s.versionContents = ['version 1', 'version 2', 'version 3'];
  for (const v of s.versionContents) await alan.put(drive.id, `${DIR}/versions.txt`, v);
  s.files[`${DIR}/versions.txt`] = sha256(Buffer.from('version 3'));

  // favorites can be switched off (capability files.favorites=false → HTTP 403)
  s.favorite = await alan.favorite(drive.id, `${DIR}/fav.txt`).then(() => true, () => false);
  for (const p of Object.keys(s.files)) s.ids[p] = await alan.fileId(drive.id, p);
  await alan.setTags(s.ids[`${DIR}/tagged.txt`], ['qa-up-tag', 'upgrade']);

  await alan.put(drive.id, `${DIR}/trashed.txt`, 'in the trash');
  await alan.remove(drive.id, `${DIR}/trashed.txt`);
  await alan.mkdir(drive.id, `${DIR}/trashed-folder`);
  await alan.put(drive.id, `${DIR}/trashed-folder/inside.txt`, 'inside a trashed folder');
  await alan.remove(drive.id, `${DIR}/trashed-folder`);

  s.activities = (await alan.activities(s.ids[`${DIR}/versions.txt`])).length;
  await alan.dispose();
}

export async function verify(t) {
  const s = t.state;
  const alan = await session('alan');
  const drive = await alan.personalDrive();
  await t.check('personal drive id unchanged', () => drive.id === s.driveId || `now ${drive.id}`);

  for (const [p, hash] of Object.entries(s.files)) {
    await t.check(`content: ${p.slice(DIR.length + 1, DIR.length + 60)}`, async () => {
      const { status, body } = await alan.get(drive.id, p);
      if (status !== 200) return `HTTP ${status}`;
      return sha256(body) === hash || 'checksum differs';
    });
  }
  await t.check('file ids unchanged', async () => {
    const changed = [];
    for (const [p, id] of Object.entries(s.ids)) if (await alan.fileId(drive.id, p) !== id) changed.push(p);
    return changed.length === 0 || `changed: ${changed.join(', ')}`;
  });
  await t.check('versions kept (2 old versions, content)', async () => {
    const hrefs = await alan.versions(s.ids[`${DIR}/versions.txt`]);
    if (hrefs.length < 2) return `${hrefs.length} versions`;
    const bodies = [];
    for (const h of hrefs) bodies.push((await (await alan.call('GET', h)).body()).toString());
    return ['version 1', 'version 2'].every(v => bodies.includes(v)) || `contents: ${bodies.join(' | ')}`;
  });
  await t.check('old mtime kept (2020-01-15)', async () => {
    const { items } = await alan.list(drive.id, `${DIR}/old-2020.txt`, 0);
    return new Date(items[0].mtime).getUTCFullYear() === 2020 || items[0].mtime;
  });
  if (s.favorite) {
    await t.check('favorite kept', async () => {
      const { items } = await alan.list(drive.id, `${DIR}/fav.txt`, 0);
      return items[0].favorite === '1' || `favorite=${items[0].favorite}`;
    });
  } else t.note('favorites', 'disabled on the from-version (capability files.favorites=false)');
  await t.check('tags kept', async () => {
    const { items } = await alan.list(drive.id, `${DIR}/tagged.txt`, 0);
    return /qa-up-tag/.test(items[0].tags ?? '') || `tags=${items[0].tags}`;
  });
  const trash = await alan.trash(drive.id);
  await t.check('trash: file and folder present', () => {
    const names = trash.map(i => i.name);
    return (names.includes('trashed.txt') && names.includes('trashed-folder')) || `trash: ${names.join(', ')}`;
  });
  await t.check('activities kept', async () => {
    const n = (await alan.activities(s.ids[`${DIR}/versions.txt`])).length;
    return n >= s.activities || `${n} now, ${s.activities} before`;
  });
  if (t.phase === 'after') {
    await t.check('restore from trash after upgrade', async () => {
      const item = trash.find(i => i.name === 'trashed-folder');
      if (!item) return 'not in trash';
      await alan.restore(drive.id, item);
      const { status, body } = await alan.get(drive.id, `${DIR}/trashed-folder/inside.txt`);
      return (status === 200 && body.toString() === 'inside a trashed folder') || `HTTP ${status}`;
    });
    await t.check('upload after upgrade', async () => {
      await alan.put(drive.id, `${DIR}/after-upgrade.txt`, 'new');
      // 425 Too Early while postprocessing of the upload still runs (async, can take a moment)
      let status;
      for (let i = 0; i < 20; i++) {
        status = (await alan.get(drive.id, `${DIR}/after-upgrade.txt`)).status;
        if (status !== 425) break;
        await new Promise(r => setTimeout(r, 500));
      }
      return status === 200 || `HTTP ${status}`;
    });
  }
  await alan.dispose();
}
