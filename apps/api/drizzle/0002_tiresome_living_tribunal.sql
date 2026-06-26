CREATE TABLE "service_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "service_areas_name_city_state_lower_unique" ON "service_areas" USING btree (lower("name"),lower("city"),lower("state"));--> statement-breakpoint
CREATE INDEX "service_areas_is_active_index" ON "service_areas" USING btree ("is_active");