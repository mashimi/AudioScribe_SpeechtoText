
import { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "DarScribe by Leonard ",
  description: "DarScribe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Link to the sound.png as Favicon */}
        <link rel="icon" href="/sound.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        
       
        {children}
      </body>
    </html>
  );
}
