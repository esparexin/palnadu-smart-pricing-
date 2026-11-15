# Palnadu.dev Smart Pricing — Architecture Decision Register

- **Status:** In progress; foundation direction for D-17, standalone D-03,
  D-06, and D-13 is approved. ERP-connected D-03 cases,
  D-13 private API authentication, and D-01–D-02, D-04–D-05,
  D-07–D-12, D-14–D-16, D-18–D-19 remain pending. Phase 2 database/backend
  foundation scope is separately authorized; no pending business decision is
  changed by that authorization.
- **Project:** Palnadu.dev Smart Pricing
- **Tracking:** [Issue #2](https://github.com/esparexin/palnadu-smart-pricing-/issues/2)
- **Related specification:** [INITIAL_ARCHITECTURE.md](./INITIAL_ARCHITECTURE.md)

This register is the authoritative record of owner decisions and pending
choices identified by the architecture review. Recommendations remain proposals
unless an owner decision is recorded below. Items marked as blocking must be
resolved before implementing their affected feature or production phase; they
do not authorize code or service provisioning.

## Frozen constraints (not open choices)

- Build a complete standalone product first. Each client installation owns its
  application data and credentials; there is no centralized multi-tenant runtime.
- Existing client websites can integrate without being rebuilt.
- Product management includes manual entry, Excel/CSV import and export, large
  catalogues, models/specifications/variants, and multiple product images.
- Inventory is optional. When Smart Pricing owns enabled stock, the default
  minimum threshold is 1 unit and global/product overrides are supported.
- Image discovery is hybrid and requires product-match and commercial-rights
  review. Google is a discovery source, not proof of commercial-use rights.
- Pricing and quotations are server-authoritative; public catalogue surfaces
  do not expose hidden prices; issued quotation values are immutable snapshots.
- Sales velocity uses actual invoice/dispatch data, not browsing or quotations.
- ERP, WhatsApp, and future business/messaging integrations use client-specific
  credentials and replaceable adapters. Do not expose local Tally ports.
- The proposed stack includes TypeScript, pnpm, Next.js, Node.js, Fastify,
  PostgreSQL, Drizzle, Zod, R2/S3-compatible storage, Sharp, and PostgreSQL jobs.
  Redis remains deferred until justified by measured need.

## Decision register

### D-01 — Launch market, currency, locale, and tax

- **Current understanding:** No launch jurisdiction, supported currencies,
  languages, tax model, tax-inclusive display policy, or legal invoice
  requirements are confirmed.
- **Options:** One launch jurisdiction/currency; a defined list of currencies
  and locales; or a broader configurable tax/currency framework.
- **Recommendation:** Launch with an explicitly named jurisdiction and currency
  set. Represent currency codes and tax rules explicitly; configure, do not
  hardcode, tax behavior. Obtain qualified review for local invoice/tax rules.
- **Business impact:** Customer-facing totals, legal documents, display language,
  and compliance obligations.
- **Technical impact:** Money precision, rounding, quote snapshot schema, tax
  configuration, localization, and timestamps.
- **Blocks implementation:** Yes — pricing, quotation, invoice/document
  generation, and launch-market copy; not neutral repository setup.
- **Required owner approval:** Project owner; tax/legal specialist where needed.

### D-02 — Discount calculation, caps, and rounding

- **Current understanding:** Fixed and percentage discounts are required;
  offer cannot be negative, discount cannot exceed MRP, and price calculations
  are server-authoritative. Whether the offer itself may exceed MRP, the
  discount base, and stacking order are not defined.
- **Options:** Allow or prohibit offer greater than MRP; apply discount to MRP
  or offer price; allow/disallow stacking; select priority, best-discount, or
  explicit per-quote selection; define currency/unit precision and line-vs-total
  rounding.
- **Recommendation:** Approve example-based rules for every combination,
  boundary, expiry, quantity, tax, and rounding case before choosing schema/API.
  Never infer precedence from row order.
- **Business impact:** Different choices produce materially different payable
  totals and customer expectations.
- **Technical impact:** Pricing engine, discount assignment, effective dates,
  validation, persistence constraints, and immutable quote lines.
- **Blocks implementation:** Yes — pricing engine and quotations.
- **Required owner approval:** Project owner with finance/tax reviewer.

### D-03 — Product master and field-level ERP ownership

- **Current understanding:** Every entity must have one authority. Smart
  Pricing is approved as product master for new standalone installations.
  Product/field ownership and sync direction for ERP-connected installations
  remain unconfirmed.
- **Options:** Smart Pricing master; ERP master; or field-by-field ownership
  with explicit synchronization direction and conflict rules.
- **Recommendation:** Start new installations with Smart Pricing as master only
  when approved; otherwise choose a single ERP product master. Persist mapping,
  version/cursor, direction, and conflict policy per provider/entity.
- **Business impact:** Prevents duplicated or overwritten catalogue records and
  clarifies which system staff should edit.
- **Technical impact:** Product CRUD permissions, external mappings, sync
  idempotency, conflict queues, and import/update behavior.
- **Blocks implementation:** Resolved for Smart Pricing-owned catalogue data
  in new standalone installations. ERP synchronization and any catalogue
  mutation that would conflict with an external master remain blocked.
- **Required owner approval:** Project owner and the client's system owner.
- **Owner decision:** Approved by the project owner on 2026-11-14: Smart
  Pricing is the product master for new standalone installations. For an
  installation connected to an ERP, product/field ownership and sync direction
  remain pending and must be approved before synchronization.

### D-04 — Inventory ownership, scope, and alert semantics

- **Current understanding:** Inventory can be disabled or owned by Smart Pricing
  or an ERP. The Smart Pricing-owned default minimum threshold is 1, with global
  and product overrides. Locations, reservation, negative stock, returns,
  critical thresholds, alert channels, and acknowledgement behavior are open.
- **Options:** Single stock location or multiple locations; quote-only
  availability or reservations; allow/disallow negative balances; separate
  critical threshold and notification policy.
- **Recommendation:** Keep inventory disabled unless selected. For local stock,
  begin with one explicitly scoped balance and immutable movements; configure
  low/critical thresholds and notification behavior. Do not reserve stock for
  quotations absent explicit approval.
- **Business impact:** Availability promises, stock alerts, staff workflow, and
  risk of overselling.
- **Technical impact:** Inventory location keys, movement ledger, concurrency,
  projections, event deduplication, and notification adapter.
- **Blocks implementation:** Yes — inventory/alerts and any quote behavior
  dependent on availability; not catalogue work while disabled.
- **Required owner approval:** Project owner and inventory/ERP owner.

### D-05 — Sales source and fast-/slow-moving definitions

- **Current understanding:** Sales analysis must use actual invoice/dispatch
  data; views, clicks, enquiries, and quotations are not sales. Accepted
  documents, returns, cancellations, periods, units, and thresholds are open.
- **Options:** Invoices, dispatch notes, or both; gross/net quantities; fixed
  rolling periods or configurable periods; owner-defined velocity bands.
- **Recommendation:** Agree eligible source documents, treatment of returns and
  cancellations, unit conversions, reporting period, and threshold examples
  before presenting rankings.
- **Business impact:** Incorrect analysis can misdirect purchases and pricing.
- **Technical impact:** ERP/CSV mappings, deduplication, sales facts, aggregation,
  and report freshness.
- **Blocks implementation:** Yes — fast-/slow-moving reports; not stock alerts
  or unrelated catalogue workflows.
- **Required owner approval:** Project owner and finance/sales-data owner.

### D-06 — Admin identity, roles, and recovery

- **Current understanding:** Local password accounts with server-side sessions
  are approved for the initial standalone installation. Owner-managed accounts,
  separate least-privilege permissions by work area, separately controlled
  exports, MFA for privileged users when supported, and documented secure
  recovery are approved directions. The exact action-level permission matrix,
  MFA handling, and recovery procedure will be documented during admin module
  implementation.
- **Options:** Local password + server session; approved OIDC/SSO; or a staged
  approach with one supported identity source and explicit recovery.
- **Recommendation:** For an initial standalone installation, use local
  password accounts with server-side sessions and a small least-privilege
  role/permission matrix. Consider client SSO only when a specific installation
  requires it. Require MFA for privileged users if supported; document secure
  recovery and audit sensitive actions.
- **Business impact:** Access separation for prices, inventory, customers,
  quotations, integrations, and data exports.
- **Technical impact:** Session store, password hashing/SSO, CSRF, permission
  checks, provisioning, and support operations.
- **Blocks implementation:** No unresolved owner decision. Document the
  detailed permission matrix and recovery behavior during admin module
  implementation, before protected APIs are enabled.
- **Required owner approval:** Project owner/security owner.
- **Owner decision:** Approved by the project owner on 2026-11-14: use local
  admin accounts with server-side sessions for the initial standalone
  installation; consider client SSO only when a specific installation needs it.
  The installation owner manages accounts; other administrators receive
  separate least-privilege permissions for catalogue/media, pricing,
  inventory, enquiries/quotations, or integrations, with exports separately
  controlled. MFA for privileged users when supported and documented secure
  recovery are approved directions. Document the detailed permission matrix,
  MFA handling, and recovery steps during admin module implementation; this
  approval does not grant blanket permissions.

### D-07 — WhatsApp enquiry identity, consent, and handoff

- **Current understanding:** Use each client's WhatsApp Business Cloud API
  assets; opening WhatsApp is not submission. A webhook signature authenticates
  provider origin, not customer identity or consent. Templates, service windows,
  sender matching, opt-out, human handoff, and direct web form scope are open.
- **Options:** WhatsApp-only verified inbound requests; WhatsApp plus explicit
  web form; manual/admin verification for ambiguous senders; approved
  phone-verification mechanism where justified.
- **Recommendation:** Treat the click as a handoff only. Use an expiring,
  single-use opaque reference for selected products; verify webhook origin,
  deduplicate events, validate sender/consent under an approved policy, and
  require admin review before issuing a quote. Define human handoff and opt-out.
- **Business impact:** Customer expectations, privacy, consent, and whether a
  request is actually received.
- **Technical impact:** Webhook security, state transitions, correlation,
  provider policy, message templates, and retention.
- **Blocks implementation:** Yes — WhatsApp integration and enquiry-to-quote
  automation.
- **Required owner approval:** Project owner and each client's WhatsApp account
  owner.

### D-08 — Quotation lifecycle and document policy

- **Current understanding:** Request and issued quote are distinct; quotes are
  multi-product, server-calculated, immutable after issue, and have validity.
  Numbering, status transitions, terms, tax display, branding, language, PDF
  generation, delivery, and expiry behavior need confirmation.
- **Options:** Sequential per-installation numbering or opaque IDs; configurable
  validity/terms; HTML-to-PDF or approved document library; signed expiring
  download vs approved messaging delivery.
- **Recommendation:** Approve sample quote documents and lifecycle transitions.
  Allocate unique numbers transactionally and render every document from the
  persisted snapshot; never reprice after issue.
- **Business impact:** Customer-facing terms, trust, legal requirements, and
  workflow responsibilities.
- **Technical impact:** Snapshot columns, numbering concurrency, PDF runtime,
  storage/download authorization, and retention.
- **Blocks implementation:** Yes — quotation issue and delivery.
- **Required owner approval:** Project owner with finance/legal review as needed.

### D-09 — Image discovery providers and commercial rights

- **Current understanding:** Manufacturer first, authorized distributor next,
  then sources with documented commercial rights; Google is discovery only.
  Provider, source terms, matching confidence, attribution, image-copy rights,
  review authority, and budget are not selected.
- **Options:** Manual source search; approved manufacturer/distributor feeds;
  commercial image APIs; or a staged combination.
- **Recommendation:** Approve providers and evidence requirements per source.
  Store candidates with brand/model/part match confidence and provenance; require
  admin approval and documented permission before publication or copying. Do
  not make new-customer discovery depend on Google Custom Search JSON API.
- **Business impact:** Product accuracy, copyright/commercial-use exposure, and
  operating expense.
- **Technical impact:** Search adapters, rate limits, rights metadata, candidate
  ranking, bulk jobs, retention, and object storage.
- **Blocks implementation:** Yes — automated discovery/publication; manual
  product image upload can proceed under existing rights policy.
- **Required owner approval:** Project owner and client media/brand owner.

### D-10 — TallyPrime and other ERP connector method

- **Current understanding:** Replaceable adapters and explicit source ownership
  are required. Supported Tally versions, local integration path, capabilities,
  connection owner, and sync direction are unknown.
- **Options:** Client-run outbound connector/agent; supported vendor/API gateway;
  scheduled file exchange; or manual CSV/XLSX fallback.
- **Recommendation:** Assess each supported version and data operation before
  promising support. Prefer an outbound, client-controlled local connector where
  required; never expose local Tally ports publicly.
- **Business impact:** Deployment effort, data freshness, supported workflows,
  and client operations burden.
- **Technical impact:** Network trust, secrets, connector upgrades, mapping,
  retries, reconciliation, and supportability.
- **Blocks implementation:** Yes — provider-specific sync; not provider-neutral
  interfaces or manual import/export.
- **Required owner approval:** Project owner, client IT/ERP owner, and security
  owner.

### D-11 — Hosting, runtime, database provider, and data residency

- **Current understanding:** One independent deployment/database per client is
  required. Provider, region, container model, domain, traffic profile, service
  limits, and cost are not selected.
- **Options:** Approved Node-compatible container/VM and managed PostgreSQL;
  client-hosted deployment; or another reviewed host that supports Next.js,
  Fastify, Sharp, long-lived workers, and database connectivity.
- **Recommendation:** Choose a supported Node container/VM with a private
  managed PostgreSQL service, separate worker, and per-installation storage/
  credentials. Avoid edge-only hosting unless all runtime/native/job
  compatibility is proven.
- **Business impact:** Client isolation, availability, geographic/data
  residency, and recurring cost.
- **Technical impact:** Deployment shape, connection pooling, network access,
  logging, scaling, backups, and native Sharp compatibility.
- **Blocks implementation:** Yes — production provisioning/deployment; not
  local architecture or tests.
- **Required owner approval:** Project owner and client/security/data-residency
  owner.

### D-12 — Backup, recovery, retention, and operational ownership

- **Current understanding:** Backups, restore, rollback, and monitoring are
  required. RPO/RTO, frequency, retention, region, key custody, restore testing,
  incident owner, and object-store recovery plan are undecided.
- **Options:** Managed PostgreSQL point-in-time recovery plus independent
  encrypted backups; client-managed backup; or a reviewed combination.
- **Recommendation:** Set per-installation RPO/RTO and retention, encrypt
  backups, separate backup credentials/keys, include required object metadata,
  and test restore in isolation before production.
- **Business impact:** Recoverability and customer-data retention obligations.
- **Technical impact:** Provider/service selection, object/database consistency,
  costs, restore runbooks, and operational alerts.
- **Blocks implementation:** Yes — production release; exact retention also
  blocks real customer-data onboarding.
- **Required owner approval:** Project owner and each client data/operations
  owner.

### D-13 — Existing-website integration and public API access

- **Current understanding:** Standalone Smart Pricing comes first, and
  existing client websites must integrate without rebuilding. A versioned
  REST API and server-side integration baseline are approved. A widget is
  deferred until a client need is identified; private API authentication is
  still open.
- **Options:** Public REST API consumed by client-rendered pages; documented
  server-side client/SDK; optional embeddable storefront; or a client-specific
  adapter that calls the same API.
- **Recommendation:** Make versioned REST + server-side client the supported
  baseline. Defer widget/native distribution until a real client requires it.
  Keep presentation in the client site and all business logic in Smart Pricing.
- **Business impact:** Integration effort, branding fit, and preserving
  clients' existing sites.
- **Technical impact:** API compatibility, authentication/CORS, rate limits,
  caching, content security, and support scope.
- **Blocks implementation:** Resolved for the versioned REST/server-side
  baseline. Private external API authentication remains pending; a widget is
  deferred until a client need is approved. Public-safe catalogue endpoints
  can be designed independently.
- **Required owner approval:** Project owner and first integrating client.
- **Owner decision:** Approved by the project owner on 2026-11-14: use a
  versioned REST API and server-side integration option; defer an embedded
  widget unless a client later needs one. Private API authentication details
  remain pending.

### D-14 — Google Search Console and GA4 scope

- **Current understanding:** Per-client integrations are required capabilities;
  launch timing, OAuth scopes, reports, consent policy, retention, and whether
  Smart Pricing only links out or synchronizes reports are open.
- **Options:** Document links only; read-only per-client connection and reports;
  or defer until requested by a client.
- **Recommendation:** Keep adapters optional and read-only initially. Use
  minimum scopes, client-owned properties, server-side secrets, and privacy
  controls. Never send PII, hidden prices, quote lines, or treat analytics as
  sales facts.
- **Business impact:** Search/marketing visibility and customer privacy.
- **Technical impact:** OAuth credentials, APIs/quotas, consent, sync jobs, data
  retention, and analytics accuracy.
- **Blocks implementation:** Yes — Google authorization/reporting; no — core
  catalogue or pricing.
- **Required owner approval:** Project owner and client property/data owner.

### D-15 — Import/export identity, size, partial commit, and field policy

- **Current understanding:** CSV/XLSX import/export, create-only and explicitly
  chosen updates, duplicate detection, previews, row errors, retries, history,
  and no accidental stock updates are required. Maximum file/row limits,
  identity matching, partial-commit semantics, template compatibility, and
  exportable sensitive fields are open.
- **Options:** Per-row commit after preview; all-or-nothing transaction per
  bounded batch; or staged batches with resumable chunks. Define explicit
  create/update identity and export role policy.
- **Recommendation:** Use bounded asynchronous batches with idempotent row
  results, explicit update mode, documented partial success, versioned
  templates, strict size limits, and separately authorized private-field export.
- **Business impact:** Catalogue maintenance scale and risk of unintended
  changes/data disclosure.
- **Technical impact:** Streaming parser choice, memory limits, transactions,
  idempotency, object storage, worker capacity, and audit history.
- **Blocks implementation:** Yes — import/export behavior and parser selection.
- **Required owner approval:** Project owner and catalogue-data owner.

### D-16 — Browser support, accessibility evidence, and performance budgets

- **Current understanding:** Mobile-first layout, six viewport classes, WCAG
  2.2 AA, Lighthouse targets, and actual browser validation are required.
  Supported browser/OS versions, network profile, and release thresholds for
  performance are not fixed.
- **Options:** Owner-approved current evergreen browser set; include supported
  older browsers; choose lab and/or field performance measurement.
- **Recommendation:** Approve browser/OS support and representative mobile
  network conditions before E2E gates; use the documented viewport sizes and
  treat governance Lighthouse scores as measured targets, not guarantees.
- **Business impact:** Reach, usability, accessibility, and support burden.
- **Technical impact:** Playwright projects, browser installation/runtime,
  polyfills, CI time, and performance variance.
- **Blocks implementation:** No — responsive implementation may proceed after
  design approval; yes — final UI/release acceptance.
- **Required owner approval:** Project owner and accessibility/product owner.

### D-17 — Runtime topology and supporting dependency selection

- **Current understanding:** TypeScript/pnpm, Next.js, Node/Fastify,
  PostgreSQL/Drizzle, Zod, R2/S3, Sharp, PostgreSQL jobs, Pino, Vitest,
  Playwright, and GitHub Actions are proposed. Required drivers, session store,
  Zod/OpenAPI adapter, parsers, PDF renderer, and test/coverage packages are not
  selected. No dependencies are installed.
- **Options:** Separate web/API/worker processes in one workspace; a unified
  Node deployment with separate process entry points; or a revised stack after
  a technical prototype.
- **Recommendation:** Keep one codebase/release train and separate runtime
  processes for web, API, and worker. Select minimal compatible dependencies
  only after boundaries and deployment target are approved. Reuse Fastify's
  Pino integration; do not add duplicate loggers.
- **Business impact:** Operational burden, reliability, delivery speed, and
  extensibility for websites/integrations.
- **Technical impact:** Build/deploy complexity, native dependencies,
  connection management, logging, API schema generation, and test runtime.
- **Blocks implementation:** Resolved for the approved package foundation;
  overall Issue #2 approval and the other applicable foundation decisions are
  still required before implementation.
- **Required owner approval:** Project owner/architecture reviewer.
- **Owner decision:** Approved by the project owner on 2026-11-14. Keep one
  codebase and release train, with web, API, and worker separately runnable.
  Select only minimal compatible dependencies after boundaries and deployment
  needs are approved; reuse Fastify's Pino integration and do not add a duplicate
  logger. No additional queue/cache technology is approved without measured
  need. This decision does not authorize implementation.

### D-18 — Per-installation operating budget and support ownership

- **Current understanding:** Independent deployments multiply baseline hosting,
  database, storage, messaging, discovery, CI, backup, monitoring, and upgrade
  costs. No budget or support/upgrade owner is named.
- **Options:** Palnadu-managed per-client operations; client-managed hosting;
  or a documented split with explicit service boundaries.
- **Recommendation:** Approve who owns credentials, patching, backups,
  incidents, provider invoices, and upgrade windows per client before choosing
  paid services or promising an SLA.
- **Business impact:** Total cost of ownership, client responsibilities, and
  service expectations.
- **Technical impact:** Account/project isolation, monitoring, support access,
  deployment automation, and backup ownership.
- **Blocks implementation:** Yes — paid production provisioning and launch
  commitments; not local development.
- **Required owner approval:** Project owner and each client operations owner.

### D-19 — Pricing and customer master ownership with connected ERP/CRM

- **Current understanding:** Each independent installation stores its own
  approved pricing, customers/enquiries, and quotations. The active MRP/offer
  and customer master source when connected to an external ERP/CRM is not
  specified. The pricing calculation itself must remain one Smart Pricing
  server-side service.
- **Options:** Smart Pricing is master for price and customer/enquiry records;
  ERP/CRM is master with a local operational mirror; or explicitly assigned
  field-level ownership and synchronization direction for each entity.
- **Recommendation:** Keep pricing rules/calculation and issued quotation
  snapshots authoritative in Smart Pricing. Require explicit owner approval
  before importing/updating price records from an ERP. Keep enquiry/quotation
  customer snapshots local; only synchronize customer fields with a CRM/ERP
  when a documented consent, field mapping, direction, and conflict policy is
  approved.
- **Business impact:** Prevents contradictory prices, duplicate customers, and
  loss of customer history while preserving each installation's data boundary.
- **Technical impact:** External mappings, permission boundaries, sync
  idempotency, privacy/consent, and quotation snapshot provenance.
- **Blocks implementation:** Yes — ERP/CRM price/customer synchronization; no
  — standalone Smart Pricing-owned pricing and enquiry workflows.
- **Required owner approval:** Project owner and the client's finance/CRM/ERP
  data owner.

## Approval record

Foundation direction for D-17, standalone D-03, D-06, and D-13 is approved as
recorded above. ERP-connected D-03 cases, D-13 private API authentication, and
D-01–D-02, D-04–D-05, D-07–D-12, D-14–D-16, and D-18–D-19 remain pending;
their recommendations are not approvals. Record each further decision and
any accepted deferral on issue #2 before its affected implementation phase
starts.

The project owner authorized Phase 2 database/backend foundation work under
Issues #4 and #5 on 2026-11-14. This scope approval does not resolve any
pending business decision and does not authorize Phase 3 authentication
implementation, product features, production provisioning, or deployment.
Keep issue #2 open until its acceptance criteria and approval evidence are
satisfied.
