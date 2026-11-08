import type { Metadata } from "next";
import "./leasecheck.css";

export const metadata: Metadata = {
  title: "LeaseCheck",
  description: "Check an Ontario rental lease for clauses worth asking about before you sign.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <body>{children}</body>
    </html>
  );
}
