CREATE TYPE "public"."commission_status" AS ENUM('pending', 'earned', 'approved', 'paid', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('unassigned', 'available', 'assigned', 'accepted', 'picked_up', 'on_the_way', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_issue_status" AS ENUM('open', 'in_review', 'resolved', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_issue_type" AS ENUM('restaurant_rejection', 'payment_exception', 'delivery_exception', 'customer_complaint');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending_payment', 'paid', 'awaiting_restaurant', 'restaurant_accepted', 'restaurant_rejected', 'admin_review', 'preparing', 'ready_for_pickup', 'on_the_way', 'delivered', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('bank_transfer', 'card', 'bank', 'ussd', 'wallet');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'submitted', 'verified', 'failed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payout_request_status" AS ENUM('pending', 'under_review', 'approved', 'rejected', 'processing', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'processing', 'paid', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payout_type" AS ENUM('restaurant_earnings', 'rider_earnings', 'agent_commissions');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('attributed', 'qualified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."restaurant_earning_status" AS ENUM('pending', 'available', 'held', 'requested', 'paid', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."restaurant_membership_role" AS ENUM('owner', 'manager', 'operator');--> statement-breakpoint
CREATE TYPE "public"."restaurant_membership_status" AS ENUM('invited', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."restaurant_order_decision" AS ENUM('accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."restaurant_status" AS ENUM('draft', 'active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."rider_availability_status" AS ENUM('offline', 'available', 'busy', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."sales_agent_status" AS ENUM('pending', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."staff_onboarding_status" AS ENUM('invited', 'pending', 'active', 'rejected', 'suspended');--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"summary" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"service_area_id" uuid NOT NULL,
	"label" text NOT NULL,
	"street_address" text NOT NULL,
	"landmark" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "combo_items" (
	"combo_id" uuid NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"is_optional" boolean DEFAULT false NOT NULL,
	CONSTRAINT "combo_items_combo_id_menu_item_id_pk" PRIMARY KEY("combo_id","menu_item_id")
);
--> statement-breakpoint
CREATE TABLE "combos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_amount" bigint NOT NULL,
	"image_url" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_agent_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"referral_id" uuid NOT NULL,
	"rate_bps" integer NOT NULL,
	"eligible_amount" bigint NOT NULL,
	"commission_amount" bigint NOT NULL,
	"status" "commission_status" DEFAULT 'pending' NOT NULL,
	"earned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"rider_id" uuid,
	"service_area_id" uuid NOT NULL,
	"status" "delivery_status" DEFAULT 'unassigned' NOT NULL,
	"delivery_fee_amount" bigint DEFAULT 0 NOT NULL,
	"rider_earning_amount" bigint DEFAULT 0 NOT NULL,
	"assigned_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"picked_up_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"status" "delivery_status" NOT NULL,
	"actor_user_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_amount" bigint NOT NULL,
	"image_url" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"type" "order_issue_type" NOT NULL,
	"status" "order_issue_status" DEFAULT 'open' NOT NULL,
	"raised_by_user_id" uuid,
	"assigned_admin_id" uuid,
	"reason" text NOT NULL,
	"resolution" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"menu_item_id" uuid,
	"item_name" text NOT NULL,
	"unit_price_amount" bigint DEFAULT 0 NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_amount" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"menu_item_id" uuid,
	"combo_id" uuid,
	"item_name" text NOT NULL,
	"unit_price_amount" bigint NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_exactly_one_catalog_reference_check" CHECK (("order_items"."menu_item_id" is not null and "order_items"."combo_id" is null) or ("order_items"."menu_item_id" is null and "order_items"."combo_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "order_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" "order_status" NOT NULL,
	"actor_user_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"address_id" uuid,
	"delivery_recipient_name" text NOT NULL,
	"delivery_phone" text NOT NULL,
	"delivery_street_address" text NOT NULL,
	"delivery_service_area" text NOT NULL,
	"delivery_landmark" text,
	"status" "order_status" DEFAULT 'pending_payment' NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"subtotal_amount" bigint NOT NULL,
	"delivery_fee_amount" bigint DEFAULT 0 NOT NULL,
	"discount_amount" bigint DEFAULT 0 NOT NULL,
	"total_amount" bigint NOT NULL,
	"customer_note" text,
	"placed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"provider" text,
	"provider_reference" text,
	"customer_reference" text,
	"amount" bigint NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"restaurant_id" uuid,
	"bank_code" text NOT NULL,
	"account_name" text NOT NULL,
	"account_number_encrypted" text NOT NULL,
	"account_number_last4" text NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"collected_by_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payout_accounts_exactly_one_owner_check" CHECK (("payout_accounts"."user_id" is not null and "payout_accounts"."restaurant_id" is null) or ("payout_accounts"."user_id" is null and "payout_accounts"."restaurant_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "payout_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_id" uuid NOT NULL,
	"restaurant_earning_id" uuid,
	"delivery_id" uuid,
	"commission_id" uuid,
	"amount" bigint NOT NULL,
	CONSTRAINT "payout_items_exactly_one_source_check" CHECK ((case when "payout_items"."restaurant_earning_id" is not null then 1 else 0 end + case when "payout_items"."delivery_id" is not null then 1 else 0 end + case when "payout_items"."commission_id" is not null then 1 else 0 end) = 1)
);
--> statement-breakpoint
CREATE TABLE "payout_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"user_id" uuid,
	"restaurant_id" uuid,
	"type" "payout_type" NOT NULL,
	"payout_account_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"status" "payout_request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_admin_id" uuid,
	"admin_note" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payout_requests_exactly_one_beneficiary_check" CHECK (("payout_requests"."user_id" is not null and "payout_requests"."restaurant_id" is null) or ("payout_requests"."user_id" is null and "payout_requests"."restaurant_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_request_id" uuid NOT NULL,
	"user_id" uuid,
	"restaurant_id" uuid,
	"type" "payout_type" NOT NULL,
	"amount" bigint NOT NULL,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"reference" text,
	"processed_by_admin_id" uuid,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payouts_exactly_one_beneficiary_check" CHECK (("payouts"."user_id" is not null and "payouts"."restaurant_id" is null) or ("payouts"."user_id" is null and "payouts"."restaurant_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_agent_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"referral_code" text NOT NULL,
	"attributed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_eligible_order_id" uuid,
	"status" "referral_status" DEFAULT 'attributed' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_earnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"gross_amount" bigint NOT NULL,
	"platform_fee_amount" bigint DEFAULT 0 NOT NULL,
	"net_amount" bigint NOT NULL,
	"status" "restaurant_earning_status" DEFAULT 'pending' NOT NULL,
	"available_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_members" (
	"restaurant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"membership_role" "restaurant_membership_role" NOT NULL,
	"status" "restaurant_membership_status" DEFAULT 'invited' NOT NULL,
	"created_by_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_members_restaurant_id_user_id_pk" PRIMARY KEY("restaurant_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "restaurant_order_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"decided_by_user_id" uuid NOT NULL,
	"decision" "restaurant_order_decision" NOT NULL,
	"rejection_reason_code" text,
	"rejection_note" text,
	"decided_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_order_decisions_rejection_reason_check" CHECK ("restaurant_order_decisions"."decision" = 'accepted' or "restaurant_order_decisions"."rejection_reason_code" is not null)
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"phone" text,
	"service_area_id" uuid NOT NULL,
	"street_address" text NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"minimum_order_amount" bigint DEFAULT 0 NOT NULL,
	"preparation_min_minutes" integer,
	"preparation_max_minutes" integer,
	"image_url" text,
	"status" "restaurant_status" DEFAULT 'draft' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"onboarded_by_admin_id" uuid,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_range_check" CHECK ("reviews"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "rider_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"rider_code" text NOT NULL,
	"service_area_id" uuid NOT NULL,
	"availability_status" "rider_availability_status" DEFAULT 'offline' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_agent_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"agent_code" text NOT NULL,
	"referral_code" text NOT NULL,
	"status" "sales_agent_status" DEFAULT 'pending' NOT NULL,
	"tier" text DEFAULT 'standard' NOT NULL,
	"commission_rate_bps" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_onboarding_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"status" "staff_onboarding_status" DEFAULT 'invited' NOT NULL,
	"onboarded_by_admin_id" uuid,
	"notes" text,
	"invited_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_onboarding_records_operational_role_check" CHECK ("staff_onboarding_records"."role" in ('rider', 'sales_agent', 'restaurant', 'admin'))
);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_service_area_id_service_areas_id_fk" FOREIGN KEY ("service_area_id") REFERENCES "public"."service_areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_combo_id_combos_id_fk" FOREIGN KEY ("combo_id") REFERENCES "public"."combos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combos" ADD CONSTRAINT "combos_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_sales_agent_id_users_id_fk" FOREIGN KEY ("sales_agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_rider_id_users_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_service_area_id_service_areas_id_fk" FOREIGN KEY ("service_area_id") REFERENCES "public"."service_areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_status_events" ADD CONSTRAINT "delivery_status_events_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_status_events" ADD CONSTRAINT "delivery_status_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_issues" ADD CONSTRAINT "order_issues_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_issues" ADD CONSTRAINT "order_issues_raised_by_user_id_users_id_fk" FOREIGN KEY ("raised_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_issues" ADD CONSTRAINT "order_issues_assigned_admin_id_users_id_fk" FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_components" ADD CONSTRAINT "order_item_components_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_components" ADD CONSTRAINT "order_item_components_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_combo_id_combos_id_fk" FOREIGN KEY ("combo_id") REFERENCES "public"."combos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_accounts" ADD CONSTRAINT "payout_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_accounts" ADD CONSTRAINT "payout_accounts_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_accounts" ADD CONSTRAINT "payout_accounts_collected_by_admin_id_users_id_fk" FOREIGN KEY ("collected_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_payout_id_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."payouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_restaurant_earning_id_restaurant_earnings_id_fk" FOREIGN KEY ("restaurant_earning_id") REFERENCES "public"."restaurant_earnings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_payout_account_id_payout_accounts_id_fk" FOREIGN KEY ("payout_account_id") REFERENCES "public"."payout_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_reviewed_by_admin_id_users_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_payout_request_id_payout_requests_id_fk" FOREIGN KEY ("payout_request_id") REFERENCES "public"."payout_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_processed_by_admin_id_users_id_fk" FOREIGN KEY ("processed_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_sales_agent_id_users_id_fk" FOREIGN KEY ("sales_agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_first_eligible_order_id_orders_id_fk" FOREIGN KEY ("first_eligible_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_earnings" ADD CONSTRAINT "restaurant_earnings_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_earnings" ADD CONSTRAINT "restaurant_earnings_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_members" ADD CONSTRAINT "restaurant_members_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_members" ADD CONSTRAINT "restaurant_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_members" ADD CONSTRAINT "restaurant_members_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_order_decisions" ADD CONSTRAINT "restaurant_order_decisions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_order_decisions" ADD CONSTRAINT "restaurant_order_decisions_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_order_decisions" ADD CONSTRAINT "restaurant_order_decisions_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_service_area_id_service_areas_id_fk" FOREIGN KEY ("service_area_id") REFERENCES "public"."service_areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_onboarded_by_admin_id_users_id_fk" FOREIGN KEY ("onboarded_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_profiles" ADD CONSTRAINT "rider_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_profiles" ADD CONSTRAINT "rider_profiles_service_area_id_service_areas_id_fk" FOREIGN KEY ("service_area_id") REFERENCES "public"."service_areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_agent_profiles" ADD CONSTRAINT "sales_agent_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_onboarding_records" ADD CONSTRAINT "staff_onboarding_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_onboarding_records" ADD CONSTRAINT "staff_onboarding_records_onboarded_by_admin_id_users_id_fk" FOREIGN KEY ("onboarded_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_events_created_at_index" ON "activity_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "activity_events_entity_index" ON "activity_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "addresses_user_id_index" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "addresses_service_area_id_index" ON "addresses" USING btree ("service_area_id");--> statement-breakpoint
CREATE UNIQUE INDEX "addresses_one_default_per_user_unique" ON "addresses" USING btree ("user_id") WHERE "addresses"."is_default" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "combos_restaurant_id_slug_unique" ON "combos" USING btree ("restaurant_id","slug");--> statement-breakpoint
CREATE INDEX "combos_restaurant_id_index" ON "combos" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "combos_is_featured_index" ON "combos" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "combos_is_available_index" ON "combos" USING btree ("is_available");--> statement-breakpoint
CREATE UNIQUE INDEX "commissions_sales_agent_id_order_id_unique" ON "commissions" USING btree ("sales_agent_id","order_id");--> statement-breakpoint
CREATE INDEX "commissions_status_index" ON "commissions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "deliveries_order_id_unique" ON "deliveries" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "deliveries_rider_id_index" ON "deliveries" USING btree ("rider_id");--> statement-breakpoint
CREATE INDEX "deliveries_service_area_id_index" ON "deliveries" USING btree ("service_area_id");--> statement-breakpoint
CREATE INDEX "deliveries_status_index" ON "deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "delivery_status_events_delivery_id_index" ON "delivery_status_events" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "menu_items_restaurant_id_index" ON "menu_items" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "menu_items_is_available_index" ON "menu_items" USING btree ("is_available");--> statement-breakpoint
CREATE INDEX "notifications_user_id_index" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_read_at_index" ON "notifications" USING btree ("read_at");--> statement-breakpoint
CREATE INDEX "order_issues_order_id_index" ON "order_issues" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_issues_status_index" ON "order_issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_item_components_order_item_id_index" ON "order_item_components" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "order_items_order_id_index" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_status_events_order_id_index" ON "order_status_events" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_number_unique" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "orders_customer_id_index" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_restaurant_id_index" ON "orders" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "orders_status_index" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_order_id_index" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_reference_unique" ON "payments" USING btree ("provider_reference");--> statement-breakpoint
CREATE INDEX "payments_status_index" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payout_accounts_user_id_index" ON "payout_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payout_accounts_restaurant_id_index" ON "payout_accounts" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "payout_items_payout_id_index" ON "payout_items" USING btree ("payout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payout_items_restaurant_earning_id_unique" ON "payout_items" USING btree ("restaurant_earning_id") WHERE "payout_items"."restaurant_earning_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "payout_items_delivery_id_unique" ON "payout_items" USING btree ("delivery_id") WHERE "payout_items"."delivery_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "payout_items_commission_id_unique" ON "payout_items" USING btree ("commission_id") WHERE "payout_items"."commission_id" is not null;--> statement-breakpoint
CREATE INDEX "payout_requests_requested_by_user_id_index" ON "payout_requests" USING btree ("requested_by_user_id");--> statement-breakpoint
CREATE INDEX "payout_requests_status_index" ON "payout_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "payouts_payout_request_id_unique" ON "payouts" USING btree ("payout_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payouts_reference_unique" ON "payouts" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "payouts_status_index" ON "payouts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_customer_id_unique" ON "referrals" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "referrals_sales_agent_id_index" ON "referrals" USING btree ("sales_agent_id");--> statement-breakpoint
CREATE INDEX "referrals_referral_code_index" ON "referrals" USING btree ("referral_code");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurant_earnings_order_id_unique" ON "restaurant_earnings" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "restaurant_earnings_restaurant_id_index" ON "restaurant_earnings" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "restaurant_earnings_status_index" ON "restaurant_earnings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "restaurant_members_user_id_index" ON "restaurant_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "restaurant_members_status_index" ON "restaurant_members" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurant_order_decisions_order_id_unique" ON "restaurant_order_decisions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "restaurant_order_decisions_restaurant_id_index" ON "restaurant_order_decisions" USING btree ("restaurant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurants_slug_unique" ON "restaurants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "restaurants_service_area_id_index" ON "restaurants" USING btree ("service_area_id");--> statement-breakpoint
CREATE INDEX "restaurants_status_index" ON "restaurants" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_order_id_unique" ON "reviews" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "reviews_restaurant_id_index" ON "reviews" USING btree ("restaurant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rider_profiles_rider_code_unique" ON "rider_profiles" USING btree ("rider_code");--> statement-breakpoint
CREATE INDEX "rider_profiles_service_area_id_index" ON "rider_profiles" USING btree ("service_area_id");--> statement-breakpoint
CREATE INDEX "rider_profiles_availability_status_index" ON "rider_profiles" USING btree ("availability_status");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_agent_profiles_agent_code_unique" ON "sales_agent_profiles" USING btree ("agent_code");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_agent_profiles_referral_code_unique" ON "sales_agent_profiles" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "sales_agent_profiles_status_index" ON "sales_agent_profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "staff_onboarding_records_user_id_index" ON "staff_onboarding_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "staff_onboarding_records_status_index" ON "staff_onboarding_records" USING btree ("status");