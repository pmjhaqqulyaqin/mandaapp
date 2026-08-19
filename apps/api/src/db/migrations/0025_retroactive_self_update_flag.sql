-- Retroactively mark students who have already completed self-update
-- Detection: students who have ANY of these (only available via self-update portal):
--   1. parent_profiles records, OR
--   2. education_history records, OR
--   3. physical_data records, OR
--   4. NIK filled (not from import)
UPDATE student_profiles
SET self_update_completed = true,
    self_update_at = COALESCE(updated_at, created_at, NOW())
WHERE self_update_completed = false
  AND (
    -- Has parent data
    EXISTS (SELECT 1 FROM parent_profiles pp WHERE pp.student_id = student_profiles.id)
    -- Has education data
    OR EXISTS (SELECT 1 FROM education_history eh WHERE eh.student_id = student_profiles.id)
    -- Has physical data
    OR EXISTS (SELECT 1 FROM physical_data pd WHERE pd.student_id = student_profiles.id)
    -- Has NIK filled (only from self-update form)
    OR (nik IS NOT NULL AND nik != '')
  );
