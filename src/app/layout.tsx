import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Minecraft Christmas Builder',
  description:
    'Weihnachtliche Minecraft-Java-Bauwerke als echte Blockdaten erzeugen, in 3D ansehen und als Sponge-Schematic (.schem) für WorldEdit exportieren.',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#070e1a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
