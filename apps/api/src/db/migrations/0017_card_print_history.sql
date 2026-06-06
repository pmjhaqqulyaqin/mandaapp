-- Card Print History
CREATE TABLE IF NOT EXISTS card_print_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  print_type VARCHAR(20) NOT NULL DEFAULT 'single',
  student_count INTEGER NOT NULL DEFAULT 1,
  class_filter VARCHAR(100),
  orientation VARCHAR(20) DEFAULT 'vertical',
  template_used VARCHAR(50) DEFAULT 'classic-blue',
  student_names TEXT,
  printed_by TEXT REFERENCES "user"(id),
  printed_at TIMESTAMP DEFAULT NOW()
);
