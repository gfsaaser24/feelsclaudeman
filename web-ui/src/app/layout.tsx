import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FeelsClaudeMan - Claude Emotion Dashboard',
  description: 'Real-time visualization of Claude\'s emotional states during coding sessions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Outfit - Clean geometric sans for body */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=JetBrains+Mono:wght@400;500&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen mesh-bg relative noise-overlay">
        {children}
      </body>
    </html>
  );
}
