import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

// 北海道は4地方に分割。全都道府県コードの代わりに地方コードを使用。
const CODES = ['01d', '01c', '01n', '01e', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'];

const PREF_NAMES: Record<string, string> = {
  '08': '茨城県', '09': '栃木県', '10': '群馬県', '11': '埼玉県',
  '12': '千葉県', '13': '東京都', '14': '神奈川県',
  '15': '新潟県', '16': '富山県', '17': '石川県', '18': '福井県', '19': '山梨県', '20': '長野県',
  '21': '岐阜県', '22': '静岡県', '23': '愛知県', '24': '三重県',
  '25': '滋賀県', '26': '京都府', '27': '大阪府', '28': '兵庫県', '29': '奈良県', '30': '和歌山県',
  '31': '鳥取県', '32': '島根県', '33': '岡山県', '34': '広島県', '35': '山口県',
  '36': '徳島県', '37': '香川県', '38': '愛媛県', '39': '高知県',
  '02': '青森県', '03': '岩手県', '04': '宮城県', '05': '秋田県', '06': '山形県', '07': '福島県',
  '40': '福岡県', '41': '佐賀県', '42': '長崎県', '43': '熊本県', '44': '大分県', '45': '宮崎県', '46': '鹿児島県', '47': '沖縄県',
};

// 北海道4地方の定義（N03_002 振興局名でフィルタ）
const HOKKAIDO_REGIONS: Record<string, { name: string; subprefs: Set<string> }> = {
  '01d': {
    name: '道南',
    subprefs: new Set(['渡島総合振興局', '檜山振興局']),
  },
  '01c': {
    name: '道央',
    subprefs: new Set(['石狩振興局', '後志総合振興局', '空知総合振興局', '胆振総合振興局', '日高振興局']),
  },
  '01n': {
    name: '道北',
    subprefs: new Set(['上川総合振興局', '留萌振興局', '宗谷総合振興局']),
  },
  '01e': {
    name: '道東',
    subprefs: new Set(['オホーツク総合振興局', '十勝総合振興局', '釧路総合振興局', '根室振興局']),
  },
};

const OUT_DIR = path.join(process.cwd(), 'public', 'data', 'boundary');

// N03 ZIP URL pattern (update year as needed)
const N03_URL = (code: string) =>
  `https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2024/N03-20240101_${code}_GML.zip`;

function downloadOnce(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(downloadOnce(res.headers.location));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error(`Timeout for ${url}`)));
    req.on('error', reject);
  });
}

const RETRIES = 5;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 国土地理院のサーバーは一時的に 502/503 を返すことがあるため、指数バックオフで再試行する。 */
async function download(url: string): Promise<Buffer> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      return await downloadOnce(url);
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      // 4xx（404 など）は再試行しても無駄なので即座に諦める
      if (/^HTTP 4\d\d /.test(msg) && !/^HTTP (408|429) /.test(msg)) throw e;
      if (attempt === RETRIES) break;
      const wait = 2000 * 2 ** (attempt - 1);
      console.log(`  Retry ${attempt}/${RETRIES - 1} in ${wait / 1000}s (${msg})`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

interface Polygon {
  type: 'Polygon';
  coordinates: number[][][];
}

function parseGmlCoords(posList: string): number[][] {
  const nums = posList.trim().split(/\s+/).map(Number);
  const coords: number[][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    // GML is lat-lon → swap to lon-lat
    coords.push([nums[i + 1], nums[i]]);
  }
  return coords;
}

function extractPolygons(xml: unknown): Polygon[] {
  const polygons: Polygon[] = [];
  function walk(obj: unknown) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(walk); return; }
    const rec = obj as Record<string, unknown>;
    const keys = Object.keys(rec);
    for (const k of keys) {
      if (k.includes('posList')) {
        const val = rec[k];
        const posStr = typeof val === 'string' ? val : (val as Record<string, unknown>)['#text'] as string;
        if (posStr) {
          const coords = parseGmlCoords(posStr);
          if (coords.length >= 3) polygons.push({ type: 'Polygon', coordinates: [coords] });
        }
      } else {
        walk(rec[k]);
      }
    }
  }
  walk(xml);
  return polygons;
}

/** ksj:subprefectureName の出現順リストを抽出する（ポリゴンと同数・同順のはず）。
 * N03-2024 形式では gml:Surface（geometry）と ksj:AdministrativeBoundary（属性）が
 * 別配列として同インデックスで対応している。 */
function extractSubprefNames(xml: unknown): string[] {
  const names: string[] = [];
  function walk(obj: unknown): void {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(walk); return; }
    const rec = obj as Record<string, unknown>;
    for (const k of Object.keys(rec)) {
      if (k === 'ksj:subprefectureName') {
        const val = rec[k];
        if (typeof val === 'string') names.push(val);
      } else {
        walk(rec[k]);
      }
    }
  }
  walk(xml);
  return names;
}

async function fetchBoundary(code: string): Promise<void> {
  const outFile = path.join(OUT_DIR, `${code}.json`);
  if (fs.existsSync(outFile)) {
    console.log(`  ${code}.json already exists, skipping`);
    return;
  }

  const prefCode = code.slice(0, 2);  // '01d' → '01', '08' → '08'
  console.log(`  Downloading N03 for ${prefCode}...`);
  const buf = await download(N03_URL(prefCode));
  const zip = await JSZip.loadAsync(buf);

  const xmlFiles = Object.keys(zip.files).filter(f => f.endsWith('.xml') || f.endsWith('.XML'));
  console.log(`  Found ${xmlFiles.length} XML files`);

  const allPolygons: Polygon[] = [];
  for (const xmlFile of xmlFiles) {
    const xmlStr = await zip.files[xmlFile].async('string');
    const parsed = parser.parse(xmlStr);
    const polys = extractPolygons(parsed);
    allPolygons.push(...polys);
  }

  const feature = {
    type: 'Feature',
    properties: { code, N03_001: PREF_NAMES[code] ?? code },
    geometry: {
      type: 'MultiPolygon',
      coordinates: allPolygons.map(p => p.coordinates),
    },
  };

  fs.writeFileSync(outFile, JSON.stringify(feature));
  console.log(`  Written ${code}.json (${allPolygons.length} polygons)`);
}

/** 北海道4地方の境界ファイルをまとめて生成する。N03_01 を1回だけDLする。
 * N03-2024 形式: gml:Surface（geometry）と ksj:AdministrativeBoundary（属性）が
 * 同インデックス対応。市区町村レベルファイルのみを対象にする。 */
async function fetchHokkaidoRegions(): Promise<void> {
  const regionCodes = Object.keys(HOKKAIDO_REGIONS);
  const allExist = regionCodes.every(c => fs.existsSync(path.join(OUT_DIR, `${c}.json`)));
  if (allExist) {
    console.log('  北海道地方ファイルはすべて存在します。スキップ。');
    return;
  }

  console.log('  Downloading N03 for 01 (北海道)...');
  const buf = await download(N03_URL('01'));
  const zip = await JSZip.loadAsync(buf);

  // 市区町村レベルのファイルのみ処理（subprefecture ファイルは除外）
  const muniFile = Object.keys(zip.files).find(
    f => /N03-\d+_\d+\.xml$/i.test(f) && !f.includes('subprefecture') && !f.startsWith('KS-')
  );
  if (!muniFile) throw new Error('Municipality XML file not found in ZIP');
  console.log(`  Processing ${muniFile}...`);

  const xmlStr = await zip.files[muniFile].async('string');
  const parsed = parser.parse(xmlStr);

  const polygons = extractPolygons(parsed);
  const subprefNames = extractSubprefNames(parsed);
  console.log(`  Polygons: ${polygons.length}, subpref names: ${subprefNames.length}`);
  if (polygons.length !== subprefNames.length) {
    throw new Error(`Count mismatch: ${polygons.length} polygons vs ${subprefNames.length} subprefs`);
  }

  // 地方コードごとにポリゴンを振り分け
  const regionPolygons: Record<string, Polygon[]> = {};
  for (const rc of regionCodes) regionPolygons[rc] = [];
  const unknownSubprefs = new Set<string>();

  for (let i = 0; i < polygons.length; i++) {
    const subpref = subprefNames[i];
    let matched = false;
    for (const [rc, def] of Object.entries(HOKKAIDO_REGIONS)) {
      if (def.subprefs.has(subpref)) {
        regionPolygons[rc].push(polygons[i]);
        matched = true;
        break;
      }
    }
    if (!matched && subpref) unknownSubprefs.add(subpref);
  }

  if (unknownSubprefs.size > 0) {
    console.log('  未分類の振興局名:', [...unknownSubprefs].join(', '));
  }

  for (const [rc, polys] of Object.entries(regionPolygons)) {
    const outFile = path.join(OUT_DIR, `${rc}.json`);
    if (fs.existsSync(outFile)) { console.log(`  ${rc}.json already exists, skipping`); continue; }
    const feature = {
      type: 'Feature',
      properties: { code: rc, name: HOKKAIDO_REGIONS[rc].name },
      geometry: { type: 'MultiPolygon', coordinates: polys.map(p => p.coordinates) },
    };
    fs.writeFileSync(outFile, JSON.stringify(feature));
    console.log(`  Written ${rc}.json (${polys.length} polygons)`);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('Fetching boundary data...');

  // 北海道4地方をまとめて処理
  try {
    await fetchHokkaidoRegions();
  } catch (e) {
    console.error('  ERROR for Hokkaido regions:', e);
    process.exit(1);
  }

  // その他の都県
  for (const code of CODES.filter(c => !c.startsWith('01'))) {
    try {
      await fetchBoundary(code);
    } catch (e) {
      console.error(`  ERROR for ${code}:`, e);
      process.exit(1);
    }
  }
  console.log('Done.');
}

main();
