import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '3D 都道府県パズル',
  description: '都道府県の地形3Dパズルデータを生成・ダウンロード',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-950 text-gray-100 min-h-screen">{children}</body>
    </html>
  );
}
