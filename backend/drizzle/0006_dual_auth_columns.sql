ALTER TABLE "sessions"
  ADD COLUMN "ip_address" varchar(45),
  ADD COLUMN "user_agent" varchar(255);

ALTER TABLE "telemetry_events"
  ADD COLUMN "user_id" uuid;

ALTER TABLE "telemetry_events"
  ADD CONSTRAINT "telemetry_events_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
