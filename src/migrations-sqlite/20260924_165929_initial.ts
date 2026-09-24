import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`lots_division\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`lots\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`lots_division_order_idx\` ON \`lots_division\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`lots_division_parent_idx\` ON \`lots_division\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`lots_media\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer NOT NULL,
  	\`alt\` text NOT NULL,
  	\`kind\` text DEFAULT 'image',
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`lots\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`lots_media_order_idx\` ON \`lots_media\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`lots_media_parent_id_idx\` ON \`lots_media\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`lots_media_image_idx\` ON \`lots_media\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`lots_brands\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`brand_id\` integer NOT NULL,
  	\`count\` numeric,
  	FOREIGN KEY (\`brand_id\`) REFERENCES \`brands\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`lots\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`lots_brands_order_idx\` ON \`lots_brands\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`lots_brands_parent_id_idx\` ON \`lots_brands\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`lots_brands_brand_idx\` ON \`lots_brands\` (\`brand_id\`);`)
  await db.run(sql`CREATE TABLE \`lots_price_tiers\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`min_qty\` numeric NOT NULL,
  	\`max_qty\` numeric,
  	\`price\` numeric,
  	\`unit\` text DEFAULT 'lot' NOT NULL,
  	\`quote_only\` integer,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`lots\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`lots_price_tiers_order_idx\` ON \`lots_price_tiers\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`lots_price_tiers_parent_id_idx\` ON \`lots_price_tiers\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`lots_badges\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`lots\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`lots_badges_order_idx\` ON \`lots_badges\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`lots_badges_parent_idx\` ON \`lots_badges\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`lots\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`sku\` text NOT NULL,
  	\`lot_type\` text DEFAULT 'mixed-brand' NOT NULL,
  	\`pieces\` numeric,
  	\`weight_kg\` numeric,
  	\`grade\` text NOT NULL,
  	\`era\` text,
  	\`description\` text,
  	\`section_id\` integer NOT NULL,
  	\`brand_collection_id\` integer,
  	\`price_visibility\` text DEFAULT 'public' NOT NULL,
  	\`stock_lots_available\` numeric DEFAULT 1 NOT NULL,
  	\`stock_reserved\` numeric DEFAULT 0,
  	\`stock_status\` text DEFAULT 'in-stock' NOT NULL,
  	\`stock_dispatch\` text DEFAULT '24h dispatch',
  	\`stock_moq\` numeric DEFAULT 1,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`seo_og_image_id\` integer,
  	\`slug\` text NOT NULL,
  	\`status\` text DEFAULT 'draft' NOT NULL,
  	\`published_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`section_id\`) REFERENCES \`sections\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`brand_collection_id\`) REFERENCES \`brand_collections\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`seo_og_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`lots_sku_idx\` ON \`lots\` (\`sku\`);`)
  await db.run(sql`CREATE INDEX \`lots_section_idx\` ON \`lots\` (\`section_id\`);`)
  await db.run(sql`CREATE INDEX \`lots_brand_collection_idx\` ON \`lots\` (\`brand_collection_id\`);`)
  await db.run(sql`CREATE INDEX \`lots_seo_seo_og_image_idx\` ON \`lots\` (\`seo_og_image_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`lots_slug_idx\` ON \`lots\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`lots_status_idx\` ON \`lots\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`lots_updated_at_idx\` ON \`lots\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`lots_created_at_idx\` ON \`lots\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`lots_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`subcategories_id\` integer,
  	\`fashion_categories_id\` integer,
  	\`descriptors_id\` integer,
  	\`buyer_types_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`lots\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`subcategories_id\`) REFERENCES \`subcategories\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`fashion_categories_id\`) REFERENCES \`fashion_categories\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`descriptors_id\`) REFERENCES \`descriptors\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`buyer_types_id\`) REFERENCES \`buyer_types\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`lots_rels_order_idx\` ON \`lots_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`lots_rels_parent_idx\` ON \`lots_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`lots_rels_path_idx\` ON \`lots_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`lots_rels_subcategories_id_idx\` ON \`lots_rels\` (\`subcategories_id\`);`)
  await db.run(sql`CREATE INDEX \`lots_rels_fashion_categories_id_idx\` ON \`lots_rels\` (\`fashion_categories_id\`);`)
  await db.run(sql`CREATE INDEX \`lots_rels_descriptors_id_idx\` ON \`lots_rels\` (\`descriptors_id\`);`)
  await db.run(sql`CREATE INDEX \`lots_rels_buyer_types_id_idx\` ON \`lots_rels\` (\`buyer_types_id\`);`)
  await db.run(sql`CREATE TABLE \`sections_subcategory_groups\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`label\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`sections_subcategory_groups_order_idx\` ON \`sections_subcategory_groups\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`sections_subcategory_groups_parent_id_idx\` ON \`sections_subcategory_groups\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`sections_brand_sets\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`fashion_category_id\` integer NOT NULL,
  	\`label\` text,
  	FOREIGN KEY (\`fashion_category_id\`) REFERENCES \`fashion_categories\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`sections_brand_sets_order_idx\` ON \`sections_brand_sets\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`sections_brand_sets_parent_id_idx\` ON \`sections_brand_sets\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`sections_brand_sets_fashion_category_idx\` ON \`sections_brand_sets\` (\`fashion_category_id\`);`)
  await db.run(sql`CREATE TABLE \`sections\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`number\` numeric NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`intro\` text,
  	\`image_id\` integer,
  	\`menu_column\` text DEFAULT '1',
  	\`seo_content\` text,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`seo_og_image_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`seo_og_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`sections_number_idx\` ON \`sections\` (\`number\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`sections_slug_idx\` ON \`sections\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`sections_image_idx\` ON \`sections\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`sections_seo_seo_og_image_idx\` ON \`sections\` (\`seo_og_image_id\`);`)
  await db.run(sql`CREATE INDEX \`sections_updated_at_idx\` ON \`sections\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`sections_created_at_idx\` ON \`sections\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`sections_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`brands_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`sections\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`brands_id\`) REFERENCES \`brands\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`sections_rels_order_idx\` ON \`sections_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`sections_rels_parent_idx\` ON \`sections_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`sections_rels_path_idx\` ON \`sections_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`sections_rels_brands_id_idx\` ON \`sections_rels\` (\`brands_id\`);`)
  await db.run(sql`CREATE TABLE \`subcategories\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`section_id\` integer NOT NULL,
  	\`group\` text,
  	\`intro\` text,
  	\`image_id\` integer,
  	\`order\` numeric DEFAULT 0,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`seo_og_image_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`section_id\`) REFERENCES \`sections\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`seo_og_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`subcategories_slug_idx\` ON \`subcategories\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`subcategories_section_idx\` ON \`subcategories\` (\`section_id\`);`)
  await db.run(sql`CREATE INDEX \`subcategories_image_idx\` ON \`subcategories\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`subcategories_seo_seo_og_image_idx\` ON \`subcategories\` (\`seo_og_image_id\`);`)
  await db.run(sql`CREATE INDEX \`subcategories_updated_at_idx\` ON \`subcategories\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`subcategories_created_at_idx\` ON \`subcategories\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`section_slug_idx\` ON \`subcategories\` (\`section_id\`,\`slug\`);`)
  await db.run(sql`CREATE TABLE \`brands\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`kind\` text DEFAULT 'brand' NOT NULL,
  	\`description\` text,
  	\`disclaimer\` text,
  	\`logo_svg_id\` integer,
  	\`logo_approved\` integer DEFAULT false,
  	\`wordmark_only\` integer DEFAULT false,
  	\`featured\` integer DEFAULT false,
  	\`luxury_on_request\` integer DEFAULT false,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`seo_og_image_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`logo_svg_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`seo_og_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`brands_slug_idx\` ON \`brands\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`brands_logo_svg_idx\` ON \`brands\` (\`logo_svg_id\`);`)
  await db.run(sql`CREATE INDEX \`brands_seo_seo_og_image_idx\` ON \`brands\` (\`seo_og_image_id\`);`)
  await db.run(sql`CREATE INDEX \`brands_updated_at_idx\` ON \`brands\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`brands_created_at_idx\` ON \`brands\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`brands_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`sections_id\` integer,
  	\`fashion_categories_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`brands\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`sections_id\`) REFERENCES \`sections\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`fashion_categories_id\`) REFERENCES \`fashion_categories\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`brands_rels_order_idx\` ON \`brands_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`brands_rels_parent_idx\` ON \`brands_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`brands_rels_path_idx\` ON \`brands_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`brands_rels_sections_id_idx\` ON \`brands_rels\` (\`sections_id\`);`)
  await db.run(sql`CREATE INDEX \`brands_rels_fashion_categories_id_idx\` ON \`brands_rels\` (\`fashion_categories_id\`);`)
  await db.run(sql`CREATE TABLE \`brand_collections\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`brand_id\` integer NOT NULL,
  	\`section_id\` integer,
  	\`tier\` text,
  	\`description\` text,
  	\`image_id\` integer,
  	\`order\` numeric DEFAULT 0,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`seo_og_image_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`brand_id\`) REFERENCES \`brands\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`section_id\`) REFERENCES \`sections\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`seo_og_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`brand_collections_slug_idx\` ON \`brand_collections\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`brand_collections_brand_idx\` ON \`brand_collections\` (\`brand_id\`);`)
  await db.run(sql`CREATE INDEX \`brand_collections_section_idx\` ON \`brand_collections\` (\`section_id\`);`)
  await db.run(sql`CREATE INDEX \`brand_collections_image_idx\` ON \`brand_collections\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`brand_collections_seo_seo_og_image_idx\` ON \`brand_collections\` (\`seo_og_image_id\`);`)
  await db.run(sql`CREATE INDEX \`brand_collections_updated_at_idx\` ON \`brand_collections\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`brand_collections_created_at_idx\` ON \`brand_collections\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`brand_collections_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`buyer_types_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`brand_collections\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`buyer_types_id\`) REFERENCES \`buyer_types\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`brand_collections_rels_order_idx\` ON \`brand_collections_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`brand_collections_rels_parent_idx\` ON \`brand_collections_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`brand_collections_rels_path_idx\` ON \`brand_collections_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`brand_collections_rels_buyer_types_id_idx\` ON \`brand_collections_rels\` (\`buyer_types_id\`);`)
  await db.run(sql`CREATE TABLE \`fashion_categories\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`description\` text,
  	\`image_id\` integer,
  	\`order\` numeric DEFAULT 0,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`seo_og_image_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`seo_og_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`fashion_categories_slug_idx\` ON \`fashion_categories\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`fashion_categories_image_idx\` ON \`fashion_categories\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX \`fashion_categories_seo_seo_og_image_idx\` ON \`fashion_categories\` (\`seo_og_image_id\`);`)
  await db.run(sql`CREATE INDEX \`fashion_categories_updated_at_idx\` ON \`fashion_categories\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`fashion_categories_created_at_idx\` ON \`fashion_categories\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`descriptors\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`term\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`kind\` text DEFAULT 'descriptor' NOT NULL,
  	\`group\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`descriptors_slug_idx\` ON \`descriptors\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`descriptors_updated_at_idx\` ON \`descriptors\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`descriptors_created_at_idx\` ON \`descriptors\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`descriptors_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`sections_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`descriptors\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`sections_id\`) REFERENCES \`sections\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`descriptors_rels_order_idx\` ON \`descriptors_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`descriptors_rels_parent_idx\` ON \`descriptors_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`descriptors_rels_path_idx\` ON \`descriptors_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`descriptors_rels_sections_id_idx\` ON \`descriptors_rels\` (\`sections_id\`);`)
  await db.run(sql`CREATE TABLE \`buyer_types\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`buyer_types_slug_idx\` ON \`buyer_types\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`buyer_types_updated_at_idx\` ON \`buyer_types\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`buyer_types_created_at_idx\` ON \`buyer_types\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`quotes_lines\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`lot_id\` integer NOT NULL,
  	\`qty\` numeric NOT NULL,
  	\`title\` text NOT NULL,
  	\`sku\` text NOT NULL,
  	\`guide_subtotal_pence\` numeric,
  	\`quoted_subtotal_pence\` numeric,
  	FOREIGN KEY (\`lot_id\`) REFERENCES \`lots\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`quotes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`quotes_lines_order_idx\` ON \`quotes_lines\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`quotes_lines_parent_id_idx\` ON \`quotes_lines\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`quotes_lines_lot_idx\` ON \`quotes_lines\` (\`lot_id\`);`)
  await db.run(sql`CREATE TABLE \`quotes\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`ref\` text,
  	\`status\` text DEFAULT 'submitted' NOT NULL,
  	\`customer_id\` integer,
  	\`notes\` text,
  	\`details_company\` text NOT NULL,
  	\`details_contact_name\` text NOT NULL,
  	\`details_email\` text NOT NULL,
  	\`details_phone\` text,
  	\`details_vat_number\` text,
  	\`details_country\` text NOT NULL,
  	\`details_postcode\` text,
  	\`details_shipping_method\` text,
  	\`details_payment_preference\` text,
  	\`details_deadline\` text,
  	\`internal_notes\` text,
  	\`quote_pdf_id\` integer,
  	\`reserved_until\` text,
  	\`quoted_at\` text,
  	\`expires_at\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`quote_pdf_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`quotes_ref_idx\` ON \`quotes\` (\`ref\`);`)
  await db.run(sql`CREATE INDEX \`quotes_status_idx\` ON \`quotes\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`quotes_customer_idx\` ON \`quotes\` (\`customer_id\`);`)
  await db.run(sql`CREATE INDEX \`quotes_quote_pdf_idx\` ON \`quotes\` (\`quote_pdf_id\`);`)
  await db.run(sql`CREATE INDEX \`quotes_updated_at_idx\` ON \`quotes\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`quotes_created_at_idx\` ON \`quotes\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`enquiries\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`type\` text NOT NULL,
  	\`status\` text DEFAULT 'new',
  	\`email\` text NOT NULL,
  	\`name\` text,
  	\`company\` text,
  	\`phone\` text,
  	\`country\` text,
  	\`message\` text,
  	\`fields\` text,
  	\`customer_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`enquiries_customer_idx\` ON \`enquiries\` (\`customer_id\`);`)
  await db.run(sql`CREATE INDEX \`enquiries_updated_at_idx\` ON \`enquiries\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`enquiries_created_at_idx\` ON \`enquiries\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`customers_addresses\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`line1\` text NOT NULL,
  	\`line2\` text,
  	\`city\` text NOT NULL,
  	\`postcode\` text NOT NULL,
  	\`country\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`customers_addresses_order_idx\` ON \`customers_addresses\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`customers_addresses_parent_id_idx\` ON \`customers_addresses\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`customers_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`customers_sessions_order_idx\` ON \`customers_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`customers_sessions_parent_id_idx\` ON \`customers_sessions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`customers\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`company\` text NOT NULL,
  	\`contact_name\` text NOT NULL,
  	\`phone\` text,
  	\`vat_number\` text,
  	\`company_number\` text,
  	\`country\` text DEFAULT 'United Kingdom' NOT NULL,
  	\`buyer_type_id\` integer,
  	\`trade_status\` text DEFAULT 'none',
  	\`price_list_id\` integer,
  	\`internal_notes\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`reset_password_requested_at\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text,
  	FOREIGN KEY (\`buyer_type_id\`) REFERENCES \`buyer_types\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`price_list_id\`) REFERENCES \`price_lists\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`customers_buyer_type_idx\` ON \`customers\` (\`buyer_type_id\`);`)
  await db.run(sql`CREATE INDEX \`customers_price_list_idx\` ON \`customers\` (\`price_list_id\`);`)
  await db.run(sql`CREATE INDEX \`customers_updated_at_idx\` ON \`customers\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`customers_created_at_idx\` ON \`customers\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`customers_email_idx\` ON \`customers\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`customers_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`lots_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`lots_id\`) REFERENCES \`lots\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`customers_rels_order_idx\` ON \`customers_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`customers_rels_parent_idx\` ON \`customers_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`customers_rels_path_idx\` ON \`customers_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`customers_rels_lots_id_idx\` ON \`customers_rels\` (\`lots_id\`);`)
  await db.run(sql`CREATE TABLE \`price_lists_overrides_price_tiers\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`min_qty\` numeric NOT NULL,
  	\`max_qty\` numeric,
  	\`price\` numeric,
  	\`unit\` text DEFAULT 'lot' NOT NULL,
  	\`quote_only\` integer,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`price_lists_overrides\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`price_lists_overrides_price_tiers_order_idx\` ON \`price_lists_overrides_price_tiers\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`price_lists_overrides_price_tiers_parent_id_idx\` ON \`price_lists_overrides_price_tiers\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`price_lists_overrides\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`lot_id\` integer NOT NULL,
  	FOREIGN KEY (\`lot_id\`) REFERENCES \`lots\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`price_lists\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`price_lists_overrides_order_idx\` ON \`price_lists_overrides\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`price_lists_overrides_parent_id_idx\` ON \`price_lists_overrides\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`price_lists_overrides_lot_idx\` ON \`price_lists_overrides\` (\`lot_id\`);`)
  await db.run(sql`CREATE TABLE \`price_lists\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`discount_percent\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`price_lists_updated_at_idx\` ON \`price_lists\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`price_lists_created_at_idx\` ON \`price_lists\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`pages_sections\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`body\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_sections_order_idx\` ON \`pages_sections\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_sections_parent_id_idx\` ON \`pages_sections\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`group\` text DEFAULT 'info' NOT NULL,
  	\`intro\` text,
  	\`content\` text,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`seo_og_image_id\` integer,
  	\`status\` text DEFAULT 'draft' NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`seo_og_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`pages_slug_idx\` ON \`pages\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`pages_seo_seo_og_image_idx\` ON \`pages\` (\`seo_og_image_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_updated_at_idx\` ON \`pages\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`pages_created_at_idx\` ON \`pages\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`reviews\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`author\` text NOT NULL,
  	\`rating\` numeric NOT NULL,
  	\`body\` text NOT NULL,
  	\`source\` text NOT NULL,
  	\`source_url\` text NOT NULL,
  	\`date\` text NOT NULL,
  	\`status\` text DEFAULT 'published' NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`reviews_updated_at_idx\` ON \`reviews\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`reviews_created_at_idx\` ON \`reviews\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`media\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`alt\` text NOT NULL,
  	\`credit\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric,
  	\`focal_x\` numeric,
  	\`focal_y\` numeric,
  	\`sizes_thumb_url\` text,
  	\`sizes_thumb_width\` numeric,
  	\`sizes_thumb_height\` numeric,
  	\`sizes_thumb_mime_type\` text,
  	\`sizes_thumb_filesize\` numeric,
  	\`sizes_thumb_filename\` text,
  	\`sizes_card_url\` text,
  	\`sizes_card_width\` numeric,
  	\`sizes_card_height\` numeric,
  	\`sizes_card_mime_type\` text,
  	\`sizes_card_filesize\` numeric,
  	\`sizes_card_filename\` text,
  	\`sizes_large_url\` text,
  	\`sizes_large_width\` numeric,
  	\`sizes_large_height\` numeric,
  	\`sizes_large_mime_type\` text,
  	\`sizes_large_filesize\` numeric,
  	\`sizes_large_filename\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`media_updated_at_idx\` ON \`media\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`media_created_at_idx\` ON \`media\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`media_filename_idx\` ON \`media\` (\`filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_thumb_sizes_thumb_filename_idx\` ON \`media\` (\`sizes_thumb_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_card_sizes_card_filename_idx\` ON \`media\` (\`sizes_card_filename\`);`)
  await db.run(sql`CREATE INDEX \`media_sizes_large_sizes_large_filename_idx\` ON \`media\` (\`sizes_large_filename\`);`)
  await db.run(sql`CREATE TABLE \`users_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_sessions_order_idx\` ON \`users_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`users_sessions_parent_id_idx\` ON \`users_sessions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`role\` text DEFAULT 'editor' NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`reset_password_requested_at\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`payload_kv\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`data\` text NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`global_slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`lots_id\` integer,
  	\`sections_id\` integer,
  	\`subcategories_id\` integer,
  	\`brands_id\` integer,
  	\`brand_collections_id\` integer,
  	\`fashion_categories_id\` integer,
  	\`descriptors_id\` integer,
  	\`buyer_types_id\` integer,
  	\`quotes_id\` integer,
  	\`enquiries_id\` integer,
  	\`customers_id\` integer,
  	\`price_lists_id\` integer,
  	\`pages_id\` integer,
  	\`reviews_id\` integer,
  	\`media_id\` integer,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`lots_id\`) REFERENCES \`lots\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`sections_id\`) REFERENCES \`sections\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`subcategories_id\`) REFERENCES \`subcategories\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`brands_id\`) REFERENCES \`brands\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`brand_collections_id\`) REFERENCES \`brand_collections\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`fashion_categories_id\`) REFERENCES \`fashion_categories\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`descriptors_id\`) REFERENCES \`descriptors\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`buyer_types_id\`) REFERENCES \`buyer_types\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`quotes_id\`) REFERENCES \`quotes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`enquiries_id\`) REFERENCES \`enquiries\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`customers_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`price_lists_id\`) REFERENCES \`price_lists\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`pages_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`reviews_id\`) REFERENCES \`reviews\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_lots_id_idx\` ON \`payload_locked_documents_rels\` (\`lots_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_sections_id_idx\` ON \`payload_locked_documents_rels\` (\`sections_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_subcategories_id_idx\` ON \`payload_locked_documents_rels\` (\`subcategories_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_brands_id_idx\` ON \`payload_locked_documents_rels\` (\`brands_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_brand_collections_id_idx\` ON \`payload_locked_documents_rels\` (\`brand_collections_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_fashion_categories_id_idx\` ON \`payload_locked_documents_rels\` (\`fashion_categories_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_descriptors_id_idx\` ON \`payload_locked_documents_rels\` (\`descriptors_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_buyer_types_id_idx\` ON \`payload_locked_documents_rels\` (\`buyer_types_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_quotes_id_idx\` ON \`payload_locked_documents_rels\` (\`quotes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_enquiries_id_idx\` ON \`payload_locked_documents_rels\` (\`enquiries_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_customers_id_idx\` ON \`payload_locked_documents_rels\` (\`customers_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_price_lists_id_idx\` ON \`payload_locked_documents_rels\` (\`price_lists_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_reviews_id_idx\` ON \`payload_locked_documents_rels\` (\`reviews_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`value\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`customers_id\` integer,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`customers_id\`) REFERENCES \`customers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_customers_id_idx\` ON \`payload_preferences_rels\` (\`customers_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`batch\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`settings_business_locations\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`country\` text NOT NULL,
  	\`detail\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`settings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`settings_business_locations_order_idx\` ON \`settings_business_locations\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`settings_business_locations_parent_id_idx\` ON \`settings_business_locations\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`settings_trust\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`value\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`settings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`settings_trust_order_idx\` ON \`settings_trust\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`settings_trust_parent_id_idx\` ON \`settings_trust\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`business_name\` text DEFAULT '360° Thrift Studio',
  	\`business_tagline\` text DEFAULT 'Vintage · Premium · Wholesale',
  	\`business_slogan\` text DEFAULT 'Good clothes. Bigger stories.',
  	\`show_brand_logos\` integer DEFAULT false,
  	\`require_login_for_prices\` integer DEFAULT false,
  	\`announcement_enabled\` integer DEFAULT true,
  	\`announcement_text\` text DEFAULT 'Restock live · 24h dispatch · UK & worldwide',
  	\`announcement_link\` text,
  	\`contact_email\` text,
  	\`contact_phone\` text,
  	\`contact_whatsapp\` text,
  	\`contact_address\` text,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`lots_division\`;`)
  await db.run(sql`DROP TABLE \`lots_media\`;`)
  await db.run(sql`DROP TABLE \`lots_brands\`;`)
  await db.run(sql`DROP TABLE \`lots_price_tiers\`;`)
  await db.run(sql`DROP TABLE \`lots_badges\`;`)
  await db.run(sql`DROP TABLE \`lots\`;`)
  await db.run(sql`DROP TABLE \`lots_rels\`;`)
  await db.run(sql`DROP TABLE \`sections_subcategory_groups\`;`)
  await db.run(sql`DROP TABLE \`sections_brand_sets\`;`)
  await db.run(sql`DROP TABLE \`sections\`;`)
  await db.run(sql`DROP TABLE \`sections_rels\`;`)
  await db.run(sql`DROP TABLE \`subcategories\`;`)
  await db.run(sql`DROP TABLE \`brands\`;`)
  await db.run(sql`DROP TABLE \`brands_rels\`;`)
  await db.run(sql`DROP TABLE \`brand_collections\`;`)
  await db.run(sql`DROP TABLE \`brand_collections_rels\`;`)
  await db.run(sql`DROP TABLE \`fashion_categories\`;`)
  await db.run(sql`DROP TABLE \`descriptors\`;`)
  await db.run(sql`DROP TABLE \`descriptors_rels\`;`)
  await db.run(sql`DROP TABLE \`buyer_types\`;`)
  await db.run(sql`DROP TABLE \`quotes_lines\`;`)
  await db.run(sql`DROP TABLE \`quotes\`;`)
  await db.run(sql`DROP TABLE \`enquiries\`;`)
  await db.run(sql`DROP TABLE \`customers_addresses\`;`)
  await db.run(sql`DROP TABLE \`customers_sessions\`;`)
  await db.run(sql`DROP TABLE \`customers\`;`)
  await db.run(sql`DROP TABLE \`customers_rels\`;`)
  await db.run(sql`DROP TABLE \`price_lists_overrides_price_tiers\`;`)
  await db.run(sql`DROP TABLE \`price_lists_overrides\`;`)
  await db.run(sql`DROP TABLE \`price_lists\`;`)
  await db.run(sql`DROP TABLE \`pages_sections\`;`)
  await db.run(sql`DROP TABLE \`pages\`;`)
  await db.run(sql`DROP TABLE \`reviews\`;`)
  await db.run(sql`DROP TABLE \`media\`;`)
  await db.run(sql`DROP TABLE \`users_sessions\`;`)
  await db.run(sql`DROP TABLE \`users\`;`)
  await db.run(sql`DROP TABLE \`payload_kv\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_migrations\`;`)
  await db.run(sql`DROP TABLE \`settings_business_locations\`;`)
  await db.run(sql`DROP TABLE \`settings_trust\`;`)
  await db.run(sql`DROP TABLE \`settings\`;`)
}
