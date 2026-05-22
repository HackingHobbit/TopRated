import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import ToastContainer from "@/components/Toast";
import "./globals.css";
import { CartProvider } from '@/contexts/CartContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { WantListProvider } from '@/contexts/WantListContext';

export const metadata: Metadata = {
  title: "Top Rated | Cards & Collectibles",
  description: "Modern storefront for premium trading cards, sealed products, and collectibles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            <WantListProvider>
              <CartProvider>
                <Navbar />
                <CartDrawer />
                <main>{children}</main>
                <Footer />
                <ToastContainer />
              </CartProvider>
            </WantListProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
