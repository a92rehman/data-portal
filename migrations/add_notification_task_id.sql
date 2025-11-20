-- Add task_id column to notifications table
ALTER TABLE notifications ADD COLUMN task_id varchar REFERENCES tasks(id) ON DELETE CASCADE;

