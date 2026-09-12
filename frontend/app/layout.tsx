import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transit Gap Compass",
  description: "Dashboard peta kesenjangan aksesibilitas transportasi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="h-dvh min-h-[100svh] w-full overflow-hidden m-0 p-0">{children}</body>
    </html>
  );
}
