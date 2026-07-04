import "./globals.css";

export const metadata = {
  title: "Relu Company Research | AI Company Intelligence",
  description:
    "AI-powered Company Research Assistant — crawls websites, gathers public data, and generates competitor analysis and PDF reports.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
