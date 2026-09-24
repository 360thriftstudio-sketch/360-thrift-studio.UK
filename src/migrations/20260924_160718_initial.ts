import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_lots_division" AS ENUM('womens', 'mens', 'unisex');
  CREATE TYPE "public"."enum_lots_media_kind" AS ENUM('image', 'video');
  CREATE TYPE "public"."enum_lots_price_tiers_unit" AS ENUM('lot', 'kg', 'piece');
  CREATE TYPE "public"."enum_lots_badges" AS ENUM('new', 'best-seller', 'verified-era');
  CREATE TYPE "public"."enum_lots_lot_type" AS ENUM('single-brand', 'mixed-brand', 'bale-kg', 'shape-specific', 'on-request');
  CREATE TYPE "public"."enum_lots_grade" AS ENUM('cream', 'a', 'b', 'mixed');
  CREATE TYPE "public"."enum_lots_era" AS ENUM('verified-vintage', '1980s', '1990s', 'verified-y2k', 'y2k-style', 'modern');
  CREATE TYPE "public"."enum_lots_price_visibility" AS ENUM('public', 'trade-only', 'on-request');
  CREATE TYPE "public"."enum_lots_stock_status" AS ENUM('in-stock', 'low', 'arriving', 'reserved', 'sold');
  CREATE TYPE "public"."enum_lots_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "public"."enum_sections_menu_column" AS ENUM('1', '2');
  CREATE TYPE "public"."enum_brands_kind" AS ENUM('brand', 'stock-group', 'licence');
  CREATE TYPE "public"."enum_descriptors_kind" AS ENUM('descriptor', 'design-group');
  CREATE TYPE "public"."enum_quotes_status" AS ENUM('submitted', 'quoted', 'revised', 'accepted', 'invoiced', 'dispatched', 'expired', 'closed');
  CREATE TYPE "public"."enum_quotes_details_shipping_method" AS ENUM('collect', 'uk-courier', 'pallet', 'international');
  CREATE TYPE "public"."enum_quotes_details_payment_preference" AS ENUM('bank-transfer', 'card-link');
  CREATE TYPE "public"."enum_enquiries_type" AS ENUM('trade-account', 'luxury', 'contact', 'newsletter', 'warehouse-visit');
  CREATE TYPE "public"."enum_enquiries_status" AS ENUM('new', 'in-progress', 'done');
  CREATE TYPE "public"."enum_customers_trade_status" AS ENUM('none', 'pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum_price_lists_overrides_price_tiers_unit" AS ENUM('lot', 'kg', 'piece');
  CREATE TYPE "public"."enum_pages_group" AS ENUM('info', 'legal');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_reviews_source" AS ENUM('google', 'trustpilot', 'other');
  CREATE TYPE "public"."enum_reviews_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor');
  CREATE TABLE "lots_division" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_lots_division",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "lots_media" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"alt" varchar NOT NULL,
  	"kind" "enum_lots_media_kind" DEFAULT 'image'
  );
  
  CREATE TABLE "lots_brands" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"brand_id" integer NOT NULL,
  	"count" numeric
  );
  
  CREATE TABLE "lots_price_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"min_qty" numeric NOT NULL,
  	"max_qty" numeric,
  	"price" numeric,
  	"unit" "enum_lots_price_tiers_unit" DEFAULT 'lot' NOT NULL,
  	"quote_only" boolean
  );
  
  CREATE TABLE "lots_badges" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_lots_badges",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "lots" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"sku" varchar NOT NULL,
  	"lot_type" "enum_lots_lot_type" DEFAULT 'mixed-brand' NOT NULL,
  	"pieces" numeric,
  	"weight_kg" numeric,
  	"grade" "enum_lots_grade" NOT NULL,
  	"era" "enum_lots_era",
  	"description" jsonb,
  	"section_id" integer NOT NULL,
  	"brand_collection_id" integer,
  	"price_visibility" "enum_lots_price_visibility" DEFAULT 'public' NOT NULL,
  	"stock_lots_available" numeric DEFAULT 1 NOT NULL,
  	"stock_reserved" numeric DEFAULT 0,
  	"stock_status" "enum_lots_stock_status" DEFAULT 'in-stock' NOT NULL,
  	"stock_dispatch" varchar DEFAULT '24h dispatch',
  	"stock_moq" numeric DEFAULT 1,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_og_image_id" integer,
  	"slug" varchar NOT NULL,
  	"status" "enum_lots_status" DEFAULT 'draft' NOT NULL,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "lots_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"subcategories_id" integer,
  	"fashion_categories_id" integer,
  	"descriptors_id" integer,
  	"buyer_types_id" integer
  );
  
  CREATE TABLE "sections_subcategory_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "sections_brand_sets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"fashion_category_id" integer NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "sections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"intro" varchar,
  	"image_id" integer,
  	"menu_column" "enum_sections_menu_column" DEFAULT '1',
  	"seo_content" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_og_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sections_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"brands_id" integer
  );
  
  CREATE TABLE "subcategories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"section_id" integer NOT NULL,
  	"group" varchar,
  	"intro" varchar,
  	"image_id" integer,
  	"order" numeric DEFAULT 0,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_og_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "brands" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"kind" "enum_brands_kind" DEFAULT 'brand' NOT NULL,
  	"description" varchar,
  	"disclaimer" varchar,
  	"logo_svg_id" integer,
  	"logo_approved" boolean DEFAULT false,
  	"wordmark_only" boolean DEFAULT false,
  	"featured" boolean DEFAULT false,
  	"luxury_on_request" boolean DEFAULT false,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_og_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "brands_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"sections_id" integer,
  	"fashion_categories_id" integer
  );
  
  CREATE TABLE "brand_collections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"brand_id" integer NOT NULL,
  	"section_id" integer,
  	"tier" varchar,
  	"description" varchar,
  	"image_id" integer,
  	"order" numeric DEFAULT 0,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_og_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "brand_collections_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"buyer_types_id" integer
  );
  
  CREATE TABLE "fashion_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"image_id" integer,
  	"order" numeric DEFAULT 0,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_og_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "descriptors" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"term" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"kind" "enum_descriptors_kind" DEFAULT 'descriptor' NOT NULL,
  	"group" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "descriptors_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"sections_id" integer
  );
  
  CREATE TABLE "buyer_types" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "quotes_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"lot_id" integer NOT NULL,
  	"qty" numeric NOT NULL,
  	"title" varchar NOT NULL,
  	"sku" varchar NOT NULL,
  	"guide_subtotal_pence" numeric,
  	"quoted_subtotal_pence" numeric
  );
  
  CREATE TABLE "quotes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ref" varchar,
  	"status" "enum_quotes_status" DEFAULT 'submitted' NOT NULL,
  	"customer_id" integer,
  	"notes" varchar,
  	"details_company" varchar NOT NULL,
  	"details_contact_name" varchar NOT NULL,
  	"details_email" varchar NOT NULL,
  	"details_phone" varchar,
  	"details_vat_number" varchar,
  	"details_country" varchar NOT NULL,
  	"details_postcode" varchar,
  	"details_shipping_method" "enum_quotes_details_shipping_method",
  	"details_payment_preference" "enum_quotes_details_payment_preference",
  	"details_deadline" timestamp(3) with time zone,
  	"internal_notes" varchar,
  	"quote_pdf_id" integer,
  	"reserved_until" timestamp(3) with time zone,
  	"quoted_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "enquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum_enquiries_type" NOT NULL,
  	"status" "enum_enquiries_status" DEFAULT 'new',
  	"email" varchar NOT NULL,
  	"name" varchar,
  	"company" varchar,
  	"phone" varchar,
  	"country" varchar,
  	"message" varchar,
  	"fields" jsonb,
  	"customer_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "customers_addresses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"line1" varchar NOT NULL,
  	"line2" varchar,
  	"city" varchar NOT NULL,
  	"postcode" varchar NOT NULL,
  	"country" varchar NOT NULL
  );
  
  CREATE TABLE "customers_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "customers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"company" varchar NOT NULL,
  	"contact_name" varchar NOT NULL,
  	"phone" varchar,
  	"vat_number" varchar,
  	"company_number" varchar,
  	"country" varchar DEFAULT 'United Kingdom' NOT NULL,
  	"buyer_type_id" integer,
  	"trade_status" "enum_customers_trade_status" DEFAULT 'none',
  	"price_list_id" integer,
  	"internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "customers_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"lots_id" integer
  );
  
  CREATE TABLE "price_lists_overrides_price_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"min_qty" numeric NOT NULL,
  	"max_qty" numeric,
  	"price" numeric,
  	"unit" "enum_price_lists_overrides_price_tiers_unit" DEFAULT 'lot' NOT NULL,
  	"quote_only" boolean
  );
  
  CREATE TABLE "price_lists_overrides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"lot_id" integer NOT NULL
  );
  
  CREATE TABLE "price_lists" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"discount_percent" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pages_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"body" varchar
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"group" "enum_pages_group" DEFAULT 'info' NOT NULL,
  	"intro" varchar,
  	"content" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_og_image_id" integer,
  	"status" "enum_pages_status" DEFAULT 'draft' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"author" varchar NOT NULL,
  	"rating" numeric NOT NULL,
  	"body" varchar NOT NULL,
  	"source" "enum_reviews_source" NOT NULL,
  	"source_url" varchar NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"status" "enum_reviews_status" DEFAULT 'published' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"credit" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_large_url" varchar,
  	"sizes_large_width" numeric,
  	"sizes_large_height" numeric,
  	"sizes_large_mime_type" varchar,
  	"sizes_large_filesize" numeric,
  	"sizes_large_filename" varchar
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" "enum_users_role" DEFAULT 'editor' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"lots_id" integer,
  	"sections_id" integer,
  	"subcategories_id" integer,
  	"brands_id" integer,
  	"brand_collections_id" integer,
  	"fashion_categories_id" integer,
  	"descriptors_id" integer,
  	"buyer_types_id" integer,
  	"quotes_id" integer,
  	"enquiries_id" integer,
  	"customers_id" integer,
  	"price_lists_id" integer,
  	"pages_id" integer,
  	"reviews_id" integer,
  	"media_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"customers_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "settings_business_locations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"country" varchar NOT NULL,
  	"detail" varchar
  );
  
  CREATE TABLE "settings_trust" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"business_name" varchar DEFAULT '360° Thrift Studio',
  	"business_tagline" varchar DEFAULT 'Vintage · Premium · Wholesale',
  	"business_slogan" varchar DEFAULT 'Good clothes. Bigger stories.',
  	"show_brand_logos" boolean DEFAULT false,
  	"require_login_for_prices" boolean DEFAULT false,
  	"announcement_enabled" boolean DEFAULT true,
  	"announcement_text" varchar DEFAULT 'Restock live · 24h dispatch · UK & worldwide',
  	"announcement_link" varchar,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"contact_whatsapp" varchar,
  	"contact_address" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "lots_division" ADD CONSTRAINT "lots_division_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."lots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lots_media" ADD CONSTRAINT "lots_media_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lots_media" ADD CONSTRAINT "lots_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lots_brands" ADD CONSTRAINT "lots_brands_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lots_brands" ADD CONSTRAINT "lots_brands_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lots_price_tiers" ADD CONSTRAINT "lots_price_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lots_badges" ADD CONSTRAINT "lots_badges_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."lots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lots" ADD CONSTRAINT "lots_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lots" ADD CONSTRAINT "lots_brand_collection_id_brand_collections_id_fk" FOREIGN KEY ("brand_collection_id") REFERENCES "public"."brand_collections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lots" ADD CONSTRAINT "lots_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "lots_rels" ADD CONSTRAINT "lots_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."lots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lots_rels" ADD CONSTRAINT "lots_rels_subcategories_fk" FOREIGN KEY ("subcategories_id") REFERENCES "public"."subcategories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lots_rels" ADD CONSTRAINT "lots_rels_fashion_categories_fk" FOREIGN KEY ("fashion_categories_id") REFERENCES "public"."fashion_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lots_rels" ADD CONSTRAINT "lots_rels_descriptors_fk" FOREIGN KEY ("descriptors_id") REFERENCES "public"."descriptors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lots_rels" ADD CONSTRAINT "lots_rels_buyer_types_fk" FOREIGN KEY ("buyer_types_id") REFERENCES "public"."buyer_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sections_subcategory_groups" ADD CONSTRAINT "sections_subcategory_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sections_brand_sets" ADD CONSTRAINT "sections_brand_sets_fashion_category_id_fashion_categories_id_fk" FOREIGN KEY ("fashion_category_id") REFERENCES "public"."fashion_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sections_brand_sets" ADD CONSTRAINT "sections_brand_sets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sections" ADD CONSTRAINT "sections_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sections" ADD CONSTRAINT "sections_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sections_rels" ADD CONSTRAINT "sections_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sections_rels" ADD CONSTRAINT "sections_rels_brands_fk" FOREIGN KEY ("brands_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "brands" ADD CONSTRAINT "brands_logo_svg_id_media_id_fk" FOREIGN KEY ("logo_svg_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "brands" ADD CONSTRAINT "brands_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "brands_rels" ADD CONSTRAINT "brands_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "brands_rels" ADD CONSTRAINT "brands_rels_sections_fk" FOREIGN KEY ("sections_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "brands_rels" ADD CONSTRAINT "brands_rels_fashion_categories_fk" FOREIGN KEY ("fashion_categories_id") REFERENCES "public"."fashion_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "brand_collections" ADD CONSTRAINT "brand_collections_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "brand_collections" ADD CONSTRAINT "brand_collections_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "brand_collections" ADD CONSTRAINT "brand_collections_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "brand_collections" ADD CONSTRAINT "brand_collections_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "brand_collections_rels" ADD CONSTRAINT "brand_collections_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."brand_collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "brand_collections_rels" ADD CONSTRAINT "brand_collections_rels_buyer_types_fk" FOREIGN KEY ("buyer_types_id") REFERENCES "public"."buyer_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "fashion_categories" ADD CONSTRAINT "fashion_categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "fashion_categories" ADD CONSTRAINT "fashion_categories_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "descriptors_rels" ADD CONSTRAINT "descriptors_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."descriptors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "descriptors_rels" ADD CONSTRAINT "descriptors_rels_sections_fk" FOREIGN KEY ("sections_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quotes_lines" ADD CONSTRAINT "quotes_lines_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quotes_lines" ADD CONSTRAINT "quotes_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quotes" ADD CONSTRAINT "quotes_quote_pdf_id_media_id_fk" FOREIGN KEY ("quote_pdf_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customers_addresses" ADD CONSTRAINT "customers_addresses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_sessions" ADD CONSTRAINT "customers_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers" ADD CONSTRAINT "customers_buyer_type_id_buyer_types_id_fk" FOREIGN KEY ("buyer_type_id") REFERENCES "public"."buyer_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customers" ADD CONSTRAINT "customers_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customers_rels" ADD CONSTRAINT "customers_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_rels" ADD CONSTRAINT "customers_rels_lots_fk" FOREIGN KEY ("lots_id") REFERENCES "public"."lots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "price_lists_overrides_price_tiers" ADD CONSTRAINT "price_lists_overrides_price_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."price_lists_overrides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "price_lists_overrides" ADD CONSTRAINT "price_lists_overrides_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "price_lists_overrides" ADD CONSTRAINT "price_lists_overrides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."price_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_sections" ADD CONSTRAINT "pages_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_lots_fk" FOREIGN KEY ("lots_id") REFERENCES "public"."lots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sections_fk" FOREIGN KEY ("sections_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subcategories_fk" FOREIGN KEY ("subcategories_id") REFERENCES "public"."subcategories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_brands_fk" FOREIGN KEY ("brands_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_brand_collections_fk" FOREIGN KEY ("brand_collections_id") REFERENCES "public"."brand_collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_fashion_categories_fk" FOREIGN KEY ("fashion_categories_id") REFERENCES "public"."fashion_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_descriptors_fk" FOREIGN KEY ("descriptors_id") REFERENCES "public"."descriptors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_buyer_types_fk" FOREIGN KEY ("buyer_types_id") REFERENCES "public"."buyer_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_quotes_fk" FOREIGN KEY ("quotes_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_enquiries_fk" FOREIGN KEY ("enquiries_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_price_lists_fk" FOREIGN KEY ("price_lists_id") REFERENCES "public"."price_lists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reviews_fk" FOREIGN KEY ("reviews_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "settings_business_locations" ADD CONSTRAINT "settings_business_locations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "settings_trust" ADD CONSTRAINT "settings_trust_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "lots_division_order_idx" ON "lots_division" USING btree ("order");
  CREATE INDEX "lots_division_parent_idx" ON "lots_division" USING btree ("parent_id");
  CREATE INDEX "lots_media_order_idx" ON "lots_media" USING btree ("_order");
  CREATE INDEX "lots_media_parent_id_idx" ON "lots_media" USING btree ("_parent_id");
  CREATE INDEX "lots_media_image_idx" ON "lots_media" USING btree ("image_id");
  CREATE INDEX "lots_brands_order_idx" ON "lots_brands" USING btree ("_order");
  CREATE INDEX "lots_brands_parent_id_idx" ON "lots_brands" USING btree ("_parent_id");
  CREATE INDEX "lots_brands_brand_idx" ON "lots_brands" USING btree ("brand_id");
  CREATE INDEX "lots_price_tiers_order_idx" ON "lots_price_tiers" USING btree ("_order");
  CREATE INDEX "lots_price_tiers_parent_id_idx" ON "lots_price_tiers" USING btree ("_parent_id");
  CREATE INDEX "lots_badges_order_idx" ON "lots_badges" USING btree ("order");
  CREATE INDEX "lots_badges_parent_idx" ON "lots_badges" USING btree ("parent_id");
  CREATE UNIQUE INDEX "lots_sku_idx" ON "lots" USING btree ("sku");
  CREATE INDEX "lots_section_idx" ON "lots" USING btree ("section_id");
  CREATE INDEX "lots_brand_collection_idx" ON "lots" USING btree ("brand_collection_id");
  CREATE INDEX "lots_seo_seo_og_image_idx" ON "lots" USING btree ("seo_og_image_id");
  CREATE UNIQUE INDEX "lots_slug_idx" ON "lots" USING btree ("slug");
  CREATE INDEX "lots_status_idx" ON "lots" USING btree ("status");
  CREATE INDEX "lots_updated_at_idx" ON "lots" USING btree ("updated_at");
  CREATE INDEX "lots_created_at_idx" ON "lots" USING btree ("created_at");
  CREATE INDEX "lots_rels_order_idx" ON "lots_rels" USING btree ("order");
  CREATE INDEX "lots_rels_parent_idx" ON "lots_rels" USING btree ("parent_id");
  CREATE INDEX "lots_rels_path_idx" ON "lots_rels" USING btree ("path");
  CREATE INDEX "lots_rels_subcategories_id_idx" ON "lots_rels" USING btree ("subcategories_id");
  CREATE INDEX "lots_rels_fashion_categories_id_idx" ON "lots_rels" USING btree ("fashion_categories_id");
  CREATE INDEX "lots_rels_descriptors_id_idx" ON "lots_rels" USING btree ("descriptors_id");
  CREATE INDEX "lots_rels_buyer_types_id_idx" ON "lots_rels" USING btree ("buyer_types_id");
  CREATE INDEX "sections_subcategory_groups_order_idx" ON "sections_subcategory_groups" USING btree ("_order");
  CREATE INDEX "sections_subcategory_groups_parent_id_idx" ON "sections_subcategory_groups" USING btree ("_parent_id");
  CREATE INDEX "sections_brand_sets_order_idx" ON "sections_brand_sets" USING btree ("_order");
  CREATE INDEX "sections_brand_sets_parent_id_idx" ON "sections_brand_sets" USING btree ("_parent_id");
  CREATE INDEX "sections_brand_sets_fashion_category_idx" ON "sections_brand_sets" USING btree ("fashion_category_id");
  CREATE UNIQUE INDEX "sections_number_idx" ON "sections" USING btree ("number");
  CREATE UNIQUE INDEX "sections_slug_idx" ON "sections" USING btree ("slug");
  CREATE INDEX "sections_image_idx" ON "sections" USING btree ("image_id");
  CREATE INDEX "sections_seo_seo_og_image_idx" ON "sections" USING btree ("seo_og_image_id");
  CREATE INDEX "sections_updated_at_idx" ON "sections" USING btree ("updated_at");
  CREATE INDEX "sections_created_at_idx" ON "sections" USING btree ("created_at");
  CREATE INDEX "sections_rels_order_idx" ON "sections_rels" USING btree ("order");
  CREATE INDEX "sections_rels_parent_idx" ON "sections_rels" USING btree ("parent_id");
  CREATE INDEX "sections_rels_path_idx" ON "sections_rels" USING btree ("path");
  CREATE INDEX "sections_rels_brands_id_idx" ON "sections_rels" USING btree ("brands_id");
  CREATE INDEX "subcategories_slug_idx" ON "subcategories" USING btree ("slug");
  CREATE INDEX "subcategories_section_idx" ON "subcategories" USING btree ("section_id");
  CREATE INDEX "subcategories_image_idx" ON "subcategories" USING btree ("image_id");
  CREATE INDEX "subcategories_seo_seo_og_image_idx" ON "subcategories" USING btree ("seo_og_image_id");
  CREATE INDEX "subcategories_updated_at_idx" ON "subcategories" USING btree ("updated_at");
  CREATE INDEX "subcategories_created_at_idx" ON "subcategories" USING btree ("created_at");
  CREATE UNIQUE INDEX "section_slug_idx" ON "subcategories" USING btree ("section_id","slug");
  CREATE UNIQUE INDEX "brands_slug_idx" ON "brands" USING btree ("slug");
  CREATE INDEX "brands_logo_svg_idx" ON "brands" USING btree ("logo_svg_id");
  CREATE INDEX "brands_seo_seo_og_image_idx" ON "brands" USING btree ("seo_og_image_id");
  CREATE INDEX "brands_updated_at_idx" ON "brands" USING btree ("updated_at");
  CREATE INDEX "brands_created_at_idx" ON "brands" USING btree ("created_at");
  CREATE INDEX "brands_rels_order_idx" ON "brands_rels" USING btree ("order");
  CREATE INDEX "brands_rels_parent_idx" ON "brands_rels" USING btree ("parent_id");
  CREATE INDEX "brands_rels_path_idx" ON "brands_rels" USING btree ("path");
  CREATE INDEX "brands_rels_sections_id_idx" ON "brands_rels" USING btree ("sections_id");
  CREATE INDEX "brands_rels_fashion_categories_id_idx" ON "brands_rels" USING btree ("fashion_categories_id");
  CREATE UNIQUE INDEX "brand_collections_slug_idx" ON "brand_collections" USING btree ("slug");
  CREATE INDEX "brand_collections_brand_idx" ON "brand_collections" USING btree ("brand_id");
  CREATE INDEX "brand_collections_section_idx" ON "brand_collections" USING btree ("section_id");
  CREATE INDEX "brand_collections_image_idx" ON "brand_collections" USING btree ("image_id");
  CREATE INDEX "brand_collections_seo_seo_og_image_idx" ON "brand_collections" USING btree ("seo_og_image_id");
  CREATE INDEX "brand_collections_updated_at_idx" ON "brand_collections" USING btree ("updated_at");
  CREATE INDEX "brand_collections_created_at_idx" ON "brand_collections" USING btree ("created_at");
  CREATE INDEX "brand_collections_rels_order_idx" ON "brand_collections_rels" USING btree ("order");
  CREATE INDEX "brand_collections_rels_parent_idx" ON "brand_collections_rels" USING btree ("parent_id");
  CREATE INDEX "brand_collections_rels_path_idx" ON "brand_collections_rels" USING btree ("path");
  CREATE INDEX "brand_collections_rels_buyer_types_id_idx" ON "brand_collections_rels" USING btree ("buyer_types_id");
  CREATE UNIQUE INDEX "fashion_categories_slug_idx" ON "fashion_categories" USING btree ("slug");
  CREATE INDEX "fashion_categories_image_idx" ON "fashion_categories" USING btree ("image_id");
  CREATE INDEX "fashion_categories_seo_seo_og_image_idx" ON "fashion_categories" USING btree ("seo_og_image_id");
  CREATE INDEX "fashion_categories_updated_at_idx" ON "fashion_categories" USING btree ("updated_at");
  CREATE INDEX "fashion_categories_created_at_idx" ON "fashion_categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "descriptors_slug_idx" ON "descriptors" USING btree ("slug");
  CREATE INDEX "descriptors_updated_at_idx" ON "descriptors" USING btree ("updated_at");
  CREATE INDEX "descriptors_created_at_idx" ON "descriptors" USING btree ("created_at");
  CREATE INDEX "descriptors_rels_order_idx" ON "descriptors_rels" USING btree ("order");
  CREATE INDEX "descriptors_rels_parent_idx" ON "descriptors_rels" USING btree ("parent_id");
  CREATE INDEX "descriptors_rels_path_idx" ON "descriptors_rels" USING btree ("path");
  CREATE INDEX "descriptors_rels_sections_id_idx" ON "descriptors_rels" USING btree ("sections_id");
  CREATE UNIQUE INDEX "buyer_types_slug_idx" ON "buyer_types" USING btree ("slug");
  CREATE INDEX "buyer_types_updated_at_idx" ON "buyer_types" USING btree ("updated_at");
  CREATE INDEX "buyer_types_created_at_idx" ON "buyer_types" USING btree ("created_at");
  CREATE INDEX "quotes_lines_order_idx" ON "quotes_lines" USING btree ("_order");
  CREATE INDEX "quotes_lines_parent_id_idx" ON "quotes_lines" USING btree ("_parent_id");
  CREATE INDEX "quotes_lines_lot_idx" ON "quotes_lines" USING btree ("lot_id");
  CREATE UNIQUE INDEX "quotes_ref_idx" ON "quotes" USING btree ("ref");
  CREATE INDEX "quotes_status_idx" ON "quotes" USING btree ("status");
  CREATE INDEX "quotes_customer_idx" ON "quotes" USING btree ("customer_id");
  CREATE INDEX "quotes_quote_pdf_idx" ON "quotes" USING btree ("quote_pdf_id");
  CREATE INDEX "quotes_updated_at_idx" ON "quotes" USING btree ("updated_at");
  CREATE INDEX "quotes_created_at_idx" ON "quotes" USING btree ("created_at");
  CREATE INDEX "enquiries_customer_idx" ON "enquiries" USING btree ("customer_id");
  CREATE INDEX "enquiries_updated_at_idx" ON "enquiries" USING btree ("updated_at");
  CREATE INDEX "enquiries_created_at_idx" ON "enquiries" USING btree ("created_at");
  CREATE INDEX "customers_addresses_order_idx" ON "customers_addresses" USING btree ("_order");
  CREATE INDEX "customers_addresses_parent_id_idx" ON "customers_addresses" USING btree ("_parent_id");
  CREATE INDEX "customers_sessions_order_idx" ON "customers_sessions" USING btree ("_order");
  CREATE INDEX "customers_sessions_parent_id_idx" ON "customers_sessions" USING btree ("_parent_id");
  CREATE INDEX "customers_buyer_type_idx" ON "customers" USING btree ("buyer_type_id");
  CREATE INDEX "customers_price_list_idx" ON "customers" USING btree ("price_list_id");
  CREATE INDEX "customers_updated_at_idx" ON "customers" USING btree ("updated_at");
  CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");
  CREATE UNIQUE INDEX "customers_email_idx" ON "customers" USING btree ("email");
  CREATE INDEX "customers_rels_order_idx" ON "customers_rels" USING btree ("order");
  CREATE INDEX "customers_rels_parent_idx" ON "customers_rels" USING btree ("parent_id");
  CREATE INDEX "customers_rels_path_idx" ON "customers_rels" USING btree ("path");
  CREATE INDEX "customers_rels_lots_id_idx" ON "customers_rels" USING btree ("lots_id");
  CREATE INDEX "price_lists_overrides_price_tiers_order_idx" ON "price_lists_overrides_price_tiers" USING btree ("_order");
  CREATE INDEX "price_lists_overrides_price_tiers_parent_id_idx" ON "price_lists_overrides_price_tiers" USING btree ("_parent_id");
  CREATE INDEX "price_lists_overrides_order_idx" ON "price_lists_overrides" USING btree ("_order");
  CREATE INDEX "price_lists_overrides_parent_id_idx" ON "price_lists_overrides" USING btree ("_parent_id");
  CREATE INDEX "price_lists_overrides_lot_idx" ON "price_lists_overrides" USING btree ("lot_id");
  CREATE INDEX "price_lists_updated_at_idx" ON "price_lists" USING btree ("updated_at");
  CREATE INDEX "price_lists_created_at_idx" ON "price_lists" USING btree ("created_at");
  CREATE INDEX "pages_sections_order_idx" ON "pages_sections" USING btree ("_order");
  CREATE INDEX "pages_sections_parent_id_idx" ON "pages_sections" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_seo_seo_og_image_idx" ON "pages" USING btree ("seo_og_image_id");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "reviews_updated_at_idx" ON "reviews" USING btree ("updated_at");
  CREATE INDEX "reviews_created_at_idx" ON "reviews" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_large_sizes_large_filename_idx" ON "media" USING btree ("sizes_large_filename");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_lots_id_idx" ON "payload_locked_documents_rels" USING btree ("lots_id");
  CREATE INDEX "payload_locked_documents_rels_sections_id_idx" ON "payload_locked_documents_rels" USING btree ("sections_id");
  CREATE INDEX "payload_locked_documents_rels_subcategories_id_idx" ON "payload_locked_documents_rels" USING btree ("subcategories_id");
  CREATE INDEX "payload_locked_documents_rels_brands_id_idx" ON "payload_locked_documents_rels" USING btree ("brands_id");
  CREATE INDEX "payload_locked_documents_rels_brand_collections_id_idx" ON "payload_locked_documents_rels" USING btree ("brand_collections_id");
  CREATE INDEX "payload_locked_documents_rels_fashion_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("fashion_categories_id");
  CREATE INDEX "payload_locked_documents_rels_descriptors_id_idx" ON "payload_locked_documents_rels" USING btree ("descriptors_id");
  CREATE INDEX "payload_locked_documents_rels_buyer_types_id_idx" ON "payload_locked_documents_rels" USING btree ("buyer_types_id");
  CREATE INDEX "payload_locked_documents_rels_quotes_id_idx" ON "payload_locked_documents_rels" USING btree ("quotes_id");
  CREATE INDEX "payload_locked_documents_rels_enquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("enquiries_id");
  CREATE INDEX "payload_locked_documents_rels_customers_id_idx" ON "payload_locked_documents_rels" USING btree ("customers_id");
  CREATE INDEX "payload_locked_documents_rels_price_lists_id_idx" ON "payload_locked_documents_rels" USING btree ("price_lists_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("reviews_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_customers_id_idx" ON "payload_preferences_rels" USING btree ("customers_id");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "settings_business_locations_order_idx" ON "settings_business_locations" USING btree ("_order");
  CREATE INDEX "settings_business_locations_parent_id_idx" ON "settings_business_locations" USING btree ("_parent_id");
  CREATE INDEX "settings_trust_order_idx" ON "settings_trust" USING btree ("_order");
  CREATE INDEX "settings_trust_parent_id_idx" ON "settings_trust" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "lots_division" CASCADE;
  DROP TABLE "lots_media" CASCADE;
  DROP TABLE "lots_brands" CASCADE;
  DROP TABLE "lots_price_tiers" CASCADE;
  DROP TABLE "lots_badges" CASCADE;
  DROP TABLE "lots" CASCADE;
  DROP TABLE "lots_rels" CASCADE;
  DROP TABLE "sections_subcategory_groups" CASCADE;
  DROP TABLE "sections_brand_sets" CASCADE;
  DROP TABLE "sections" CASCADE;
  DROP TABLE "sections_rels" CASCADE;
  DROP TABLE "subcategories" CASCADE;
  DROP TABLE "brands" CASCADE;
  DROP TABLE "brands_rels" CASCADE;
  DROP TABLE "brand_collections" CASCADE;
  DROP TABLE "brand_collections_rels" CASCADE;
  DROP TABLE "fashion_categories" CASCADE;
  DROP TABLE "descriptors" CASCADE;
  DROP TABLE "descriptors_rels" CASCADE;
  DROP TABLE "buyer_types" CASCADE;
  DROP TABLE "quotes_lines" CASCADE;
  DROP TABLE "quotes" CASCADE;
  DROP TABLE "enquiries" CASCADE;
  DROP TABLE "customers_addresses" CASCADE;
  DROP TABLE "customers_sessions" CASCADE;
  DROP TABLE "customers" CASCADE;
  DROP TABLE "customers_rels" CASCADE;
  DROP TABLE "price_lists_overrides_price_tiers" CASCADE;
  DROP TABLE "price_lists_overrides" CASCADE;
  DROP TABLE "price_lists" CASCADE;
  DROP TABLE "pages_sections" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "reviews" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "settings_business_locations" CASCADE;
  DROP TABLE "settings_trust" CASCADE;
  DROP TABLE "settings" CASCADE;
  DROP TYPE "public"."enum_lots_division";
  DROP TYPE "public"."enum_lots_media_kind";
  DROP TYPE "public"."enum_lots_price_tiers_unit";
  DROP TYPE "public"."enum_lots_badges";
  DROP TYPE "public"."enum_lots_lot_type";
  DROP TYPE "public"."enum_lots_grade";
  DROP TYPE "public"."enum_lots_era";
  DROP TYPE "public"."enum_lots_price_visibility";
  DROP TYPE "public"."enum_lots_stock_status";
  DROP TYPE "public"."enum_lots_status";
  DROP TYPE "public"."enum_sections_menu_column";
  DROP TYPE "public"."enum_brands_kind";
  DROP TYPE "public"."enum_descriptors_kind";
  DROP TYPE "public"."enum_quotes_status";
  DROP TYPE "public"."enum_quotes_details_shipping_method";
  DROP TYPE "public"."enum_quotes_details_payment_preference";
  DROP TYPE "public"."enum_enquiries_type";
  DROP TYPE "public"."enum_enquiries_status";
  DROP TYPE "public"."enum_customers_trade_status";
  DROP TYPE "public"."enum_price_lists_overrides_price_tiers_unit";
  DROP TYPE "public"."enum_pages_group";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum_reviews_source";
  DROP TYPE "public"."enum_reviews_status";
  DROP TYPE "public"."enum_users_role";`)
}
