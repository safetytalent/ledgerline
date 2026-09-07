import "./globals.css";

export const metadata = {
  title: "Ledgerline",
  description: "AI-assisted bookkeeping review platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
