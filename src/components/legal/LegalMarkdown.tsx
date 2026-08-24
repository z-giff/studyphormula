import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders one of the authored legal documents (docs/legal/*.md).
 * The document's own H1 and "Last updated" lines are stripped because the
 * LegalPage shell already renders them.
 */
const LegalMarkdown = ({ source }: { source: string }) => {
  const body = source
    .replace(/^#\s.*$/m, "")
    .replace(/^\*\*Last updated:\*\*.*$/m, "")
    .replace(/^\*\*Effective:\*\*.*$/m, "")
    .trim();

  return (
    <div className="[&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-foreground [&_ol]:mt-3 [&_ol]:space-y-1 [&_ol_li]:list-decimal [&_strong]:text-foreground [&_table]:mt-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_td]:border [&_td]:border-border/60 [&_td]:p-2 [&_td]:align-top [&_th]:border [&_th]:border-border/60 [&_th]:p-2 [&_th]:text-left [&_th]:text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
};

export default LegalMarkdown;
