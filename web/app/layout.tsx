import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinanceGPT India — Official AI Financial Education Assistant",
  description: "Secure, grounded financial education assistant powered by official Reserve Bank of India (RBI) and SEBI educational resources. Developed by Gagan Gowda BM, Chanakya University.",
  keywords: ["FinanceGPT India", "RBI", "SEBI", "Financial Education", "EMI Calculator", "Simple Interest", "Compound Interest", "Financial Literacy India"]
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>₹</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
