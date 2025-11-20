-- Add task_id column to notifications table if it does not exist
ALTER TABLE IF EXISTS notifications
  ADD COLUMN IF NOT EXISTS task_id varchar;

-- Ensure foreign key constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_task_id_tasks_id_fk'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_task_id_tasks_id_fk
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;
END $$;
