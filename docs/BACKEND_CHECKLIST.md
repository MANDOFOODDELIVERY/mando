# Backend Checklist

## Recommended Stack

- [ ] Use TypeScript for the backend so the app keeps one language across frontend, API routes, validation, and shared types.
- [ ] Keep frontend and backend in this repo as a monorepo so the work stays tied to the existing UI.
- [ ] Keep the current Next.js app as the frontend app.
- [x] Add a dedicated backend app in the same repo at `apps/api`, using Fastify.
- [x] Use PostgreSQL as the primary database.
- [x] Use a provider-flexible setup for Postgres so development can start on free resources and production can move to Neon paid, RDS, Cloud SQL, or another managed Postgres without rewriting the app.
- [x] Use Drizzle ORM for database schema, migrations, and typed queries.
- [ ] Keep shared types and validation schemas in a shared package, likely `packages/shared`.
- [x] Use custom backend-owned auth/session logic or an auth library that stores state in Postgres.
- [ ] Use Next.js Route Handlers only as a light frontend-facing proxy if needed, not as the core business backend.

## Workspace Structure

- [x] Convert the repo into a workspace/monorepo if needed.
- [ ] Move or keep the existing frontend as `apps/web`, or leave it at the root until the backend scaffold is stable.
- [x] Create `apps/api` for the Fastify backend service.
- [ ] Create `packages/shared` for DTOs, Zod schemas, enums, and shared TypeScript types.
- [ ] Create `packages/database` if the ORM client/schema should be shared cleanly.
- [x] Add root scripts for running, linting, and building the frontend and backend.
- [x] Add root scripts for database migrations and tests once those tools are installed.
- [x] Add separate environment examples for web and API.

## Product Decisions

- [x] Define MVP roles and permissions: customer, rider, sales agent, restaurant, and admin.
- [x] Use admin-managed restaurant menus and combos while giving onboarded restaurant users order and payout access.
- [x] Make restaurant and admin dashboards part of the MVP even though their frontend designs are still pending.
- [x] Keep each cart and order limited to one restaurant.
- [ ] Decide which payments provider to integrate first.
- [x] Start the MVP with rider and order status updates; defer live GPS tracking.
- [x] Keep verification and password-reset tokens backend-owned; choose the email delivery provider later.
- [x] Document the product decisions and model in `docs/PRODUCT_ROLES_AND_DATA_MODEL.md`.

## Data Model

- [x] Define the core entities, relationships, statuses, and data ownership rules.
- [x] Create `users`, `user_roles`, `auth_sessions`, and `verification_tokens`.
- [x] Create `profiles` linked to auth users.
- [x] Create `service_areas`.
- [x] Create `addresses` for customer delivery locations.
- [x] Create `staff_onboarding_records`.
- [x] Create `rider_profiles`, `sales_agent_profiles`, and `restaurant_members`.
- [x] Create encrypted `payout_accounts`.
- [x] Create `restaurants`.
- [x] Create `menu_items`.
- [x] Create `combos`.
- [x] Create `combo_items` if combos are composed from menu items.
- [x] Keep the cart client-side for MVP and validate it on the server at checkout.
- [x] Create `orders`.
- [x] Create `order_items`.
- [x] Create `order_item_components` for combo/custom meal selections.
- [x] Create `order_status_events`.
- [x] Create `restaurant_order_decisions` and `order_issues`.
- [x] Create `payments`.
- [x] Create `deliveries` and `delivery_status_events`.
- [x] Create `notifications`.
- [x] Create `activity_events` for the admin live-activity view.
- [x] Create `referrals` and `commissions`.
- [x] Create `restaurant_earnings`.
- [x] Create `payout_requests`.
- [x] Create `payouts` and `payout_items`.
- [x] Create `reviews`.
- [x] Add timestamps, status enums, and soft-delete/archive fields where needed.

## API Surface

- [x] Add and locally verify an API health endpoint.
- [x] Auth: signup.
- [x] Auth: login.
- [ ] Auth: logout.
- [ ] Auth: password reset request.
- [ ] Auth: OTP/verification handling.
- [ ] Customer: profile read/update.
- [ ] Customer: addresses read/create/update/delete.
- [ ] Catalog: restaurants list/detail.
- [ ] Catalog: featured combos list/detail.
- [ ] Cart: validate cart before checkout.
- [ ] Orders: create order.
- [ ] Orders: order history/detail.
- [ ] Orders: status timeline.
- [ ] Payments: initialize payment.
- [ ] Payments: verify payment/webhook.
- [ ] Rider: available/assigned deliveries.
- [ ] Rider: update delivery status.
- [ ] Sales agent: dashboard metrics.
- [ ] Sales agent: referral creation/listing.
- [ ] Restaurant: incoming orders list/detail.
- [ ] Restaurant: accept or reject an order with a required reason.
- [ ] Restaurant: earnings balance and history.
- [ ] Restaurant: create and track payout requests.
- [ ] Admin: onboard and manage riders, sales agents, restaurants, and admins.
- [ ] Admin: manage restaurants, menus, combos, and service areas.
- [ ] Admin: rejected-order issue queue and resolution.
- [ ] Admin: review and process restaurant, rider, and sales-agent payouts.
- [ ] Admin: live activity feed and operational dashboard metrics.
- [ ] Notifications: list and mark as read.

## Security

- [ ] Validate every mutation on the server.
- [ ] Add schema validation for request bodies and form submissions.
- [ ] Store secrets only in environment variables.
- [ ] Never expose database credentials or private auth secrets to client components.
- [ ] Keep all privileged database access inside the backend service.
- [ ] Add authorization checks for customer-owned data.
- [ ] Add authorization checks for rider-assigned delivery data.
- [ ] Add authorization checks for sales-agent referral data.
- [ ] Add authorization checks for restaurant membership and restaurant-owned order data.
- [ ] Add admin-only authorization for catalog and operational data.
- [ ] Prevent duplicate payout requests by reserving eligible earnings transactionally.
- [ ] Encrypt payout account numbers and expose only masked values.
- [ ] Add rate limiting or provider-side abuse protections for auth-heavy endpoints.

## Frontend Integration

- [x] Replace login TODO with real auth call.
- [x] Replace signup TODO with real auth call.
- [ ] Replace forgot-password flow with real provider flow.
- [ ] Replace static restaurant arrays with API/database data.
- [ ] Replace static combo arrays with API/database data.
- [ ] Replace local/profile placeholder data with authenticated profile data.
- [ ] Wire customer cart checkout to backend order creation.
- [ ] Wire payment success/failure pages to real payment verification.
- [ ] Wire rider dashboard to assigned deliveries.
- [ ] Wire sales-agent dashboard to referral/order metrics.
- [ ] Design and build the restaurant dashboard.
- [ ] Wire restaurant order decisions, earnings, and payout requests.
- [ ] Design and build the admin dashboard.
- [ ] Wire admin onboarding, rejected-order handling, payouts, and live activity.
- [ ] Add loading, empty, and error states for each data-backed page.

## Deployment

- [x] Create frontend and backend `.env.example` files with required variable names only.
- [x] Configure local Postgres or a free managed Postgres database for development.
- [x] Configure API `DATABASE_URL`.
- [x] Configure API auth/session secrets locally in `apps/api/.env`.
- [x] Configure frontend API base URL.
- [ ] Configure production environment variables on the deployment host.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Smoke test auth, catalog, checkout, rider, sales-agent, restaurant, and admin flows.

## Nice To Have Later

- [ ] Realtime order status updates.
- [ ] Background jobs for notifications and cleanup.
- [ ] Analytics for conversion, order volume, and delivery performance.
- [ ] Database seed script for demo restaurants, menus, combos, and users.

