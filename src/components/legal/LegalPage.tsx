import { Link } from "react-router-dom";
import LogoOrb from "@/components/LogoOrb";

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

/**
 * Shared shell for the app-owned legal documents (Privacy Policy, Terms of
 * Service). Content is authored by Phormula and lives in the page files.
 */
const LegalPage = ({ title, lastUpdated, children }: LegalPageProps) => (
  <div className="min-h-screen bg-background">
    <nav className="border-b border-border/60 bg-background/75 backdrop-blur-lg">
      <div className="container mx-auto flex items-center justify-between px-4 py-3.5">
        <LogoOrb size="md" showWordmark linkTo="/" />
        <Link
          to="/"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to home
        </Link>
      </div>
    </nav>

    <main className="container mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-display text-4xl font-medium tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

      <div className="mt-10 space-y-6 text-[15px] leading-relaxed text-muted-foreground [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-medium [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:space-y-1">
        {children}
      </div>
    </main>
  </div>
);

export default LegalPage;
