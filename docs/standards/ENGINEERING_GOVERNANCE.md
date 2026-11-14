# ENGINEERING GOVERNANCE, SSOT, CODE QUALITY & UI/UX STANDARDS

These requirements are mandatory for the entire Palnadu.dev Smart Pricing repository, all packages, integrations, demonstration applications, APIs, database implementations, frontend components, admin interfaces and future releases.

Act as a senior engineering team. Do not sacrifice maintainability, security, correctness, accessibility or user experience for implementation speed.

---

# 1. SINGLE SOURCE OF TRUTH (SSOT)

Establish and enforce SSOT throughout the complete application.

## 1.1 Business logic SSOT

- Every business rule must have one authoritative implementation.
- Pricing calculations must exist in one central pricing engine.
- Discount calculations must not be duplicated in frontend, backend, admin or WhatsApp handlers.
- Quotation calculations must use the same authoritative service.
- Product recommendation ranking must use one centralized recommendation engine.
- Validation rules must be shared wherever technically possible.
- Frontend components must not independently implement backend business rules.
- WhatsApp handlers must call existing quotation services rather than implement their own calculations.

## 1.2 Data SSOT

- Define authoritative contracts for products, pricing, discounts, quotations and recommendations.
- Reuse existing product identifiers.
- Do not create duplicate product records for the pricing module.
- Do not maintain competing pricing records.
- Use a clearly defined source of truth for product availability.
- Define ownership and lifecycle of every database entity.
- Use shared contracts between frontend and backend.
- Prevent conflicting copies of business configuration.

## 1.3 Configuration SSOT

- Centralize validated module configuration.
- Do not hardcode client-specific values.
- Do not duplicate environment variable names or configuration defaults.
- Validate required configuration at application startup.
- Keep public configuration separate from server-only secrets.
- Document every environment variable.
- Avoid multiple competing configuration files.

## 1.4 API and contract SSOT

- Define shared request and response contracts.
- Use a single authoritative schema for each business entity.
- Avoid duplicate DTOs and validation schemas.
- Ensure frontend, backend and integration adapters follow the same contracts.
- Maintain API compatibility and documented versioning.

## 1.5 Documentation SSOT

Maintain authoritative documentation for:

- Architecture.
- Business rules.
- Data models.
- API contracts.
- Configuration.
- Integration adapters.
- UI/UX standards.
- Security requirements.
- Testing.
- Deployment.
- Version changes.

When implementation changes, update the relevant documentation in the same change.

Never allow documentation to describe functionality that does not exist.

---

# 2. ARCHITECTURE AND DESIGN GOVERNANCE

Follow modular architecture with clear dependency boundaries.

## 2.1 Dependency rules

The dependency direction must be:

- Core business logic is independent.
- Contracts define shared interfaces.
- Adapters implement external integrations.
- Applications compose the modules.
- UI components consume approved application interfaces.

The core must not depend on:

- React.
- Next.js.
- Fastify.
- MongoDB.
- PostgreSQL.
- Meta WhatsApp SDK.
- Browser-specific APIs.

External integrations must communicate through documented interfaces.

## 2.2 Separation of concerns

Every module must have one clear responsibility.

Separate:

- Domain models.
- Business services.
- Data access.
- API controllers.
- Request validation.
- Authentication.
- Authorization.
- External integrations.
- UI components.
- Presentation logic.

Do not place database queries inside frontend components or business calculations inside API controllers.

## 2.3 Dependency management

- Avoid circular dependencies.
- Avoid unnecessary abstractions.
- Avoid overengineering.
- Avoid creating packages without actual responsibility.
- Avoid multiple implementations of the same service.
- Use dependency injection where it provides meaningful isolation and testability.
- Keep package dependency boundaries explicit.
- Prefer small, cohesive modules.

---

# 3. STRICT CODE QUALITY STANDARDS

## 3.1 General rules

- Write production-quality TypeScript.
- Enable strict TypeScript settings.
- Avoid `any`.
- Avoid unsafe type assertions.
- Avoid non-null assertions without documented justification.
- Avoid unexplained type suppression.
- Avoid unused imports and variables.
- Avoid unreachable code.
- Avoid duplicate functions.
- Avoid duplicated conditions.
- Avoid magic numbers and unexplained string literals.
- Use named constants for meaningful business rules.
- Use explicit return types for important public functions.
- Handle errors explicitly.
- Use consistent naming conventions.
- Keep functions deterministic wherever possible.

## 3.2 Code line quality

Code must be readable, maintainable and easy to review.

Enforce these defaults:

- Maximum 100–120 characters per line.
- Maximum 40–50 lines per ordinary function, where practical.
- Maximum 300 lines per ordinary source file, where practical.
- Maximum 500 lines per complex file only with documented architectural justification.
- Avoid deeply nested conditional logic.
- Prefer early returns.
- Avoid deeply nested callbacks.
- Avoid large inline business calculations.
- Avoid excessively complex regular expressions.
- Avoid overly broad exception handling.
- Keep imports organized.
- Keep related functions together.
- Use meaningful variable and function names.

These are review thresholds, not excuses to split coherent code into unnecessary fragments.

A function or file exceeding the guideline must be reviewed for separation of responsibilities.

Do not split code merely to satisfy line counts if doing so reduces clarity.

## 3.3 Function quality

Every function must:

- Have a clear purpose.
- Have a meaningful name.
- Accept validated inputs.
- Produce predictable outputs.
- Handle expected failures.
- Avoid hidden side effects.
- Avoid unnecessary parameters.
- Avoid unrelated responsibilities.

## 3.4 Code duplication

Strictly prohibit:

- Copy-pasted business logic.
- Duplicate API handlers.
- Duplicate validation.
- Duplicate database operations.
- Duplicate frontend components.
- Duplicate formatting functions.
- Duplicate WhatsApp message builders.

Before creating a new implementation, search for existing functionality and assess whether it can be reused or extended.

## 3.5 Comments and code documentation

- Comments must explain why, not merely repeat what the code does.
- Avoid redundant comments.
- Document complex business rules.
- Document non-obvious calculations.
- Document public interfaces.
- Document important architectural decisions.
- Remove obsolete comments when implementation changes.
- Do not leave TODO or FIXME markers without an owner or tracked issue.

---

# 4. CODE COMPLEXITY AND MAINTAINABILITY

Enforce measurable quality checks.

Recommended initial thresholds:

- ESLint errors: zero.
- TypeScript errors: zero.
- Formatting violations: zero.
- Unused exports: zero where detectable.
- Circular dependencies: zero.
- Critical security vulnerabilities: zero.
- High security vulnerabilities: zero unresolved without documented risk acceptance.
- Unreachable code: zero.
- Unapproved suppressions: zero.
- Duplicate business logic: zero.

Use static analysis to identify:

- High cyclomatic complexity.
- Deep nesting.
- Large functions.
- Large files.
- Excessive dependencies.
- Unused exports.
- Circular dependencies.
- Dead code.
- Duplicate code.

Set an initial cyclomatic complexity target of 10 or less for ordinary business functions.

Exceptions require documented review rather than arbitrary code fragmentation.

---

# 5. FRONTEND UI/UX GOVERNANCE

Every public website integration must look and behave like a native feature of the client's existing website.

Do not force a generic Smart Pricing design onto every client.

## 5.1 Design system

- Audit the existing website's visual design before integration.
- Reuse existing typography.
- Reuse existing spacing conventions.
- Reuse existing button styles.
- Reuse existing colors and design tokens.
- Reuse existing responsive breakpoints.
- Reuse existing component patterns.
- Support client branding and logo.
- Avoid duplicate design systems.

If a client has no design system, establish one before implementing the UI.

## 5.2 Mobile-first design

Mobile must be designed and tested first.

Support:

- Small mobile screens.
- Standard mobile screens.
- Large mobile screens.
- Tablets.
- Laptops.
- Desktop displays.

Do not simply shrink the desktop interface.

Ensure:

- No horizontal overflow.
- No clipped content.
- No overlapping controls.
- No inaccessible navigation.
- No excessively small buttons.
- No unreadable text.
- No broken product cards.

## 5.3 Product catalogue UX

- Product cards must have consistent image ratios.
- Product images must use appropriate object-fit behavior.
- Product titles must remain readable.
- Product descriptions must not create inconsistent card heights.
- Product selection must be visually clear.
- Selected products must have a visible state.
- Quantity controls must be intuitive.
- Empty catalogue states must be meaningful.
- Loading and error states must be implemented.
- Search and filtering must provide useful feedback.

## 5.4 Multiple product selection UX

- Clearly show the number of selected products.
- Display a visible selection summary.
- Provide add and remove actions.
- Allow quantity changes.
- Prevent invalid quantities.
- Prevent duplicate product entries.
- Provide a clear-selection option.
- Preserve selections appropriately during navigation.
- Clearly indicate when a product is unavailable.
- Do not expose internal prices in the selection summary.

On mobile, use an accessible compact selection summary or bottom action area where appropriate.

Do not obstruct existing website navigation or content.

## 5.5 WhatsApp CTA UX

- Clearly label the action as Request Price on WhatsApp.
- Use an appropriate WhatsApp visual identity without misrepresenting official branding.
- Explain that WhatsApp will open.
- Clearly distinguish opening WhatsApp from submitting a request.
- Ensure the prefilled message is readable.
- Provide fallback contact information if WhatsApp cannot open.
- Never claim a request was submitted before the inbound message is verified.

## 5.6 Admin dashboard UX

- Use consistent navigation.
- Organize pricing and recommendations logically.
- Provide searchable product selection.
- Provide clear form labels.
- Show validation errors near relevant fields.
- Prevent accidental destructive actions.
- Confirm important changes.
- Provide useful empty states.
- Show saving, success and failure feedback.
- Support pagination for large datasets.
- Provide filters for quotation history.
- Make tables usable on smaller screens.
- Maintain accessible keyboard navigation.

## 5.7 Visual quality

Avoid:

- Unnecessary gradients.
- Excessive shadows.
- Random colors.
- Unnecessary animations.
- Inconsistent card spacing.
- Excessive whitespace.
- Tiny typography.
- Inconsistent icon styles.
- Decorative elements without functional value.
- Arbitrary layout changes to existing client pages.

Use animation only when it communicates a meaningful state or interaction.

Respect reduced-motion preferences.

## 5.8 Accessibility

Target WCAG 2.2 AA.

Enforce:

- Semantic HTML.
- Proper heading hierarchy.
- Accessible labels.
- Keyboard navigation.
- Visible focus states.
- Sufficient color contrast.
- Appropriate alternative text.
- Accessible dialogs and menus.
- Screen-reader-friendly status messages.
- Accessible form validation.
- Touch targets of approximately 44 × 44 CSS pixels where practical.

Never communicate important information through color alone.

---

# 6. PERFORMANCE GOVERNANCE

Build for real business websites and mobile networks.

Enforce:

- Optimized product images.
- Lazy loading where appropriate.
- Responsive image delivery.
- Minimal JavaScript.
- Code splitting.
- Avoid unnecessary client-side rendering.
- Efficient database queries.
- Appropriate indexes.
- Pagination.
- API response optimization.
- Caching only where data freshness and authorization permit.
- Avoid N+1 database queries.
- Avoid repeated API requests.
- Avoid unnecessary third-party scripts.

Set performance budgets and measure the actual demo.

Targets for the demo:

- Lighthouse Performance: 90 or above where practical.
- Lighthouse Accessibility: 95 or above.
- Lighthouse Best Practices: 95 or above.
- Lighthouse SEO: 90 or above.

Treat these as measurement targets, not guarantees. Document environmental factors and unresolved bottlenecks.

---

# 7. SECURITY AND PRIVACY GOVERNANCE

Security is mandatory for every client installation.

## 7.1 Pricing security

- Never expose MRP or offer prices in public APIs.
- Never expose prices through page source or frontend state.
- Never trust frontend-supplied prices.
- Perform calculations on the server.
- Validate active pricing before quotation generation.
- Protect administrative pricing operations.
- Maintain immutable quotation snapshots.

## 7.2 API security

- Validate all incoming requests.
- Apply authentication where required.
- Apply role-based authorization.
- Use rate limiting.
- Prevent unauthorized data access.
- Protect against injection.
- Prevent mass assignment.
- Use secure error handling.
- Validate request ownership.
- Prevent IDOR vulnerabilities.
- Configure CORS explicitly.

## 7.3 WhatsApp security

- Verify webhook signatures.
- Protect access tokens.
- Validate sender identity.
- Validate quotation references.
- Prevent replay and duplicate processing.
- Use idempotency.
- Protect webhook endpoints.
- Avoid exposing customer information in logs.
- Respect WhatsApp messaging policies.

## 7.4 Client isolation

Although this is not a SaaS platform, independent installations must remain isolated.

- Never share client credentials.
- Never share client product data.
- Never share customer data.
- Never expose one client's quotation to another.
- Keep client-specific configurations independent.
- Restrict package and deployment credentials appropriately.

## 7.5 Privacy

- Collect only required customer information.
- Avoid unnecessary retention of WhatsApp messages.
- Document data retention.
- Protect customer phone numbers.
- Restrict administrative access.
- Provide appropriate privacy disclosures.
- Follow applicable data protection requirements.

---

# 8. DATABASE AND DATA INTEGRITY GOVERNANCE

- Use documented database schemas.
- Enforce appropriate constraints.
- Define indexes based on query patterns.
- Prevent duplicate records.
- Validate foreign references.
- Use transactions where required.
- Preserve quotation history.
- Avoid destructive migrations.
- Document migration and rollback procedures.
- Use explicit database ownership boundaries.
- Handle concurrent pricing updates safely.
- Maintain consistent timestamps.
- Store currency and monetary values explicitly.
- Use decimal-safe calculations.

Do not silently change existing client product records.

Migrations must be reversible where practical and tested against representative data.

---

# 9. BUSINESS RULE GOVERNANCE

Document all business rules centrally.

Mandatory pricing rules:

- Fixed MRP and offer pricing for each client.
- Percentage and fixed-amount discounts.
- Discount cannot exceed MRP.
- Offer price cannot be negative.
- Invalid or expired offers must not be applied.
- Pricing calculations must be centralized.
- Quantity calculations must be accurate.
- Tax treatment must be configurable.
- Historical quotations must preserve original prices.
- New quotations must use current active approved prices.

Mandatory quotation rules:

- A quotation request is not the same as an issued quotation.
- WhatsApp must receive and verify the customer's request.
- Quotation IDs must be unique.
- Duplicate webhook events must not generate duplicate quotations.
- Customer identity must be validated.
- Quotations must have validity rules.
- Recommended products must remain separate from the original quotation.
- Additional products must require customer consent.

Mandatory recommendation rules:

- Recommendations must be configurable.
- Do not recommend the selected product itself.
- Avoid duplicate recommendations.
- Exclude unavailable products.
- Respect admin-defined priorities.
- Do not automatically add recommendations to the quotation.

---

# 10. ERROR HANDLING AND OBSERVABILITY

Implement:

- Consistent application error contracts.
- Structured logging.
- Appropriate log levels.
- Request correlation IDs.
- Webhook event tracking.
- WhatsApp delivery tracking.
- Database failure handling.
- Retry-safe processing.
- Monitoring of critical operations.
- Health checks.
- Useful diagnostic information.

Never expose internal stack traces, secrets or sensitive data to public users.

Do not silently swallow exceptions.

Every failure must have a meaningful handling strategy.

---

# 11. TESTING GOVERNANCE

Testing must verify actual business behavior.

## Unit tests

Cover:

- Percentage discounts.
- Fixed discounts.
- Decimal rounding.
- Invalid pricing.
- Offer expiry.
- Quantity calculations.
- Quotation totals.
- Recommendation ranking.
- Validation failures.

## Integration tests

Cover:

- Database persistence.
- API contracts.
- Authentication.
- Authorization.
- Pricing service integration.
- Quotation persistence.
- WhatsApp message processing.
- Webhook idempotency.
- Delivery status.
- Recommendation retrieval.

## E2E tests

Cover the complete customer journey:

1. Browse products.
2. Select multiple products.
3. Change quantities.
4. Verify public prices are hidden.
5. Create quotation request.
6. Open WhatsApp.
7. Send the request.
8. Process the incoming webhook.
9. Generate the quotation.
10. Deliver the quotation.
11. Display recommendations.
12. Request additional products.

## UI/UX tests

Test:

- Mobile layouts.
- Desktop layouts.
- Tablet layouts.
- Keyboard navigation.
- Accessibility.
- Empty states.
- Loading states.
- Validation errors.
- Network failures.
- Responsive tables.
- Product selection behavior.

Never claim a test passed without executing it.

---

# 12. CI/CD AND AUTOMATED CODE QUALITY

Implement GitHub Actions to validate every pull request.

Mandatory checks:

1. Dependency installation.
2. Lockfile consistency.
3. Formatting.
4. ESLint.
5. TypeScript type checking.
6. Unit tests.
7. Integration tests.
8. Build validation.
9. Dependency security scanning.
10. Secret scanning.
11. Circular dependency checks.
12. Architecture boundary checks.
13. Code complexity checks.
14. Test coverage reporting.

Use appropriate branch protection and pull request reviews.

Recommended initial coverage targets:

- Core business logic: 90% or higher.
- Critical pricing and quotation paths: 100% of defined business scenarios.
- Overall application: 80% or higher.

Coverage percentages must not replace meaningful assertions.

Do not introduce blanket exclusions to make CI pass.

Production deployments and package publishing must require explicit authorization.

---

# 13. GIT AND CHANGE MANAGEMENT

- Use meaningful branch names.
- Use small, focused commits.
- Follow Conventional Commits where practical.
- Never commit secrets.
- Never force-push protected branches.
- Never bypass required CI checks.
- Use pull requests.
- Document breaking changes.
- Preserve release history.
- Review dependency changes.
- Require approval for production deployment.

Before changing an existing module, inspect its dependencies and callers.

Never delete or replace existing code without dependency analysis.

---

# 14. DOCUMENTATION AND RELEASE GOVERNANCE

Maintain:

- README.
- Architecture documentation.
- Package documentation.
- API documentation.
- Data model documentation.
- Business rule documentation.
- UI/UX design guidelines.
- Security guidelines.
- Installation guides.
- Integration guides.
- Configuration references.
- Migration guides.
- Troubleshooting guides.
- Changelog.
- Release notes.

Every release must identify:

- Version.
- Changes.
- New features.
- Bug fixes.
- Breaking changes.
- Migration requirements.
- Compatibility.
- Known issues.

Never publish an incomplete or unverified package as stable.

---

# 15. AI CODING AGENT GOVERNANCE

All AI coding agents must follow these rules.

Before implementing a task:

1. Read the project instructions.
2. Inspect relevant existing code.
3. Identify existing reusable functionality.
4. Check SSOT boundaries.
5. Understand affected dependencies.
6. Prepare an implementation plan.
7. Identify testing requirements.

During implementation:

- Change only relevant files.
- Follow established patterns.
- Avoid duplicate implementations.
- Do not invent APIs or schemas.
- Do not generate unnecessary files.
- Do not bypass validation.
- Do not suppress errors to make builds pass.
- Do not claim completion without evidence.

After implementation:

1. Inspect the Git diff.
2. Run relevant tests.
3. Run type checking.
4. Run linting.
5. Run formatting checks.
6. Run build validation.
7. Review security implications.
8. Update documentation.
9. Report changed files.
10. Report actual validation results.

If requirements conflict with architecture or existing business rules, stop and report the conflict rather than silently choosing an implementation.

---

# 16. MANDATORY CODE REVIEW CHECKLIST

Every pull request must answer:

- Does this follow SSOT?
- Is business logic duplicated?
- Is an existing module reusable?
- Are contracts consistent?
- Are data boundaries respected?
- Are errors handled?
- Are security requirements met?
- Is mobile UI tested?
- Is accessibility considered?
- Are loading and empty states implemented?
- Are database operations safe?
- Are tests meaningful?
- Is documentation updated?
- Are unnecessary files introduced?
- Are any legacy implementations left behind?
- Is the Git diff limited to the intended scope?

Any critical failure blocks approval.

---

# 17. FINAL QUALITY GATES

The following must be satisfied before a stable release:

- Architecture approved.
- SSOT verified.
- TypeScript errors: zero.
- ESLint errors: zero.
- Formatting errors: zero.
- Critical business tests: passing.
- Security review: completed.
- Public pricing leakage: none.
- Duplicate quotation processing: prevented.
- Mobile and desktop UI: validated.
- Accessibility: reviewed.
- Database migrations: tested.
- API contracts: documented.
- Installation documentation: complete.
- Integration demonstration: successful.
- Release notes: prepared.

No quality gate may be marked complete without actual evidence.

---

# 18. ABSOLUTE PROHIBITIONS

The following are strictly prohibited:

- Dummy code.
- Placeholder implementations presented as complete.
- Hardcoded client-specific values.
- Duplicate business logic.
- Duplicate API routes.
- Duplicate database connections.
- Duplicate schemas.
- Dead code.
- Zombie code.
- Orphaned files.
- Unused components.
- Unnecessary abstractions.
- Unapproved dependencies.
- Unvalidated inputs.
- Insecure secrets.
- Public pricing leakage.
- Fake test results.
- Fake build results.
- Fake deployment results.
- Unnecessary UI redesigns.
- Arbitrary file deletion.
- Unapproved production changes.

Every implementation must have a documented purpose and an appropriate validation strategy.

FINAL GOVERNANCE PRINCIPLE:

Correctness first. Security second. Architecture and maintainability third. User experience and performance throughout. Implementation speed must never compromise these requirements.
