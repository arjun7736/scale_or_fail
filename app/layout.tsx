import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Scale or Fail — The System Design Survival Game',
  description:
    'Build Small. Scale Big. Never Go Down. An interactive browser-based engineering simulation game.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full dark antialiased`}
    >
      <body className="h-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
