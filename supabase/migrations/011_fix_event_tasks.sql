-- Fix event_tasks table structure
-- Add missing is_completed column

-- Add missing is_completed column if it doesn't exist
ALTER TABLE event_tasks 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;

-- Verify the structure of event_tasks
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'event_tasks' 
ORDER BY ordinal_position;
