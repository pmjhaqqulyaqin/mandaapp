-- Aturan Jadwal (Scheduling Rules)
CREATE TABLE IF NOT EXISTS scheduling_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type VARCHAR(50) NOT NULL,
  subject_ids JSONB NOT NULL,
  class_scope VARCHAR(20) DEFAULT 'all',
  class_ids JSONB,
  params JSONB,
  priority VARCHAR(20) DEFAULT 'normal',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduling_rules_type ON scheduling_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_scheduling_rules_active ON scheduling_rules(is_active);
