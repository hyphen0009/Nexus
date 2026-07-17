import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";

export const metadata: Metadata = {
  title: "Nexus Tournaments | Premium Game Tournaments",
  description: "Register for premium game tournaments, create teams, and track your match history.",
  keywords: ["gaming tournaments", "esports", "team registration", "Nexus Tournaments"],
  authors: [{ name: "Nexus Tournaments" }],
  openGraph: {
    title: "Nexus Tournaments",
    description: "Register teams, browse tournaments, and review registered rosters in a premium gamer dashboard.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <header className="site-header">
          <Navbar />
        </header>
        <main className="main-content container">
          {children}
        </main>
        <footer className="site-footer">
          <div className="container">
            <div className="site-footer-content">
              <p>&copy; {new Date().getFullYear()} Nexus Tournaments</p>
              <div className="site-footer-links">
                <a href="/terms-and-conditions">Terms and Conditions</a>
              </div>
              <p>Powered by HYPHEN</p>
              <p>Created by Mohammad Zaid &amp; Tushar Raj</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
