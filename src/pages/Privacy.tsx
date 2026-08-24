import LegalPage from "@/components/legal/LegalPage";
import LegalMarkdown from "@/components/legal/LegalMarkdown";
// The authored document is the single source of truth.
import source from "../../docs/legal/privacy-policy.md?raw";

const Privacy = () => (
  <LegalPage title="Privacy Policy" lastUpdated="August 24, 2026">
    <LegalMarkdown source={source} />
  </LegalPage>
);

export default Privacy;
