import type { PrefectureInfo, BBox } from '../types';

export const KANTO_PREFECTURES: PrefectureInfo[] = [
  { code:'08', name:'茨城県',  capital:'水戸',     nameEn:'Ibaraki',  capitalEn:'Mito',       color:'#6ee7b7' },
  { code:'09', name:'栃木県',  capital:'宇都宮',   nameEn:'Tochigi',  capitalEn:'Utsunomiya', color:'#6ee7b7' },
  { code:'10', name:'群馬県',  capital:'前橋',     nameEn:'Gunma',    capitalEn:'Maebashi',   color:'#6ee7b7' },
  { code:'11', name:'埼玉県',  capital:'さいたま', nameEn:'Saitama',  capitalEn:'Saitama',    color:'#6ee7b7' },
  { code:'12', name:'千葉県',  capital:'千葉',     nameEn:'Chiba',    capitalEn:'Chiba',      color:'#6ee7b7' },
  { code:'13', name:'東京都',  capital:'東京',     nameEn:'Tokyo',    capitalEn:'Tokyo',      color:'#6ee7b7', link:{ href:'https://tukumanalab.github.io/tokyo-puzzle/', label:'東京都 3D 市区町村パズル' } },
  { code:'14', name:'神奈川県', capital:'横浜',    nameEn:'Kanagawa', capitalEn:'Yokohama',   color:'#6ee7b7' },
];

/** @deprecated Use PUZZLE_BBOXES['13'] */
export const TOKYO_PUZZLE_BBOX: BBox = { minLon:138.9, maxLon:139.95, minLat:35.4, maxLat:35.9 };

/** 各都県の本土のみを含む bbox。島嶼除外に使用。 */
export const PUZZLE_BBOXES: Record<string, BBox> = {
  '08': { minLon:139.50, maxLon:141.00, minLat:35.60, maxLat:37.00 }, // 茨城
  '09': { minLon:139.20, maxLon:140.40, minLat:36.10, maxLat:37.20 }, // 栃木
  '10': { minLon:138.30, maxLon:139.80, minLat:35.90, maxLat:37.10 }, // 群馬
  '11': { minLon:138.60, maxLon:140.00, minLat:35.60, maxLat:36.40 }, // 埼玉
  '12': { minLon:139.60, maxLon:141.00, minLat:34.80, maxLat:36.20 }, // 千葉
  '13': { minLon:138.90, maxLon:139.95, minLat:35.40, maxLat:35.90 }, // 東京（本土）
  '14': { minLon:138.80, maxLon:140.00, minLat:35.00, maxLat:35.80 }, // 神奈川
};

export const PROJ_CENTER = { lat: 36.0, lon: 139.0 };
export const METERS_PER_DEGREE = 111320;

export const BASE_PATH = process.env.NODE_ENV === 'production' ? '/pref-puzzle' : '';

export const DEM_TILE_URL = 'https://cyberjapandata.gsi.go.jp/xyz/dem/{z}/{x}/{y}.txt';

export const DEFAULT_PARAMS = {
  zoom: 12 as const,
  xyScale: 1 / 50000,
  zScale: 2.0,
  baseThickness: 3.0,
  clearance: 0.2,
  decimation: 1,
  smoothing: false,
  noDataFill: 'sea' as const,
  includeIslands: false,
  minIslandArea: 1.0,
  textMode: 'emboss' as const,
  textDepth: 0.5,
  fontSize: 12,
  textMargin: 2,
};
