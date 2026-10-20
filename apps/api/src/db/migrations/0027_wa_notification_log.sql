-- WhatsApp Notification Log — Audit Trail & Monitoring
CREATE TABLE IF NOT EXISTS "wa_notification_log" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "student_id"          uuid REFERENCES "student_profiles"("id") ON DELETE SET NULL,
  "phone"               varchar(50) NOT NULL,
  "parent_name"         varchar(255),
  "message_type"        varchar(50) NOT NULL DEFAULT 'attendance',
  "status_sent"         varchar(20) NOT NULL,
  "delivery_status"     varchar(20) NOT NULL DEFAULT 'pending',
  "error_message"       text,
  "gateway_message_id"  varchar(255),
  "retry_count"         integer DEFAULT 0,
  "created_at"          timestamp DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_log_created   ON wa_notification_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_log_delivery  ON wa_notification_log(delivery_status);
CREATE INDEX IF NOT EXISTS idx_wa_log_student   ON wa_notification_log(student_id);
