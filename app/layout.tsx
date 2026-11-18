import type { Metadata } from 'next';
import './globals.css';
import Header from './components/Header';
import { getHeaderStats } from '@/lib/posts';

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
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
        <Header activeCount={activeCount} lastUpdatedIST={lastUpdatedIST} />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© {new Date().getFullYear()} Fresher Jobs India. All posts sourced from public ATS and authorized job APIs.</p>
            <p className="text-slate-400">Strictly ToS-safe • No LinkedIn/Naukri scraping • Automated daily via GitHub Actions</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
