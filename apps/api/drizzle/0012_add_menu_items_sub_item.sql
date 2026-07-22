ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "is_sub_item" boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "menu_items_is_sub_item_index" ON "menu_items" ("is_sub_item");