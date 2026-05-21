import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import "./globals.css";
import { CartProvider } from '@/contexts/CartContext';

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
        <CartProvider>
          <Navbar />
          <CartDrawer />
          <main>{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
