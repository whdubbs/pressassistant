import "./globals.css";

export const metadata = {
  title: "Race Tracker",
  description: "Key political news for the races you care about.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
