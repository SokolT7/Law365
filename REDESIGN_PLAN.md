# LTB Law — Private Firm Workspace Redesign

Status: implementation in progress. The first local milestone now includes the redesigned application shell and legal screens, private identity, LTB administration, per-firm configuration, and server-enforced access. Production migration and the remaining unchecked specifications are still outstanding.

Visual direction updated following user feedback: contemporary professional application design, sans-serif typography throughout, cool neutral surfaces, light navigation, a geometric LTB mark, and restrained blue accents. This replaces the earlier traditional serif/warm-bronze direction.

Current storage is a deliberate transitional single-host SQLite implementation: normalized identity/configuration/session/job tables and isolated, revision-controlled per-firm content records. PostgreSQL/Supabase normalization, database row policies, and original-file storage remain required production work. No existing demo data has been automatically imported.

Implemented and locally verified: controlled admin bootstrap; login/logout and password changes; firm draft/active/suspended lifecycle; user invitation/revocation/deactivation; per-firm module dependencies and branding; guarded legal routes/APIs; client creation and document upload/search; mobile navigation/document cards; atomic analysis dispatch and authenticated, idempotent callback handling. See README.md for setup and verification commands.

Local milestone verification: production build and TypeScript checks passed; 57 platform assertions and 50 HTTP integration checks passed against disposable synthetic data. Browser checks covered account, admin, and workspace screens, with no page-level horizontal overflow at 320, 390, 768, 1024, and 1440 pixels. These checks do not complete the production release acceptance checklist below. Nothing has been deployed.

Second local milestone: document client/status/type filters, sorting and 20-row pagination; searchable contract selector and severity counts/filters; regulatory search, severity/client filters and pagination; activity search, actor/module filters, pagination and mobile cards; separate upcoming/past extracted dates using Europe/Zagreb, with no claim that past obligations are still outstanding. Regulatory review failures now display retryable errors. Pagination limits rendered results; storage still loads the transitional firm payload and database-level pagination remains outstanding.

Verification for this batch: production build and TypeScript validation passed; 61 HTTP integration checks and 11 workspace date/URL/pagination checks passed. Browser verification covered review selection/severity and regulatory filters, and the four updated registers had no page-level overflow at 320, 768 and 1440px. Mobile regulatory layout was also inspected at 390px. Demo credentials and sample data remain usable.

Workspace milestone (4 October 2026): unified document header with client/file context; persistent conversation/summary/detail modes; desktop evidence panel and mobile modal drawer; analysis references matched to extracted text only when a quote is found; exact chunk identifiers for new chat references; an authorized, non-cacheable evidence endpoint for research citations; in-memory dashboard-to-research question transfer; source-scope labels beside composers; and a new-response control. No question drafts are stored in URLs or browser storage. Original binary previews remain unavailable and are labeled accordingly.

Verification: production build/type validation and 70 HTTP integration checks passed, including anonymous, cross-firm, platform-admin, mismatched-document, and disabled-feature evidence access. Browser checks verified question transfer, draft survival across analysis modes, source resolution, Escape/focus return, and no whole-page overflow at 320, 390, 768, and 1440px on dashboard, research, and document screens. Draft warnings cover reload and ordinary links leaving the workspace; browser-history and all mobile unload cases are not guaranteed.

This checklist defines the redesign of LTB Law into one privately provisioned application serving multiple law firms. Each firm receives its own branded workspace, users, data, and enabled functions. LTB manages access after a direct commercial agreement; there is no public registration, checkout, trial, or pricing interface.

Unchecked items are remaining implementation or verification work; partial items stay unchecked. Visual specifications below are the proposed baseline for implementation.

## 1. Product direction and scope

- [x] Use **LTB Law** consistently as the product name, including the wordmark, browser title, login, and application shell.
- [ ] Position the product as a private legal workspace configured for the firm: precise, discreet, established, and efficient.
- [x] Maintain one codebase and deployment; store firm branding, permissions, and enabled modules as configuration rather than creating separate builds.
- [ ] Retain Croatian as the primary interface language, including errors, account flows, admin screens, and empty states. Use Croatian date and number formatting and explicit time zones where relevant.
- [ ] Preserve all existing working legal workflows while replacing the visual system and navigation.
- [ ] Add the required platform administration, authentication, firm provisioning, and per-firm feature controls.
- [x] Keep commercial onboarding and payment outside the application. Activation is an explicit LTB administrator action after the agreement is completed.
- [x] Exclude public marketing pages, self-service subscriptions, upgrade prompts, gamification, and sales banners from the application.
- [ ] Treat custom domains, SSO, billing automation, semantic retrieval upgrades, and new legal modules as future scope unless separately requested.

## 2. Original application baseline (before implementation)

The repository uses Next.js App Router, React, TypeScript, shared CSS, and existing AI/n8n processing. `src/lib/db.ts` stores one shared JSON object in Upstash Redis or a local file. `src/lib/types.ts` contains one firm and one demo user. The root layout reads that shared identity; real authentication and tenant isolation are not implemented.

`SUPABASE_MIGRATION.md` provides an earlier production proposal. This plan adopts its relational storage/private file direction as a starting point, but supersedes its demo-only timing, firm-owner self-provisioning, and optional separate infrastructure per firm for this reconstruction. Its sample policies require revision; ordinary members must not receive broad write access to memberships, entitlements, or audit records.

| Existing area | Preserve | Redesign focus |
| --- | --- | --- |
| `/` | Document counts/status, extracted deadlines, recent documents, regulatory updates | Actionable daily overview scoped to enabled modules |
| `/dokumenti` | Multi-file upload, client association, document list and client filtering | Searchable register, clear upload flow, useful status indicators |
| `/dokumenti/[id]` | Document conversation, additional files, image attachments, summary and detailed analysis, citations | Unified document workspace with clear modes and readable evidence |
| `/klijenti`, `/klijenti/[id]` | Client details, associated matters/documents, regulatory alerts, client-specific uploads | Professional client register and contextual detail pages |
| `/provjera` | Rule-based contract checks, severity, clause excerpts, legal basis, recommendations | Prioritized findings and direct evidence inspection |
| `/pitanja` | Legal questions over available documents/sources and cited answers | Focused research conversation and source visibility |
| `/propisi` | Regulatory updates, severity, affected clients, reviewed state | Review queue with clear impact and completion feedback |
| `/izvori` and source selectors | Source catalog and enabled-source preferences | Discoverable source settings with accurate availability labels |
| `/zapisnik` | Activity history | Searchable, attributable history with protected writes |
| Processing | Parsing, chunking, retrieval, AI responses, n8n jobs/callbacks, processing/error states | Preserve behavior behind firm-aware authorization |

- [ ] Record a baseline walkthrough of each working route before changing it.
- [ ] Preserve supported uploads: PDF, DOCX, TXT, and Markdown; retain image attachments in document chat.
- [ ] Inventory limitations separately from features. For example, the README mentions finding approval, but the current contract-review screen has no approval action; do not describe that as an existing capability.
- [ ] Verify source integrations against their implementation; catalog entries and sample regulatory content must not be presented as live feeds without a working connection.
- [ ] Keep synthetic demo data and reset behavior exclusively in isolated development/demo environments. Production must never silently seed sample firms or fall back to shared storage.

## 3. Visual identity and design system

### Brand direction

- [x] Create a modern sans-serif LTB Law wordmark and geometric vector mark in SVG, usable in the sidebar, login, and favicon. Favor disciplined letterforms and proportions over decorative legal clip art.
- [ ] Replace the current decorative/demo treatment with an contemporary professional application aesthetic: clean surfaces, strong typography, fine dividers, and restrained emphasis.
- [x] Avoid neon colors, glowing gradients, glass effects, playful illustrations, oversized rounded cards, and decorative AI sparkles.
- [ ] Keep AI attribution close to generated content using plain language such as “AI prijedlog · provjerite izvore”; operational provider/model details belong in admin diagnostics.

### Proposed tokens

| Token group | Baseline specification |
| --- | --- |
| Background | Cool neutral `#F5F7FB`; white content surfaces `#FFFFFF` |
| Primary ink | Deep ink `#172033`; body text `#293449` |
| Secondary text | Slate `#637086`, subject to contrast verification |
| Borders | Soft neutral `#E5E9F0`; stronger borders for interactive fields where needed |
| Accent | Restrained blue `#3D5FE5` for primary actions and selection; approved firm accents for identity details |
| Status | Separate muted green, amber, red, and blue palettes, always accompanied by a text label/icon |
| Typography | Modern sans-serif throughout. System font stack implemented for immediate local rendering and Croatian support; no serif headings. A self-hosted custom sans-serif remains optional. |
| Type scale | 14–16px interface/body; 12–13px secondary metadata; 24–32px page titles; 1.5–1.65 line height for legal text |
| Spacing | 4px base; 8/12/16/24/32/48px spacing steps |
| Corners | 8px controls, 12px panels, 12px dialogs; pills reserved for compact statuses |
| Elevation | Borders for normal panels; subtle shadows only for floating menus, drawers, and dialogs |
| Content | Approximately 68–80 characters per line for reading; wider layouts for registers and document work |

- [x] Implement semantic CSS variables for surfaces, text, borders, accents, statuses, spacing, typography, and motion.
- [ ] Build consistent buttons, inputs, selects, checkboxes, switches, tabs, badges, tables, pagination, dialogs, drawers, tooltips, toasts, and skeleton states.
- [ ] Give every interactive component default, hover, focus, active, disabled, pending, error, and success states where applicable.
- [ ] Use one restrained outline icon family; label important actions and provide accessible names for icon-only controls.
- [ ] Use tabular numerals for dates/counts and reserve monospace for identifiers when it improves scanning.
- [ ] Deliver a polished light theme first. Additional themes must not delay the core redesign.

## 4. Firm-specific identity

- [ ] Display **LTB Law** and the active firm's name persistently in the shell. Example: “LTB Law” above “Odvjetničko društvo Horvat & partneri”.
- [ ] Store legal name, display name, optional logo, approved accent, and short workspace greeting per firm.
- [ ] Provide an elegant initials fallback when a firm has no logo; handle long names and unusually wide logos without breaking layout.
- [ ] Apply the firm accent to restrained UI details. Keep typography, navigation structure, semantic status colors, and accessibility rules consistent across firms.
- [ ] Provide the LTB administrator with desktop/mobile branding previews and a reset-to-default action before saving.
- [ ] Validate logo file type/size and safely process uploads; accept no arbitrary scripts, HTML, or per-firm CSS.
- [ ] Use a neutral LTB Law login by default. Show firm identity only after valid invitation/session context; avoid exposing a public firm directory.
- [ ] Personalize the dashboard introduction and account context using the authenticated firm, without repeated banners consuming workspace space.
- [ ] Use language such as “Radni prostor ureda” and “Postavke ureda”. Exclude plans, tiers, upgrade prompts, and locked-feature advertising.
- [ ] Be accurate about the offering: personalization should feel considered without claiming a dedicated installation or infrastructure that does not exist.

## 5. Information architecture and application shell

- [x] Separate account routes, the firm workspace, and LTB administration into distinct layouts. The root layout must not read firm data before authentication.
- [x] Preserve existing legal-workspace URLs where practical so current links remain useful.
- [ ] Add private admin routes under `/admin`: overview, firms, firm detail, users, access configuration, branding, and platform audit history.
- [ ] Add `/prijava`, invitation acceptance, password recovery/reset, account security, and session-expired flows. These are the only necessary unauthenticated user-facing surfaces.
- [ ] Group firm navigation into **Pregled**, **Rad s dokumentima** (documents, clients, contract review), **Pravno istraživanje** (questions, regulations), and **Ured** (sources, activity, account).
- [ ] Hide empty groups and inaccessible destinations. Update dashboard links, quick actions, and client widgets using the same permissions.
- [ ] Use a 248–264px desktop sidebar, consistent page header, breadcrumbs on detail pages, and one clearly prioritized action per screen.
- [ ] Provide a compact sidebar option on smaller desktop screens and an accessible navigation drawer on mobile.
- [ ] Keep account identity, firm context, help contact, and logout easy to find.
- [ ] Remember appropriate UI preferences per user; keep sensitive content out of persistent browser storage.
- [x] Add local search/filter controls to document, client, regulatory, and activity lists. A cross-module global search is deferred.

## 6. Screen-by-screen redesign checklist

### Login and account access

- [ ] Create a quiet, focused login screen with LTB Law branding, email/password fields, show-password control, recovery, and a discreet configured support contact.
- [ ] Include no registration or purchase CTA; use a short explanation that access is provided by LTB.
- [ ] Support password managers, autofill, keyboard submission, field errors, and pending states without layout movement.
- [ ] Design invitation accepted, expired/revoked invitation, invalid credentials, suspended access, and expired session states without revealing account existence unnecessarily.

### Firm dashboard

- [ ] Lead with the firm name, a short workspace greeting, and the main available action.
- [ ] Prioritize pending processing, items needing review, upcoming deadlines, and recently used documents over decorative metrics.
- [x] Exclude past dates from upcoming deadlines.
- [x] Separate past extracted dates from upcoming dates, linking to the source document for verification. Completion/overdue obligation tracking is not inferred from dates.
- [x] Show only cards belonging to enabled modules, with useful empty states and working destinations.
- [x] Retain document/status counts and regulatory summaries; avoid fabricated analytics or activity.

### Documents and document workspace

- [x] Add a compact toolbar with document search, client/status/type filters, sorting, clear filters, and pagination as needed.
- [x] Use a readable desktop table and mobile list cards with title, client, processing status, and date.
- [ ] Present upload as a focused dialog/drawer with drag-and-drop plus a standard file picker, file validation, client selection, upload progress, and clear recovery on failure.
- [x] Keep uploaded files, client context, and enabled actions together in the document header.
- [x] Unify **Razgovor**, **Sažetak**, and **Detaljna analiza** as stable tabs; switching must preserve context and conversation position.
- [x] On wide screens, show conversation/results alongside an evidence panel; use a drawer or stacked view on smaller screens.
- [ ] Present extracted parties, amounts, obligations, rights, dates, jurisdiction, termination, references, and notes in scannable sections with citations nearby.
- [ ] Preserve adding documents and image attachments; display pending attachment previews and upload errors clearly.
- [x] Open cited excerpts with document title and heading. Show original-file preview only when the original is available; offer readable extracted text otherwise.
- [ ] Preserve drafts through transient UI changes without persisting confidential text in local storage; warn appropriately before intentional navigation that would discard unsent work.
- [ ] Show truthful queued/processing/complete/failed states, prevent duplicate submissions, and provide safe retries. Do not fabricate completion percentages.

### Clients

- [ ] Replace oversized decorative client cards with a searchable register and readable compact summaries.
- [ ] Give each detail page a clear client identity block, associated matters, documents, and permitted regulatory alerts.
- [ ] Keep client-specific uploading and document filtering; maintain context when returning from a document.
- [ ] Preserve existing client/matter capabilities without implying that a full new case-management system is part of this redesign.

### Contract review

- [x] Replace an expanding row of document tabs with a searchable document selector.
- [x] Order findings by severity and offer severity filters with counts.
- [ ] Show the issue, clause evidence, legal basis, and recommendation in a consistent hierarchy; avoid large red panels for routine notes.
- [x] Preserve the distinction between rule-based checks and AI analysis. Display the need for professional review alongside results.
- [ ] Link to relevant document analysis only when permitted; do not add an approval workflow implicitly.

### Legal questions, regulations, and sources

- [x] Give legal questions a focused conversation layout, visible active-source context, readable responses, and expandable evidence.
- [ ] Make insufficient-source and failed-response states explicit; preserve questions on retry.
- [x] Do not force-scroll conversations when the user is reading earlier messages; offer a “new response” control instead.
- [ ] Present regulatory changes as a review queue with date, severity, affected clients, summary, recommended action, and existing reviewed-state control.
- [x] Add useful regulatory filters; retain reviewed state across reloads and users within the same firm.
- [ ] Make source settings easy to reach. Distinguish enabled preference, connected integration, unavailable source, and sample content accurately.
- [ ] Keep source selections firm-specific and restrict editing to the appropriate role; source preferences must never override LTB feature restrictions.

### Activity and account

- [x] Display actor, action, object, and Croatian local time in a searchable activity table/mobile list with actor/module filters and pagination.
- [ ] Add an explicit structured result/outcome field to audit events; do not infer success from free-text descriptions.
- [ ] Link to referenced objects only when the viewer is authorized to access them.
- [ ] Provide account details, password/security actions, and logout; expose firm settings only where the role permits.
- [x] Keep platform administration events separate from the firm's activity view.

## 7. Private LTB administration

- [x] Bootstrap the first platform administrator through a controlled server-side setup; never let a user self-assign this role.
- [ ] Require platform-admin authorization on every `/admin` page and admin API/action, with MFA for platform administrators.
- [ ] Build an overview with firm counts, pending invitations, suspended accounts, and actionable provisioning/processing failures. Avoid exposing client document contents in this overview.
- [x] Build a searchable firm register with name, lifecycle status, user count, enabled modules, and last configuration change.
- [ ] Provide a firm-creation flow: **Identity → Branding → Modules → Users → Review and activate**.
- [x] Allow saving a firm as draft without granting access; use draft, active, and suspended lifecycle states.
- [ ] Let the administrator create/invite users, assign them to a firm, choose roles, resend/revoke invitations, deactivate/reactivate access, and initiate secure password recovery.
- [x] Users set their own passwords through short-lived, single-use invitations; administrators never view or distribute reusable plaintext passwords.
- [ ] Make provisioning retry-safe. If invitation delivery fails, retain the draft/user state and show a retry action without creating duplicate accounts or memberships.
- [x] Provide firm detail sections for overview, users, modules, branding, and activity.
- [ ] Show configuration changes and their impact before saving; confirm firm suspension and other access-removing actions.
- [x] Support per-firm module switches and reusable configuration presets. Presets populate settings and remain independently editable per firm.
- [x] Suspend access without deleting records. A suspended firm must lose access through both UI and direct requests, including already-open sessions.
- [ ] Audit firm creation, activation/suspension, invitations, role changes, module changes, and branding updates with actor and before/after configuration.
- [ ] Provide a branding/module preview with synthetic data; no silent impersonation or routine administrator browsing of firm documents.

## 8. Roles and feature access

### Proposed initial roles

| Role | Access |
| --- | --- |
| LTB platform administrator | Provision firms/users, manage entitlements and branding, view platform audit; no automatic access to legal document contents |
| Firm administrator | Use enabled legal modules, manage allowed source preferences, view firm activity; cannot enable purchased functions or create platform admins |
| Firm member | Use enabled legal workflows; no user, entitlement, branding, or firm-wide source-setting administration |

- [x] Keep user provisioning with LTB initially, as requested. Delegated firm invitations and finer-grained staff roles are future options.
- [x] Use one firm membership per ordinary user for the initial release; explicitly reject ambiguous membership resolution. Multi-firm membership/switching requires a separately defined workflow.
- [ ] Define effective authorization as: **valid session + active user + active firm + membership + role permission + enabled feature + object ownership**.
- [x] Represent features in a typed, server-owned catalog; unknown/new features default to disabled until configured.

| Feature key | Capability | Dependency/behavior |
| --- | --- | --- |
| `documents` | Uploads, document list/detail, file attachment | Base for document-oriented modules |
| `document_chat` | Conversation and image questions within documents | Requires `documents` |
| `summary_analysis` | Summary generation and results | Requires `documents` |
| `detailed_analysis` | Detailed extraction and results | Requires `documents` |
| `contract_review` | Existing contract risk checks | Requires `documents` |
| `clients` | Client register/detail and client-scoped UI | Documents can remain unassigned when disabled |
| `legal_questions` | General legal research conversation | Uses only allowed sources; firm-document retrieval additionally requires `documents` |
| `regulatory_tracking` | Regulatory feed and reviewed state | Hide client links/details when `clients` is disabled |
| `source_settings` | Source catalog/settings UI | Administrator-controlled defaults still apply when this UI is disabled |
| `activity_log` | Firm activity viewer | Audit collection always runs even when the viewer is disabled |

- [x] Keep the dashboard, account security, logout, and help as core capabilities rather than optional commercial modules.
- [x] Validate dependencies when saving configuration; explain affected modules before disabling a prerequisite.
- [ ] Enforce entitlements at page, API, data-access, retrieval, file-access, and background-job boundaries. Hidden navigation alone is insufficient.
- [ ] Do not leak disabled-module data through dashboard counts, client summaries, citations, searches, or cached responses.
- [x] Apply configuration changes on the next authorized request and invalidate stale configuration caches; open sessions must not retain revoked privileges.
- [x] Preserve stored data when a feature is disabled. Block its UI/API reads and new actions until re-enabled; show a neutral unavailable message for old deep links.
- [ ] Record entitlements at job creation; if access is revoked mid-job, retain a safely validated result internally but do not expose it while access is disabled. Prevent new jobs immediately.

## 9. Authentication, data, and service boundaries

- [ ] Replace the shared production JSON store with relational, firm-scoped storage. Use the existing Supabase proposal as the proposed implementation direction, subject to an implementation-time provider/configuration review.
- [ ] Model firms, branding, users/identities, memberships, platform-admin grants, feature definitions, firm entitlements, invitations, files, analyses/jobs, messages, source settings, and audit events explicitly.
- [ ] Add firm ownership to clients, matters, documents, chunks, conversations, analysis jobs, source preferences, regulatory review state, and all private assets.
- [ ] Separate any genuinely public legal corpus/regulatory catalog from private firm annotations, affected-client associations, review state, and documents.
- [x] Derive firm context from verified identity and membership, never from a trusted browser-supplied firm identifier.
- [ ] Enforce database row policies and server-side permissions with deny-by-default rules. Scope foreign keys/relationships so objects from different firms cannot be linked.
- [ ] Protect all workspace pages and APIs, including the home dashboard, source updates, regulatory actions, uploads, chat, and processing endpoints.
- [ ] Disable public signup at the identity provider as well as the UI. A valid identity without an active provisioned membership must receive no workspace access.
- [ ] Use secure session cookies, session expiry/revocation, login throttling, generic recovery responses, and CSRF/origin checks for cookie-authenticated writes.
- [x] Keep secrets and privileged database credentials server-side. Restrict elevated operations to explicit administrative or service tasks.
- [ ] Store original uploads and branding assets in appropriately protected storage; authorize access and issue short-lived file URLs. Include firm identity in cache/storage namespaces.
- [ ] Make private pages/responses non-publicly cacheable and avoid cross-firm cache reuse. Search-engine exclusion is supplemental; authentication is the access boundary.
- [ ] Update n8n dispatch/callbacks to resolve persisted jobs to the correct firm/document/analysis. Authenticate callbacks, validate payloads, and make retries idempotent; do not trust callback ownership fields.
- [ ] Handle concurrent uploads, chats, and callbacks with transactional writes and uniqueness constraints rather than rewriting an entire shared database object.
- [ ] Keep audit writes server-controlled and append-only for ordinary users; do not claim immutability while reset/update paths remain available.
- [x] Remove the production reset endpoint and demo controls. AI/service outages must show honest unavailable states rather than silently returning sample output.
- [ ] Document file limits, retention/deletion procedures, backups and restore process, and actual AI/external-service data flows before onboarding real firms.

## 10. Responsive behavior and motion

### Layout behavior

- [ ] Verify at 360, 390, 768, 1024, 1280, and 1440px widths, plus 320px reflow and 200% zoom.
- [ ] Below 768px: single-column content, navigation drawer, mobile list representations, full-width primary controls, and bottom drawers where appropriate.
- [ ] At 768–1199px: compact navigation and stacked secondary panels; preserve useful reading widths.
- [ ] At 1200px and above: full sidebar, multi-column dashboard, and document/evidence split view.
- [ ] Avoid whole-page horizontal scrolling. Where a true data table needs horizontal scrolling, contain it and make the behavior discoverable.
- [ ] Account for safe areas, mobile keyboard height, sticky headers, and chat composer visibility.
- [ ] Use approximately 44px touch targets for primary mobile interactions; never make essential actions hover-only.

### Motion specification

| Interaction | Motion |
| --- | --- |
| Button/link/row feedback | 120–160ms color/opacity transition; no layout movement |
| Tab indicator and small state changes | 160–200ms ease-out |
| Menus, dialogs, drawers | 180–240ms opacity plus 4–8px displacement |
| Route content arrival | At most 160ms subtle fade; keep the shell stable and never delay navigation |
| Toast appearance/removal | 180–220ms; critical errors remain until dismissed/resolved |
| Expandable evidence/details | 180–220ms with controlled layout; preserve reading position |
| Loading | Stable skeleton geometry and restrained progress indicators reflecting real state |

- [ ] Define shared motion tokens, with a baseline easing such as `cubic-bezier(0.2, 0, 0, 1)`.
- [x] Prefer CSS transitions for routine interactions; add an animation dependency only if a demonstrated interaction requires it.
- [x] Honor `prefers-reduced-motion`: remove travel, shimmer, and decorative transitions while preserving immediate feedback.
- [x] Avoid bouncing, parallax, staggered card entrances, animated counters, and continuous decorative effects.
- [ ] Animate mainly opacity and transforms; measure heavier disclosure/layout animations on document-heavy screens.
- [ ] Preserve focus and reading position during refresh, polling, sorting, and new messages. Never replay entrances on every poll.

## 11. Accessibility, responsiveness, and quality gates

- [ ] Target WCAG 2.2 AA; verify text contrast, visible focus, semantic headings, labels, error associations, and non-color status cues.
- [ ] Support keyboard-only use for navigation, uploads, tables, tabs, menus, source selection, and admin configuration.
- [ ] Trap focus in modal dialogs, support Escape where safe, restore focus on close, and announce async state changes without repeated chatter.
- [ ] Use loading, empty, error, permission-denied, not-found, and success states on every redesigned screen.
- [ ] Paginate large registers and avoid loading all firm data into every page. Load heavy document previews only when needed.
- [ ] Cancel/back off unnecessary polling and avoid overlapping status requests; stop polling when jobs reach a terminal state.
- [ ] Target LCP ≤2.5s, INP ≤200ms, and CLS ≤0.1 on representative screens under agreed test conditions; measure rather than assume achievement.
- [ ] Test current supported desktop browsers and mobile Safari/Chrome, including long Croatian firm names, long filenames, empty accounts, failed services, and large document collections.

## 12. Implementation sequence and deliverables

### Phase 1 — Baseline and visual foundation

- [ ] Capture the current feature inventory and representative development screenshots.
- [ ] Finalize the route map, role matrix, feature dependencies, and firm lifecycle from this plan.
- [ ] Produce representative desktop/mobile designs for login, dashboard, document workspace, and firm administration using synthetic data.
- [ ] Create the wordmark/monogram, design tokens, component states, and motion examples.
- [ ] Review the visual direction against the brief before propagating it to every screen.

### Phase 2 — Private application foundation

- [ ] Implement relational storage, authentication, invitation provisioning, memberships, firm isolation, and private files.
- [ ] Split account/workspace/admin layouts and move authenticated identity into the application shell.
- [ ] Implement role/feature authorization and migrate every existing API and service job to firm-aware access.
- [ ] Pass cross-firm isolation and direct-request authorization tests before onboarding any real firm.

### Phase 3 — LTB administration and firm branding

- [ ] Implement firm creation/activation/suspension, user provisioning, feature configuration, branding preview, and platform audit.
- [ ] Apply branding and permissions consistently to navigation, dashboards, detail screens, and processing actions.
- [ ] Verify two synthetic firms with different names, accents, modules, users, and data in the same deployment.

### Phase 4 — Legal workflow redesign

- [ ] Rebuild dashboard, documents, conversation/analysis workspace, clients, contract review, legal questions, regulations, sources, and activity using shared components.
- [ ] Add the specified filtering, evidence panels, mobile layouts, loading/error states, and restrained transitions.
- [ ] Check each migrated screen against the baseline before retiring its old implementation.

### Phase 5 — Migration, verification, and release preparation

- [ ] Reconcile `SUPABASE_MIGRATION.md` with the final centralized architecture, administrative ownership, schema, and authorization policies.
- [ ] Back up existing data and dry-run an explicit firm-assigned migration, validating counts, relationships, conversations, analyses, and citations.
- [ ] Identify missing original uploads; retain extracted-text access and mark original files unavailable until re-uploaded.
- [ ] Perform cutover in a controlled window with writes paused or otherwise reconciled; document rollback without restoring an insecure shared production mode.
- [x] Run production build/type checks and targeted integration/end-to-end tests for access boundaries and preserved workflows.
- [ ] Complete keyboard, responsive, motion, visual, and performance checks using realistic synthetic content.
- [ ] Update setup documentation and create a concise LTB operator guide for firms, users, branding, entitlements, recovery, and suspension.
- [ ] Prepare a private staging walkthrough and launch checklist; do not treat this planning document as authorization to publish or provision external services.

## 13. Release acceptance checklist

- [ ] An unauthenticated visitor can reach login/recovery/invitation flows but cannot read workspace HTML, APIs, metadata, files, or firm data.
- [ ] LTB can create a firm, configure its identity/modules, add a user, activate access, and have that user sign in without changing or redeploying code.
- [ ] The user sees LTB Law and their firm identity consistently across desktop and mobile.
- [ ] Two firms can use different functions in the same running application without seeing each other's data.
- [ ] Changing a URL/object ID, calling an API directly, or requesting a file never bypasses firm ownership, role, or module restrictions.
- [ ] A firm member cannot enter `/admin`, change entitlements, manage identities, or mutate audit history through direct requests.
- [ ] Disabling a module removes its navigation, actions, derived widgets, and API access without deleting its records; re-enabling restores permitted access.
- [ ] Revoked invitations, deactivated users, and suspended firms cannot continue through old sessions or new requests.
- [ ] Verified callbacks can complete only their registered jobs; repeated callbacks and concurrent operations do not corrupt or duplicate data.
- [ ] Every baseline legal workflow remains available when its feature is enabled, including attachments, both analysis modes, citations, source selection, and regulatory reviewed state.
- [ ] No self-service signup, checkout, upgrade advertising, production reset controls, or misleading live-data claims appear in the firm experience.
- [ ] Layouts remain usable on small screens and with keyboard/zoom; reduced-motion preferences work throughout.
- [ ] Branding, type, spacing, states, and animation feel consistent across account, firm, and admin screens.
- [ ] Data survives restart/deployment; backup recovery and the migration rollback procedure have been verified before real-firm onboarding.

## 14. Assumptions to validate during implementation

These are planning defaults, not blockers to writing this plan.

- [ ] Confirm final LTB logo assets or proceed with the proposed custom SVG wordmark/monogram.
- [ ] Confirm the real firms' display names, logos, permitted accent colors, and support contact before activation.
- [ ] Confirm hosting, identity/email service, database/storage region, and service credentials before connecting external infrastructure; verify current provider documentation at that time.
- [ ] Confirm initial module presets and whether a firm administrator needs any additional management rights. Default: LTB provisions all users and entitlements.
- [ ] Confirm whether existing stored content should migrate or remain demo-only; never assign unclassified existing data to a real firm automatically.
- [ ] Confirm handling of actual source feeds and regulatory content; retain clear sample/unavailable states until integrations are operational.

Definition of done: one privately provisioned LTB Law application, a complete professional redesign, configurable firm identity and functions, a working LTB admin area, verified firm isolation, and preserved existing legal workflows.
