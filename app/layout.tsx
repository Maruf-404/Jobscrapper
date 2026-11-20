import type { Metadata } from 'next';
import { Noto_Sans } from 'next/font/google';
import './globals.css';
import Header from './components/Header';
import { getHeaderStats } from '@/lib/posts';

const notoSans = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Fresher Jobs India | 200+ Verified Entry-Level & Internship Tech Roles',
  description:
    'Searchable and filterable fresher and internship job postings in India from ToS-safe public company ATS endpoints and job APIs, tagged using Gemini Flash.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { activeCount, lastUpdatedIST } = await getHeaderStats();

  return (
    <html lang="en" className={notoSans.variable}>
      <body className={`${notoSans.className} min-h-screen flex flex-col bg-white text-[#101828] font-sans antialiased selection:bg-[#0D81FC] selection:text-white`}>
        <Header activeCount={activeCount} lastUpdatedIST={lastUpdatedIST} />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
          {children}
        </main>
        <footer className="border-t border-[#EAECF0] bg-white py-6 text-center text-xs text-[#667085]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© {new Date().getFullYear()} Fresher Jobs India. All posts sourced from public ATS and authorized job APIs.</p>
            <p className="text-[#98A2B3]">Strictly ToS-safe • No unauthorized scraping • Automated daily via GitHub Actions</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
