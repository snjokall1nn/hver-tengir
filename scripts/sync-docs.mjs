import { writeFile } from 'node:fs/promises';

const DOCS = {
  hverTengir: '1Oevwc8-icit5X63nnvKvqbfbfST73E0QWsnfpCmkvSk',
  aldreiHefEg: '1YZDVDKpL7Pbsi-TPoJoRpKT_yM0PKY_eMtD-rAWYPLA',
};

async function fetchDoc(id) {
  const url = `https://docs.google.com/document/d/${id}/export?format=txt`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Google Doc export failed (${res.status}) for ${id}`);
  return (await res.text()).replace(/\r/g, '');
}

function cleanLines(text) {
  return text
    .split('\n')
    .map(line => line.trim().replace(/^[•●▪◦*\-–—]\s*/, ''))
    .filter(Boolean);
}

function section(lines, start, end, prefix) {
  const s = lines.findIndex(x => x.toUpperCase() === start.toUpperCase());
  if (s < 0) throw new Error(`Could not find section: ${start}`);
  const e = end ? lines.findIndex((x, i) => i > s && x.toUpperCase() === end.toUpperCase()) : lines.length;
  const chunk = lines.slice(s + 1, e < 0 ? lines.length : e);
  return chunk.filter(x => x.startsWith(prefix));
}

const [hverText, aldreiText] = await Promise.all([
  fetchDoc(DOCS.hverTengir),
  fetchDoc(DOCS.aldreiHefEg),
]);

const hverLines = cleanLines(hverText);
const aldreiLines = cleanLines(aldreiText);

const hverTengir = section(hverLines, 'EDRÚ', 'DRYKKIR · 18+', 'Ég ');
const aldreiSober = section(aldreiLines, 'EDRÚ', 'DRYKKIR · 18+', 'Aldrei hef ég');
const aldreiDrinks = section(aldreiLines, 'DRYKKIR · 18+', null, 'Aldrei hef ég');

if (hverTengir.length < 5 || aldreiSober.length < 5 || aldreiDrinks.length < 5) {
  throw new Error('Parsed too few game prompts; refusing to overwrite data.json.');
}

const data = {
  syncedAt: new Date().toISOString(),
  source: 'Google Docs',
  hverTengir,
  aldreiHefEg: {
    sober: aldreiSober,
    drinks: aldreiDrinks,
  },
};

await writeFile('data.json', JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`Synced ${hverTengir.length} Hver tengir, ${aldreiSober.length} Aldrei edrú, ${aldreiDrinks.length} Aldrei 18+ prompts.`);
