CREATE TABLE "bot_buttons" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"is_web_app" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"track_id" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USDT' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"tx_hash" text,
	"pay_address" text,
	"pay_link" text,
	"qr_code" text,
	"expires_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deposits_track_id_unique" UNIQUE("track_id")
);
--> statement-breakpoint
CREATE TABLE "downloads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"token" text NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"max_downloads" integer DEFAULT 5 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_downloaded_at" timestamp with time zone,
	"generated_file_url" text,
	"generated_file_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "downloads_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "file_storage" (
	"id" serial PRIMARY KEY NOT NULL,
	"object_id" text NOT NULL,
	"data" text NOT NULL,
	"content_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_storage_object_id_unique" UNIQUE("object_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"telegram_id" text NOT NULL,
	"username" text,
	"first_name" text,
	"last_name" text,
	"photo_url" text,
	"balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"affiliate_code" text,
	"referred_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id"),
	CONSTRAINT "users_affiliate_code_unique" UNIQUE("affiliate_code")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"file_url" text,
	"file_name" text,
	"file_size" integer,
	"file_type" text,
	"category_id" integer,
	"tags" text[] DEFAULT '{}',
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_best_seller" boolean DEFAULT false NOT NULL,
	"is_new" boolean DEFAULT true NOT NULL,
	"download_limit" integer DEFAULT 5,
	"download_expiry" integer DEFAULT 7,
	"price_options" jsonb DEFAULT '[]'::jsonb,
	"stock" integer DEFAULT 0 NOT NULL,
	"stock_used" integer DEFAULT 0 NOT NULL,
	"total_sales" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"selected_option_label" text,
	"record_quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"promo_code" text,
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"affiliate_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"track_id" text,
	"invoice_id" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USDT' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"tx_hash" text,
	"pay_address" text,
	"pay_link" text,
	"qr_code" text,
	"expires_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_track_id_unique" UNIQUE("track_id"),
	CONSTRAINT "payments_invoice_id_unique" UNIQUE("invoice_id")
);
--> statement-breakpoint
CREATE TABLE "affiliates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"code" text NOT NULL,
	"total_referrals" integer DEFAULT 0 NOT NULL,
	"total_earnings" numeric(10, 2) DEFAULT '0' NOT NULL,
	"commission_rate" numeric(5, 2) DEFAULT '10' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliates_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "affiliates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"discount_type" text DEFAULT 'percent' NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"max_uses" integer,
	"current_uses" integer DEFAULT 0 NOT NULL,
	"min_order_amount" numeric(10, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "rubrique_countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"rubrique" text NOT NULL,
	"country" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_rubrique_country" UNIQUE("rubrique","country")
);
