DO $$ BEGIN
 CREATE TYPE "public"."counter_proposal_status" AS ENUM('pending', 'accepted', 'rejected', 'withdrawn');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."freight_terms" AS ENUM('included', 'excluded', 'extra', 'buyer_pickup', 'seller_arranged');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "logistics_basis" ADD VALUE 'other';--> statement-breakpoint
ALTER TYPE "payment_terms" ADD VALUE 'immediate';--> statement-breakpoint
ALTER TYPE "payment_terms" ADD VALUE 'net7';--> statement-breakpoint
ALTER TYPE "payment_terms" ADD VALUE 'net60';--> statement-breakpoint
ALTER TYPE "payment_terms" ADD VALUE 'net90';--> statement-breakpoint
ALTER TYPE "payment_terms" ADD VALUE 'net120';--> statement-breakpoint
ALTER TYPE "payment_terms" ADD VALUE 'other';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "counter_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"bid_id" uuid NOT NULL,
	"seller_company_id" uuid NOT NULL,
	"proposed_quantity" numeric,
	"proposed_unit" "unit",
	"proposed_packing" text,
	"proposed_logistics_basis" "logistics_basis",
	"proposed_delivery_address" text,
	"proposed_offer_valid_until" timestamp with time zone,
	"proposed_supply_valid_until" timestamp with time zone,
	"note" text,
	"status" "counter_proposal_status" DEFAULT 'pending' NOT NULL,
	"buyer_response_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "auctions" ADD COLUMN "payment_terms" "payment_terms";--> statement-breakpoint
ALTER TABLE "auctions" ADD COLUMN "payment_terms_custom" text;--> statement-breakpoint
ALTER TABLE "auctions" ADD COLUMN "delivery_terms_custom" text;--> statement-breakpoint
ALTER TABLE "auctions" ADD COLUMN "freight_terms" "freight_terms";--> statement-breakpoint
ALTER TABLE "auctions" ADD COLUMN "offer_valid_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auctions" ADD COLUMN "supply_valid_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bids" ADD COLUMN "stage1_tax_pct" numeric;--> statement-breakpoint
ALTER TABLE "blocks" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "counter_proposals" ADD CONSTRAINT "counter_proposals_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "counter_proposals" ADD CONSTRAINT "counter_proposals_bid_id_bids_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "counter_proposals" ADD CONSTRAINT "counter_proposals_seller_company_id_companies_id_fk" FOREIGN KEY ("seller_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "counter_proposals_auction_idx" ON "counter_proposals" USING btree ("auction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "counter_proposals_seller_idx" ON "counter_proposals" USING btree ("seller_company_id");