import type { Metadata, Viewport } from 'next';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import Footer from '@/components/Footer';
import ToastContainer from '@/components/Toast';
import './globals.css';
import { CartProvider } from '@/contexts/CartContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { WantListProvider } from '@/contexts/WantListContext';

// TODO(perf): swap the Google Fonts @import in globals.css for next/font/google:
//
//   import { Inter, Outfit } from 'next/font/google';
//   const inter = Inter({ subsets: ['latin'], weight: ['400','500','600','700','800'],
//                         variable: '--font-sans', display: 'swap' });
//   const outfit = Outfit({ subsets: ['latin'], weight: ['400','500','600','700','800'],
//                           variable: '--font-heading', display: 'swap' });
//   // …then apply `${inter.variable} ${outfit.variable}` to <html>.
//
// That eliminates the render-blocking CSS request, self-hosts the woff2 files,
// and avoids a Google dependency. It does need outbound network to
// fonts.googleapis.com at build time, which not every CI sandbox allows.

export const metadata: Metadata = {
  title: 'Top Rated | Cards & Collectibles',
  description:
    'Modern storefront for premium trading cards, sealed products, and collectibles.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#08090d',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AuthProvider>
            <WantListProvider>
              <CartProvider>
                <Navbar />
                <CartDrawer />
                <main>{children}</main>
                <Footer />
                <ToastContainer />
              </CartProvider>
            </WantListProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
