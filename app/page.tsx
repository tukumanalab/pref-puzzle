'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { KANTO_PREFECTURES, BASE_PATH } from '../lib/constants/kanto';
import { HOKKAIDO_PREFECTURES } from '../lib/constants/hokkaido';
import { TOHOKU_PREFECTURES } from '../lib/constants/tohoku';
import { CHUGOKU_PREFECTURES } from '../lib/constants/chugoku';
import { CHUBU_PREFECTURES } from '../lib/constants/chubu';
import { KINKI_PREFECTURES } from '../lib/constants/kinki';
import { SHIKOKU_PREFECTURES } from '../lib/constants/shikoku';
import { KYUSHU_PREFECTURES } from '../lib/constants/kyushu';

const StlViewer = dynamic(() => import('./components/StlViewer'), { ssr: false });

const FILE_SIZES: Record<string, string> = {
  '01d': '1.5 MB', '01c': '5.4 MB', '01n': '4.7 MB', '01e': '7.6 MB',
  '08': '75.7 MB', '09': '80.8 MB', '10': '79.6 MB',
  '11': '46.9 MB', '12': '62.1 MB', '13': '21.3 MB', '14': '28.7 MB',
  '15': '149.7 MB', '16': '53.3 MB', '17': '50.6 MB', '18': '50.7 MB', '19': '54.8 MB', '20': '168.8 MB',
  '21': '131.0 MB', '22': '93.4 MB', '23': '61.5 MB',
  '24': '66.8 MB', '25': '48.8 MB', '26': '55.4 MB', '27': '21.8 MB', '28': '93.3 MB', '29': '45.8 MB', '30': '54.1 MB',
  '31': '42.2 MB', '32': '75.7 MB', '33': '84.9 MB', '34': '95.9 MB', '35': '68.1 MB',
  '36': '48.3 MB', '37': '19.1 MB', '38': '61.3 MB', '39': '81.7 MB',
  '02': '135.0 MB', '03': '208.0 MB', '04': '94.7 MB', '05': '159.0 MB', '06': '123.0 MB', '07': '177.3 MB',
  '40': '56.9 MB', '41': '27.8 MB', '42': '27.7 MB', '43': '75.4 MB', '44': '72.4 MB', '45': '87.1 MB', '46': '73.3 MB', '47': '11.9 MB',
};

const GROUPS = [
  { label: '北海道', prefectures: HOKKAIDO_PREFECTURES },
  { label: '東北地方', prefectures: TOHOKU_PREFECTURES },
  { label: '関東地方', prefectures: KANTO_PREFECTURES },
  { label: '中部地方', prefectures: CHUBU_PREFECTURES },
  { label: '近畿地方', prefectures: KINKI_PREFECTURES },
  { label: '中国地方', prefectures: CHUGOKU_PREFECTURES },
  { label: '四国地方', prefectures: SHIKOKU_PREFECTURES },
  { label: '九州地方', prefectures: KYUSHU_PREFECTURES },
];

export default function HomePage() {
  const [zipping, setZipping] = useState(false);
  const [preview, setPreview] = useState<{ code: string; name: string; color: string } | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(GROUPS.map(g => g.label)));

  function toggleGroup(label: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  async function downloadZip() {
    setZipping(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const allPrefs = GROUPS.flatMap(g => g.prefectures);
      await Promise.all(allPrefs.map(async (p) => {
        const resp = await fetch(`${BASE_PATH}/data/stl/${p.code}.stl`);
        if (resp.ok) zip.file(`${p.code}_${p.nameEn}.stl`, await resp.arrayBuffer());
      }));
      zip.file('README.txt',
        '地形データ: 国土地理院 基盤地図情報数値標高モデル（DEM）\n' +
        '行政界データ: 国土交通省 国土数値情報（行政区域データ）N03-2024\n' +
        '本データは上記データを加工して作成したものです。\n'
      );
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'kanto-puzzle.zip'; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setZipping(false);
    }
  }

  return (
    <>
      <div className="max-w-xl mx-auto px-4 py-12 flex flex-col gap-10">

        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">3D 都道府県パズル</h1>
          <p className="text-gray-200 leading-relaxed">
            都道府県の地形を 3D プリントできるパズルです。<br />
            国土地理院の標高データから生成した STL ファイルを配布しています。
          </p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest border-b border-gray-800 pb-2">
            プリント例
          </h2>
          <figure className="flex flex-col gap-2">
            <img
              src={`${BASE_PATH}/images/assembled-overview.jpg`}
              alt="複数地方を組み合わせた全体の俯瞰"
              loading="lazy"
              className="w-full rounded-lg border border-gray-800"
            />
            <figcaption className="text-gray-300 text-sm">複数地方を組み合わせた全体の様子。</figcaption>
          </figure>
          <figure className="flex flex-col gap-2">
            <img
              src={`${BASE_PATH}/images/terrain-pieces.jpg`}
              alt="関東・中部・近畿などの地形ピース"
              loading="lazy"
              className="w-full rounded-lg border border-gray-800"
            />
            <figcaption className="text-gray-300 text-sm">標高に応じた起伏や河川・境界線が再現されています。</figcaption>
          </figure>
          <figure className="flex flex-col gap-2">
            <img
              src={`${BASE_PATH}/images/back-engraving.jpg`}
              alt="ピース裏面に彫刻された県コード・都道府県名"
              loading="lazy"
              className="w-full rounded-lg border border-gray-800"
            />
            <figcaption className="text-gray-300 text-sm">各ピース裏面には県コード・都道府県名・県庁所在地を彫刻。</figcaption>
          </figure>
        </section>

        {GROUPS.map((group) => {
          const isOpen = openGroups.has(group.label);
          return (
            <section key={group.label} className="flex flex-col">
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex items-center justify-between border-b border-gray-800 pb-2 group"
              >
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest group-hover:text-gray-100 transition-colors">
                  {group.label}
                </h2>
                <span className={`text-gray-300 text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {isOpen && (
                <ul className="flex flex-col divide-y divide-gray-800">
                  {group.prefectures.map((p) => (
                    <li key={p.code} className="flex items-center justify-between py-4 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: p.color }} />
                        <div className="min-w-0">
                          <div>
                            <span className="font-semibold">{p.name}</span>
                            <span className="ml-2 text-gray-300 text-sm">{p.nameEn}</span>
                          </div>
                          {p.link && (
                            <a
                              href={p.link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors"
                            >
                              {p.link.label} ↗
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <button
                          onClick={() => setPreview({ code: p.code, name: p.name, color: p.color })}
                          className="text-sm text-gray-300 hover:text-gray-200 transition-colors"
                        >
                          プレビュー
                        </button>
                        <div className="flex flex-col items-end gap-0.5">
                          <a
                            href={`${BASE_PATH}/data/stl/${p.code}.stl`}
                            download={`${p.code}_${p.nameEn}.stl`}
                            className="bg-blue-600 hover:bg-blue-500 transition-colors px-3 py-1.5 rounded text-sm font-medium"
                          >
                            ダウンロード
                          </a>
                          <span className="text-gray-300 text-xs">{FILE_SIZES[p.code]}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        <button
          onClick={downloadZip}
          disabled={zipping}
          className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 transition-colors rounded-lg font-semibold"
        >
          {zipping ? 'ZIP 作成中...' : '全都県まとめてダウンロード（ZIP）'}
        </button>

        <footer className="text-xs text-gray-300 border-t border-gray-800 pt-5 flex flex-col gap-1">
          <span>地形: <a href="https://maps.gsi.go.jp/development/ichiran.html" className="underline hover:text-gray-200 transition-colors">国土地理院 基盤地図情報数値標高モデル</a></span>
          <span>行政界: <a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-v3_1.html" className="underline hover:text-gray-200 transition-colors">国土交通省 国土数値情報 N03-2024</a></span>
        </footer>
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-gray-950"
          onClick={(e) => { if (e.target === e.currentTarget) setPreview(null); }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreview(null)}
                className="text-gray-200 hover:text-white transition-colors text-sm flex items-center gap-1"
                aria-label="トップへ戻る"
              >
                ← トップへ
              </button>
              <span className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: preview.color }} />
              <span className="font-semibold">{preview.name}</span>
              <span className="text-gray-300 text-xs hidden sm:inline">ドラッグで回転 / スクロールでズーム</span>
            </div>
            <button
              onClick={() => setPreview(null)}
              className="text-gray-300 hover:text-white transition-colors text-xl leading-none px-2"
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <StlViewer
              url={`${BASE_PATH}/data/stl/${preview.code}.stl`}
              color={preview.color}
            />
          </div>
        </div>
      )}
    </>
  );
}
