import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import AuthHeader from "./components/AuthHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Virtual Try-On",
  description: "eCommerce Virtual Try-On App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <AuthHeader />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
