# Legal documents

Drafts of Phormula's user-facing legal documents.

- [`privacy-policy.md`](./privacy-policy.md)
- [`terms-of-service.md`](./terms-of-service.md)

**These are drafts, not legal advice.** Have a qualified lawyer in your jurisdiction review both
before you publish them. They are written to be a solid, accurate starting point that a lawyer can
refine quickly, rather than something to ship unreviewed.

## Assumptions these drafts were written under

| Decision | Assumption |
| --- | --- |
| Minimum age | 13+, matching Quizlet, Knowt, Brainscape, and Duolingo |
| Legal entity | Not yet incorporated — placeholders throughout |
| Regulatory coverage | Global: GDPR + UK GDPR, CCPA/CPRA, and other US state laws |
| AI training on user content | Never — stated as a firm commitment in both documents |
| Public/shared sets | Planned, so the licence and takedown provisions are already in place |
| Paid plans | Planned, so billing, auto-renewal, and refund terms are already in place |

## Placeholders to fill before publishing

Every placeholder is written in `[SQUARE BRACKETS]`. To list them:

```sh
grep -n "\[[A-Z][A-Z ,./§0-9-]*\]" docs/legal/*.md
```

The ones that need a decision rather than a lookup:

- `[LEGAL ENTITY NAME]`, `[REGISTERED ADDRESS]`, `[COUNTRY]` — once you incorporate.
- `[JURISDICTION]` and `[VENUE]` — governing law and forum. Follow your entity's home jurisdiction.
- Retention periods in Privacy Policy §9 — pick concrete numbers you can actually honour.
- `[AMOUNT]` in ToS §14 — the liability cap floor. USD 100 is the common consumer-SaaS figure.
- `[PAYMENT PROCESSOR]` in Privacy Policy §6.1 — name it once you choose one.
- The arbitration clause in ToS §16 — a genuine decision, flagged inline. Standard in US consumer
  SaaS, unenforceable against EEA/UK consumers, and it limits your options as much as your users'.
- DMCA agent designation in ToS §11 — only relevant if you incorporate in the US, and only worth
  doing once public sharing ships.
- GDPR Article 27 representative in Privacy Policy §17 — required if you have no EU/UK establishment
  but target EU/UK users. Ask counsel whether your scale triggers it.

## Where the documents describe things the code does not do yet

Both documents were written against the actual codebase, with three exceptions that need code
changes before the claims are true:

1. **Account deletion.** Privacy Policy §11 and ToS §12 say you can delete your account from
   Privacy & Security. `src/components/settings/PrivacySecuritySettings.tsx:95` currently shows a
   dialog that ends by telling the user to email `support@phormula.co` — no deletion happens. Either
   implement real deletion or reword both documents to describe the email process honestly.

2. **Revoking third-party app authorisations.** Privacy Policy §11 and ToS §8 say you can revoke an
   authorised application's access from account settings. There is no such screen yet; the MCP OAuth
   flow (`src/pages/OAuthConsent.tsx`) grants access but nothing lists or revokes it.

3. **Concrete retention periods.** Privacy Policy §9 has `[PERIOD]` placeholders because no retention
   or purge jobs exist. The only scheduled job in the database is the email queue dispatcher.

Publishing a policy that promises controls the product does not have is the kind of gap regulators
and users both notice. Close them in code, or soften the wording — but do one or the other.

## Keeping these accurate

The Privacy Policy names specific subprocessors and AI models. Revisit it whenever you:

- add or change an AI provider or model (currently OpenAI `gpt-5.4` for generation, Google
  `gemini-2.5-pro` for text detection, both via the Lovable AI gateway);
- add analytics, error tracking, or any tracking SDK — §2.3 currently promises you have none, which
  is a real commitment worth protecting;
- add a payment processor;
- add file uploads to object storage (document parsing is client-side today, and §2.3 says so);
- ship public sharing or paid plans, which move those sections from forward-looking to live.
