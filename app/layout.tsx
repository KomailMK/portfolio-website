import type { Metadata } from "next";
import { Anton, Geist, Geist_Mono, Caveat_Brush } from "next/font/google";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const caveatBrush = Caveat_Brush({
  variable: "--font-caveat-brush",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Komail Ahmad Khalil | Software Engineer & AI Specialist",
  description:
    "Portfolio of Komail Ahmad Khalil — Software Engineer and Data Science specialist in Full-Stack Development, Applied AI, Computer Vision, and Federated Machine Learning.",
  keywords: [
    "Komail Ahmad Khalil",
    "Software Engineer",
    "Data Science",
    "Full-Stack Developer",
    "Machine Learning",
    "Computer Vision",
    "Federated Learning",
    "Next.js",
    "FastAPI",
    "YOLOv8",
  ],
  authors: [{ name: "Komail Ahmad Khalil" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${anton.variable} ${geist.variable} ${geistMono.variable} ${caveatBrush.variable}`}
      style={{
        // ensure any --font-geist-sans consumers also match
        ["--font-geist-sans" as string]: "var(--font-geist)",
      }}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var params = new URLSearchParams(window.location.search);
                  var agentsParam = params.get('agents');
                  var saved = localStorage.getItem('portfolio_agents');
                  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                  var enabled = agentsParam === 'on' ? true : agentsParam === 'off' ? false : (saved !== null ? saved === 'true' : !prefersReduced);
                  if (enabled) {
                    document.documentElement.classList.add('build-mode');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
