import "./globals.css";
import RegisterServiceWorker from "./register-sw";

export const metadata = {
  title: "School PWA",
  description: "Offline-first management system for Primary and Junior Secondary schools",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#2645ac",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
