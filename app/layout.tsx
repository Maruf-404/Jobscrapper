import type { Metadata } from 'next';
import { Noto_Sans } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
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
    'Searchable and filterable fresher and internship job postings in India from public company ATS endpoints and job APIs, tagged using Gemini Flash.',
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
        <Footer />
      </body>
    </html>
  );
}
