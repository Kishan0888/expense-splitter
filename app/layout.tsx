import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SplitEase by Kishan',
  description: 'SplitEase by Kishan — Smart expense splitting with debt simplification algorithm.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
