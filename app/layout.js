import "./globals.css";

export const metadata = {
  title: "Jalalpur Fun Ticketing",
  description: "Book adventure activities and get your entry QR tickets",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
