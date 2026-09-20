import LegalPage from "@/components/legal/LegalPage";
import LegalMarkdown from "@/components/legal/LegalMarkdown";
// The authored document is the single source of truth.
import source from "../../docs/legal/terms-of-service.md?raw";

const Terms = () => (
  <LegalPage title="Terms of Service" lastUpdated="September 20, 2026">
    <LegalMarkdown source={source} />
  </LegalPage>
);

export default Terms;
