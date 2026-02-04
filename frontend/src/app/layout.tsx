import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EAC Official Assistant",
  description: "Automated assistance for the East African Community",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        {/* Official Top Bar Strip */}
        <div className="w-full h-2 flex">
            <div className="bg-[#0066CC] flex-1"></div> {/* Blue */}
            <div className="bg-white w-1"></div>
            <div className="bg-black flex-1"></div>   {/* Black */}
            <div className="bg-[#008C00] flex-1"></div> {/* Green */}
            <div className="bg-[#FFD700] flex-1"></div> {/* Yellow */}
            <div className="bg-[#D21034] flex-1"></div> {/* Red */}
        </div>
        
        {children}
      </body>
    </html>
  );
}