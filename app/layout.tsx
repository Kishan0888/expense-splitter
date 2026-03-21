import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SplitEase by Kishan',
  description: 'SplitEase by Kishan — Smart expense splitting with debt simplification algorithm.',
  verification: {
    google: 'R4KoHYqevfVR0bVuWc2AGTtUMwhF-iCkMcSY1-rITDI',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
