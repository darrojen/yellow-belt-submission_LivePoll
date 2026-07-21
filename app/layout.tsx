import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LivePoll — Soroban Voting',
  description: 'Connect a wallet, vote once on a live poll, and watch results update in real time on Stellar testnet.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-void font-body text-ink antialiased">{children}</body>
    </html>
  );
}
