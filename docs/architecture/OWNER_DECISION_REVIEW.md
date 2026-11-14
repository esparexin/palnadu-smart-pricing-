# Owner Decision Review

This short guide covers only decisions needed for the shared application
foundation. The full list, including decisions that can wait for individual
features, remains in [DECISION_REGISTER.md](./DECISION_REGISTER.md).

**Status:** Foundation direction for D-17, standalone D-03, D-06, and D-13 is
approved. ERP-connected D-03 cases, D-13 private API authentication, and
decisions for later features or production remain pending. D-06's detailed
permission matrix will be documented during admin module implementation.
Issue #2 remains open; these decisions do not authorize coding.

## Foundation decisions

### D-17 — Application setup

- **What:** How the website, API, and background work are organized.
- **Recommended:** One codebase and release train, with the web, API, and
  worker separately runnable. Use only the minimum compatible dependencies;
  add Redis only if measured need justifies it.
- **Why:** Keep the project together while allowing long-running work, such as
  imports, to run separately.
- **Timing:** Needed before the package foundation.
- **Status:** **Approved by the project owner on 2026-11-14.** This does not
  approve the other decisions or authorize implementation. See the recorded
  detail under D-17 in [DECISION_REGISTER.md](./DECISION_REGISTER.md).

### D-03 — Product ownership

- **What:** Which system is the authoritative place to create and change
  product details.
- **Recommended:** Smart Pricing owns products in a new standalone
  installation. If an ERP is connected as the master, explicitly map which
  system owns each field and how updates are handled.
- **Why:** Staff need one trusted place to edit a product; otherwise systems
  can overwrite or duplicate one another.
- **Timing:** Decided for new standalone installations; ERP ownership must be
  decided before connecting an ERP.
- **Status:** **Approved for new standalone installations.** ERP-connected
  product/field ownership remains pending. See D-03 in
  [DECISION_REGISTER.md](./DECISION_REGISTER.md).

### D-06 — Admin access

- **What:** Who can sign in, what they can change, and how they recover access.
- **Recommended:** For the initial standalone installation, use local admin
  accounts with secure server-side sessions and a small set of
  least-privilege roles. Add client SSO only if an installation needs it; use
  MFA for privileged users when supported.
- **Why:** Product, price, customer, and integration data should only be
  accessible to the people who need it. Local sign-in also avoids depending on
  an external identity provider for the first installation.
- **Timing:** The access direction is approved. Document the detailed matrix
  during admin module implementation, before protected APIs are enabled.
- **Status:** Local accounts, owner-managed users, separate work-area
  permissions, separately controlled exports, MFA when supported, and
  documented recovery are approved. No further owner question is needed for
  D-06; see [DECISION_REGISTER.md](./DECISION_REGISTER.md).

### D-13 — Existing website integration

- **What:** How a client's existing website will display Smart Pricing
  products without being rebuilt.
- **Recommended:** Provide a versioned REST API and a server-side integration
  option. Add a widget only if a client later needs one.
- **Why:** This works with existing websites while keeping product and pricing
  rules in one place.
- **Timing:** The REST/server-side baseline is decided. Resolve private API
  authentication before exposing private external routes.
- **Status:** REST/server-side baseline approved; private API authentication
  remains pending. The widget is deferred unless a client needs it; see D-13
  in [DECISION_REGISTER.md](./DECISION_REGISTER.md).

## Decisions that can wait

ERP ownership under D-03 and private API authentication under D-13 can wait
until those integrations are needed. D-01–D-02, D-04–D-05, D-07–D-12,
D-14–D-16, and D-18–D-19 remain pending in the register until their respective
pricing, inventory, analytics, messaging, quotation, image, ERP, import/export,
UI acceptance, or production work. D-06's detailed permission matrix, MFA handling, and recovery procedure will
be documented during admin module implementation. These details do not block
unrelated foundation work.
