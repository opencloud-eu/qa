// Search index of lynn's files: by name, by content (Tika), by tag, favorites. Run after the search migration.
import { session } from '../../lib/api.mjs';

const DIR = 'qa-up-search';
const FILES = {
  'zebrafinch-report.txt': 'the quokkaupgrade keyword lives in this text',
  'notes.md': '# Notes\n\nmarkdown with the word wombatupgrade',
  'page.html': '<html><body><p>numbatupgrade inside html</p></body></html>',
};
const OLD = { 'old-2019.txt': Date.UTC(2019, 5, 1) / 1000, 'old-2021.txt': Date.UTC(2021, 5, 1) / 1000 };

export async function seed(t) {
  const lynn = await session('lynn');
  const d = (await lynn.personalDrive()).id;
  await lynn.mkdir(d, DIR);
  for (const [n, c] of Object.entries(FILES)) await lynn.put(d, `${DIR}/${n}`, c);
  for (const [n, m] of Object.entries(OLD)) await lynn.put(d, `${DIR}/${n}`, `old file ${n}`, { 'X-OC-Mtime': String(m) });
  await lynn.put(d, `${DIR}/tagged-search.txt`, 'tagged');
  await lynn.setTags(await lynn.fileId(d, `${DIR}/tagged-search.txt`), ['qa-up-searchtag']);
  await lynn.put(d, `${DIR}/fav-search.txt`, 'favorite');
  const favorite = await lynn.favorite(d, `${DIR}/fav-search.txt`).then(() => true, () => false);
  t.state = { driveId: d, favorite };
  await lynn.dispose();
}

export async function verify(t) {
  const lynn = await session('lynn');
  // indexing is asynchronous (e.g. right after a re-index): retry for up to 60 s
  const found = async (kql, name) => {
    let names = [];
    for (const deadline = Date.now() + 60_000; ;) {
      names = await lynn.search(kql);
      if (names.includes(name) || Date.now() > deadline) break;
      await new Promise(r => setTimeout(r, 5000));
    }
    return names.includes(name) || `${name} not found (got: ${names.slice(0, 5).join(', ') || 'nothing'})`;
  };
  await t.check('search by name', () => found('name:"*zebrafinch*"', 'zebrafinch-report.txt'));
  await t.check('search by content: txt', () => found('content:"quokkaupgrade"', 'zebrafinch-report.txt'));
  await t.check('search by content: md', () => found('content:"wombatupgrade"', 'notes.md'));
  await t.check('search by content: html', () => found('content:"numbatupgrade"', 'page.html'));
  await t.check('search by tag', () => found('tag:"qa-up-searchtag"', 'tagged-search.txt'));
  if (t.state.favorite) await t.check('favorites filter', () => found('is:favorite', 'fav-search.txt'));
  else t.note('favorites filter', 'favorites disabled on the from-version');
  await t.check('search finds old files', () => found('name:"*old-2019*"', 'old-2019.txt'));
  await lynn.dispose();
}
