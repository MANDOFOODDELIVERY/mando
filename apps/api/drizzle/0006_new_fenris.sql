CREATE TYPE "public"."vendor_document_status" AS ENUM('pending', 'uploaded', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."vendor_document_type" AS ENUM('cac_certificate', 'food_handler_certificate', 'tax_identification', 'health_safety_permit');--> statement-breakpoint
CREATE TABLE "admin_payout_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settings_key" text DEFAULT 'default' NOT NULL,
	"frequency" text DEFAULT 'Weekly' NOT NULL,
	"payout_time" text DEFAULT '17:00' NOT NULL,
	"minimum_withdrawal" bigint DEFAULT 5000 NOT NULL,
	"auto_process" boolean DEFAULT false NOT NULL,
	"auto_deduct_commission" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_operations" (
	"restaurant_id" uuid PRIMARY KEY NOT NULL,
	"opening_time" text,
	"closing_time" text,
	"open_days" text,
	"delivery_radius" text,
	"delivery_type" text,
	"website" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"type" "vendor_document_type" NOT NULL,
	"name" text NOT NULL,
	"file_url" text,
	"document_number" text,
	"status" "vendor_document_status" DEFAULT 'pending' NOT NULL,
	"uploaded_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "restaurant_operations" ADD CONSTRAINT "restaurant_operations_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_documents" ADD CONSTRAINT "vendor_documents_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_payout_settings_key_unique" ON "admin_payout_settings" USING btree ("settings_key");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_documents_restaurant_id_type_unique" ON "vendor_documents" USING btree ("restaurant_id","type");--> statement-breakpoint
CREATE INDEX "vendor_documents_restaurant_id_index" ON "vendor_documents" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "vendor_documents_status_index" ON "vendor_documents" USING btree ("status");
