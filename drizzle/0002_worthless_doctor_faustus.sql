DO $$ BEGIN
 CREATE TYPE "public"."packing_condition" AS ENUM('new', 'used', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."service_kind" AS ENUM('transport', 'packing');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."service_quote_status" AS ENUM('active', 'withdrawn', 'accepted', 'declined');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."service_request_status" AS ENUM('open', 'closed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_provider_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"contact_user_id" uuid NOT NULL,
	"is_transporter" boolean DEFAULT false NOT NULL,
	"vehicle_types" text[] DEFAULT '{}' NOT NULL,
	"is_packing_supplier" boolean DEFAULT false NOT NULL,
	"packing_types" text[] DEFAULT '{}' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_provider_profiles_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"provider_company_id" uuid NOT NULL,
	"provider_user_id" uuid NOT NULL,
	"base_rate" numeric NOT NULL,
	"tax_amount" numeric DEFAULT '0' NOT NULL,
	"total" numeric NOT NULL,
	"alt_payment_terms" text,
	"note" text,
	"status" "service_quote_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_provider_request" UNIQUE("request_id","provider_company_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "service_kind" NOT NULL,
	"needer_company_id" uuid NOT NULL,
	"needer_user_id" uuid NOT NULL,
	"status" "service_request_status" DEFAULT 'open' NOT NULL,
	"payment_terms" "payment_terms" NOT NULL,
	"description" text,
	"material_name" text,
	"total_qty_kg" numeric,
	"lot_qty_kg" numeric,
	"vehicle_types" text[] DEFAULT '{}' NOT NULL,
	"pickup_address" text,
	"drop_address" text,
	"packing_type" text,
	"condition" "packing_condition",
	"quantity_pieces" integer,
	"material_spec" text,
	"weight_per_piece" text,
	"logistics_basis" "logistics_basis",
	"accepted_quote_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bids" ADD COLUMN "stage1_tax" numeric;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_provider_profiles" ADD CONSTRAINT "service_provider_profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_provider_profiles" ADD CONSTRAINT "service_provider_profiles_contact_user_id_users_id_fk" FOREIGN KEY ("contact_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_quotes" ADD CONSTRAINT "service_quotes_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_quotes" ADD CONSTRAINT "service_quotes_provider_company_id_companies_id_fk" FOREIGN KEY ("provider_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_quotes" ADD CONSTRAINT "service_quotes_provider_user_id_users_id_fk" FOREIGN KEY ("provider_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_needer_company_id_companies_id_fk" FOREIGN KEY ("needer_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_needer_user_id_users_id_fk" FOREIGN KEY ("needer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_quotes_request_idx" ON "service_quotes" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_quotes_provider_idx" ON "service_quotes" USING btree ("provider_company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_requests_needer_idx" ON "service_requests" USING btree ("needer_company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_requests_status_kind_idx" ON "service_requests" USING btree ("status","kind");