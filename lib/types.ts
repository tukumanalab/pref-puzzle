export interface PrefectureInfo {
  code: string; name: string; capital: string;
  nameEn: string; capitalEn: string; color: string;
  /** 関連パズルサイトへのリンク（任意） */
  link?: { href: string; label: string };
}

export interface BBox { minLon: number; maxLon: number; minLat: number; maxLat: number; }
