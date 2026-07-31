import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Torneo Interfarmacéutico Clarel 2026',
  description: 'Polla Interfarmacéutica',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import BottomNav from '@/components/BottomNav';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}