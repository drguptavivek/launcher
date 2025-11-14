CREATE TYPE "public"."project_geographic_scope" AS ENUM('NATIONAL', 'REGIONAL');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
ALTER TYPE "public"."resource_type" ADD VALUE 'PROJECTS';--> statement-breakpoint
CREATE TABLE "project_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"assigned_by" uuid NOT NULL,
	"role_in_project" varchar(100),
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"assigned_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project_team_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"assigned_by" uuid NOT NULL,
	"assigned_role" varchar(100),
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"assigned_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"abbreviation" varchar(50) NOT NULL,
	"contact_person_details" text,
	"status" "project_status" DEFAULT 'ACTIVE' NOT NULL,
	"geographic_scope" "project_geographic_scope" DEFAULT 'NATIONAL' NOT NULL,
	"region_id" uuid,
	"organization_id" uuid DEFAULT 'org-default' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "projects_abbreviation_unique" UNIQUE("abbreviation")
);
--> statement-breakpoint
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team_assignments" ADD CONSTRAINT "project_team_assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team_assignments" ADD CONSTRAINT "project_team_assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team_assignments" ADD CONSTRAINT "project_team_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_region_id_teams_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_project_assignment_unique" ON "project_assignments" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_project_assignment_project" ON "project_assignments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_project_assignment_user" ON "project_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_project_assignment_active" ON "project_assignments" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_project_team_assignment_unique" ON "project_team_assignments" USING btree ("project_id","team_id");--> statement-breakpoint
CREATE INDEX "idx_project_team_assignment_project" ON "project_team_assignments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_project_team_assignment_team" ON "project_team_assignments" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_project_team_assignment_active" ON "project_team_assignments" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_project_abbreviation" ON "projects" USING btree ("abbreviation");--> statement-breakpoint
CREATE INDEX "idx_project_status" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_project_organization" ON "projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_project_created_by" ON "projects" USING btree ("created_by");