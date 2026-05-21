CREATE TABLE "buku_induk_class_mapels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"mapels" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "buku_induk_class_mapels_class_id_unique" UNIQUE("class_id")
);
--> statement-breakpoint
ALTER TABLE "buku_induk_class_mapels" ADD CONSTRAINT "buku_induk_class_mapels_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;