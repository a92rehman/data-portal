-- One-time fix for delivered requests with incorrect status
-- Run this SQL directly on your production database

UPDATE data_requests
SET status = 'completed', updated_at = NOW()
WHERE delivered_at IS NOT NULL 
  AND status != 'completed';

-- Show results
SELECT COUNT(*) as fixed_count 
FROM data_requests 
WHERE delivered_at IS NOT NULL AND status = 'completed';
