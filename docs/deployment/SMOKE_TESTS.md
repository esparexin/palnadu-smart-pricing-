# Palnadu Smart Pricing – Staging & Production Smoke Test Protocol

This document defines the mandatory smoke test protocol to verify system integrity following staging or production deployment.

---

## Smoke Test Verification Matrix

### Journey 1: Admin Authentication & Permission Boundaries

- **1.1 Login**: Authenticate with valid administrator credentials at `/admin/login`. Confirm successful session issuance and redirect to `/admin`.
- **1.2 Session Protection**: Access `/admin` in an unauthenticated window. Verify immediate redirect to `/admin/login` with no data leakage.
- **1.3 Role Boundaries**: Verify staff accounts without write permissions (e.g. `catalogue:read`) are blocked from product creation (HTTP 403 Forbidden).

### Journey 2: Catalogue Management (Products, Categories, Brands, Variants)

- **2.1 Product Creation**: Create a new test product with name, SKU, category, brand, and pricing tier. Confirm creation in admin product table.
- **2.2 Variant Creation**: Add variants with distinct attributes (size/color) and pricing modifiers. Verify calculation.
- **2.3 Publication Toggle**: Publish and unpublish product. Verify status badge updates accordingly.

### Journey 3: Multiple Product Image Upload & Delivery

- **3.1 Image Upload**: Upload image binary (PNG/JPEG) through admin media dialog. Verify upload succeeds and returns public image URL.
- **3.2 Image Rendering**: Verify image renders correctly on product detail page with correct aspect ratio and responsive srcset.
- **3.3 Image Reordering & Primary**: Set secondary image as primary. Verify primary badge reflects update.

### Journey 4: Public Catalogue Visibility & Hidden-Pricing Protection

- **4.1 Public Browsing**: Navigate to `/` and `/categories` as an unauthenticated guest. Verify published products render.
- **4.2 Zero Price Exposure**: Inspect network requests and DOM for public catalogue items. Verify `costPrice`, `marginPercent`, and administrative pricing are completely absent.
- **4.3 Unpublished Products Hidden**: Verify draft/archived products do not appear on public catalogue pages or search.

### Journey 5: Customer Enquiry & Quote Cart Submission

- **5.1 Add to Basket**: Add 2 different products to quote basket from product detail pages. Verify basket badge count increments.
- **5.2 Mobile CTA Check**: At mobile viewport (375px), verify exactly one persistent CTA appears without duplicate controls.
- **5.3 Submission**: Submit enquiry with customer name, email, phone, and delivery notes. Verify success confirmation screen and basket reset.
- **5.4 Idempotency / Safe Retry**: Resubmit or refresh; verify no duplicate enquiry record is created.

### Journey 6: Quotation Calculation & Document Generation

- **6.1 Quotation Listing**: Navigate to `/admin/quotations`. Verify newly submitted enquiry appears as a quotation draft.
- **6.2 Calculation & Pricing**: Apply unit pricing, tax, and discount. Confirm total matches formula ($Total = Subtotal + Tax - Discount$).
- **6.3 Document Snapshot**: Issue quotation. Verify snapshot locks pricing and company branding. Generate PDF/printable view.
- **6.4 Non-Sales Metric Integrity**: Verify admin dashboard metrics display only "Total Quotations/Estimates Issued" and "Total Quotation Value", with clear non-sales disclaimer.

### Journey 7: Responsive & Accessibility Validation

- **7.1 Touch Targets**: Verify all buttons, inputs, and interactive elements have minimum $44 \times 44$px touch targets.
- **7.2 Viewport Reflow**: Test at 320px, 360px, 375px, 390px, and 430px. Confirm zero horizontal overflow and readable text.
- **7.3 Keyboard Navigation**: Navigate through enquiry form and product filters using `Tab` and `Enter`. Confirm visible focus rings.

### Journey 8: Operational Probes & Database Migration Readiness

- **8.1 Liveness Probe**: Execute `curl -I https://api.<domain>/api/v1/health/live`. Confirm HTTP 200 OK.
- **8.2 Readiness Probe**: Execute `curl -I https://api.<domain>/api/v1/health/ready`. Confirm HTTP 200 OK and database health indicator.
- **8.3 Drizzle Migration Check**: Confirm all schema migrations are applied with `pnpm --filter @palnadu/persistence db:check`.
