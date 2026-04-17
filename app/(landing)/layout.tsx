import { Footer } from "./components";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* <Nav /> */}
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
