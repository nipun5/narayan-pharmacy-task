import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Narayan Pharmacy Task",
  description: "Prescription entry and drug interaction checker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
