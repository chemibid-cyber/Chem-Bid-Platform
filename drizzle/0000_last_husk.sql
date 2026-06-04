DO $$ BEGIN
 CREATE TYPE "public"."auction_stage" AS ENUM('stage1', 'stage2', 'closed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."auction_status" AS ENUM('draft', 'active', 'awaiting_decision', 'closed', 'unsuccessful', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."bid_status" AS ENUM('active', 'withdrawn', 'expired', 'won', 'lost');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."block_scope" AS ENUM('this_cas', 'all');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."cas_status" AS ENUM('found', 'not_found', 'ambiguous');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."deal_status" AS ENUM('confirmed', 'disputed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."dispute_status" AS ENUM('open', 'resolved');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."grade" AS ENUM('pure', 'distilled', 'trade');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."logistics_basis" AS ENUM('delivered', 'exworks');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."partner_status" AS ENUM('active', 'pending', 'declined');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_terms" AS ENUM('advance', 'net15', 'net30', 'net45', 'lc');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."privacy_mode" AS ENUM('all', 'registered');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."profile_type" AS ENUM('sales', 'purchase');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."seller_gate" AS ENUM('notified', 'accepted', 'ignored', 'blocked');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."share_status" AS ENUM('active', 'expired', 'withdrawn');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."stage2_action" AS ENUM('accept', 'reject', 'final');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."unit" AS ENUM('kg', 'mt', 'l');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_status" AS ENUM('invited', 'active', 'disabled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auctions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_company_id" uuid NOT NULL,
	"buyer_user_id" uuid NOT NULL,
	"cas_number" text,
	"name" text NOT NULL,
	"quantity" numeric NOT NULL,
	"unit" "unit" NOT NULL,
	"min_purity" numeric,
	"packing" text,
	"delivery_address" text NOT NULL,
	"logistics_basis" "logistics_basis" NOT NULL,
	"supplier_filter" text[] DEFAULT '{}' NOT NULL,
	"spec_file_url" text,
	"remarks" text,
	"privacy_mode" "privacy_mode" DEFAULT 'all' NOT NULL,
	"blind" boolean DEFAULT true NOT NULL,
	"status" "auction_status" DEFAULT 'draft' NOT NULL,
	"stage" "auction_stage" DEFAULT 'stage1' NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"extended_once" boolean DEFAULT false NOT NULL,
	"stage2_target" numeric,
	"stage2_closes_at" timestamp with time zone,
	"awaiting_since" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"snapshot_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"seller_company_id" uuid NOT NULL,
	"seller_user_id" uuid NOT NULL,
	"gate_state" "seller_gate" DEFAULT 'notified' NOT NULL,
	"stage1_basic" numeric,
	"stage1_freight" numeric,
	"stage1_total" numeric,
	"payment_terms" "payment_terms",
	"lead_time_days" integer,
	"coa_file_url" text,
	"coa_on_dispatch" boolean DEFAULT false NOT NULL,
	"stage2_rate" numeric,
	"stage2_action" "stage2_action",
	"status" "bid_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_seller_auction" UNIQUE("auction_id","seller_company_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_company_id" uuid NOT NULL,
	"blocked_company_id" uuid NOT NULL,
	"cas_number" text,
	"scope" "block_scope" DEFAULT 'this_cas' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cas_cache" (
	"cas_number" text PRIMARY KEY NOT NULL,
	"resolved_name" text,
	"cid" text,
	"status" "cas_status" NOT NULL,
	"candidates" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"profile_type" "profile_type" NOT NULL,
	"cas_number" text,
	"name" text NOT NULL,
	"name_verified" boolean DEFAULT false NOT NULL,
	"is_mixture" boolean DEFAULT false NOT NULL,
	"mixture_text" text,
	"roles" text[] DEFAULT '{}' NOT NULL,
	"grade" "grade" NOT NULL,
	"min_purity" numeric,
	"delisted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_cas_per_profile" UNIQUE("company_id","cas_number","profile_type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gstin" text NOT NULL,
	"pan" text NOT NULL,
	"legal_name" text NOT NULL,
	"registered_address" text NOT NULL,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"completion_score" integer DEFAULT 100 NOT NULL,
	"suspended" boolean DEFAULT false NOT NULL,
	"gst_last_refreshed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_gstin_unique" UNIQUE("gstin")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"bid_id" uuid NOT NULL,
	"buyer_company_id" uuid NOT NULL,
	"seller_company_id" uuid NOT NULL,
	"final_total" numeric NOT NULL,
	"payment_terms" "payment_terms",
	"lead_time_days" integer,
	"status" "deal_status" DEFAULT 'confirmed' NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"raised_by_user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"evidence_url" text,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"resolution_note" text,
	"resolved_by_operator_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "operators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operators_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "operators_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proactive_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_company_id" uuid NOT NULL,
	"seller_user_id" uuid NOT NULL,
	"cas_number" text,
	"name" text NOT NULL,
	"quantity" numeric NOT NULL,
	"unit" "unit" NOT NULL,
	"grade" "grade" NOT NULL,
	"min_purity" numeric,
	"basic_rate" numeric,
	"freight_rate" numeric,
	"packing" text,
	"spec_file_url" text,
	"privacy_mode" "privacy_mode" DEFAULT 'all' NOT NULL,
	"valid_until" timestamp with time zone,
	"status" "share_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registered_partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_company_id" uuid NOT NULL,
	"partner_gstin" text NOT NULL,
	"cas_number" text NOT NULL,
	"status" "partner_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_company_id" uuid NOT NULL,
	"reported_company_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"designation" text,
	"team" text,
	"can_buy" boolean DEFAULT false NOT NULL,
	"can_sell" boolean DEFAULT false NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"tnc_accepted_at" timestamp with time zone,
	"dpdp_consent_at" timestamp with time zone,
	"marketing_opt_out" boolean DEFAULT false NOT NULL,
	"deletion_requested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auctions" ADD CONSTRAINT "auctions_buyer_company_id_companies_id_fk" FOREIGN KEY ("buyer_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auctions" ADD CONSTRAINT "auctions_buyer_user_id_users_id_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bids" ADD CONSTRAINT "bids_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bids" ADD CONSTRAINT "bids_seller_company_id_companies_id_fk" FOREIGN KEY ("seller_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bids" ADD CONSTRAINT "bids_seller_user_id_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_company_id_companies_id_fk" FOREIGN KEY ("blocker_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_company_id_companies_id_fk" FOREIGN KEY ("blocked_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deals" ADD CONSTRAINT "deals_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deals" ADD CONSTRAINT "deals_bid_id_bids_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deals" ADD CONSTRAINT "deals_buyer_company_id_companies_id_fk" FOREIGN KEY ("buyer_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deals" ADD CONSTRAINT "deals_seller_company_id_companies_id_fk" FOREIGN KEY ("seller_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disputes" ADD CONSTRAINT "disputes_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disputes" ADD CONSTRAINT "disputes_raised_by_user_id_users_id_fk" FOREIGN KEY ("raised_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proactive_shares" ADD CONSTRAINT "proactive_shares_seller_company_id_companies_id_fk" FOREIGN KEY ("seller_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proactive_shares" ADD CONSTRAINT "proactive_shares_seller_user_id_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registered_partners" ADD CONSTRAINT "registered_partners_buyer_company_id_companies_id_fk" FOREIGN KEY ("buyer_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_company_id_companies_id_fk" FOREIGN KEY ("reporter_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_company_id_companies_id_fk" FOREIGN KEY ("reported_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auctions_buyer_idx" ON "auctions" USING btree ("buyer_company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auctions_status_idx" ON "auctions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auctions_closes_idx" ON "auctions" USING btree ("closes_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_actor_idx" ON "audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bids_auction_idx" ON "bids" USING btree ("auction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bids_seller_idx" ON "bids" USING btree ("seller_company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "catalog_company_idx" ON "catalog_items" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "catalog_cas_idx" ON "catalog_items" USING btree ("cas_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" USING btree ("user_id");