CREATE TYPE "combo_campaign_status" AS ENUM ('draft', 'scheduled', 'active', 'paused', 'expired');
CREATE TYPE "combo_campaign_event_type" AS ENUM ('viewed', 'clicked', 'shared');

CREATE TABLE "combo_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "combo_id" uuid NOT NULL,
  "flyer_url" text,
  "flyer_public_id" text,
  "content" text DEFAULT '' NOT NULL,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "status" "combo_campaign_status" DEFAULT 'draft' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "combo_campaign_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL,
  "combo_id" uuid NOT NULL,
  "sales_agent_id" uuid,
  "event_type" "combo_campaign_event_type" NOT NULL,
  "channel" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "combo_campaigns"
  ADD CONSTRAINT "combo_campaigns_combo_id_combos_id_fk"
  FOREIGN KEY ("combo_id") REFERENCES "public"."combos"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "combo_campaign_events"
  ADD CONSTRAINT "combo_campaign_events_campaign_id_combo_campaigns_id_fk"
  FOREIGN KEY ("campaign_id") REFERENCES "public"."combo_campaigns"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "combo_campaign_events"
  ADD CONSTRAINT "combo_campaign_events_combo_id_combos_id_fk"
  FOREIGN KEY ("combo_id") REFERENCES "public"."combos"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "combo_campaign_events"
  ADD CONSTRAINT "combo_campaign_events_sales_agent_id_users_id_fk"
  FOREIGN KEY ("sales_agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX "combo_campaigns_combo_id_index" ON "combo_campaigns" USING btree ("combo_id");
CREATE INDEX "combo_campaigns_status_index" ON "combo_campaigns" USING btree ("status");
CREATE INDEX "combo_campaigns_schedule_index" ON "combo_campaigns" USING btree ("starts_at","ends_at");
CREATE INDEX "combo_campaign_events_campaign_id_index" ON "combo_campaign_events" USING btree ("campaign_id");
CREATE INDEX "combo_campaign_events_combo_id_index" ON "combo_campaign_events" USING btree ("combo_id");
CREATE INDEX "combo_campaign_events_sales_agent_id_index" ON "combo_campaign_events" USING btree ("sales_agent_id");
CREATE INDEX "combo_campaign_events_type_index" ON "combo_campaign_events" USING btree ("event_type");