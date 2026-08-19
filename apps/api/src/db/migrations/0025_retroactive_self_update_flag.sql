-- Retroactively mark students who have already completed self-update
-- Detection: students who have NIK filled AND have parent_profiles records
-- (these fields are only filled via the self-update portal)
UPDATE student_profiles
SET self_update_completed = true,
    self_update_at = updated_at
WHERE id IN (
  SELECT DISTINCT sp.id
  FROM student_profiles sp
  INNER JOIN parent_profiles pp ON pp.student_id = sp.id
  WHERE sp.nik IS NOT NULL
    AND sp.nik != ''
    AND sp.self_update_completed = false
);
