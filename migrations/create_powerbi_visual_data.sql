-- Create powerbi_visual_data table for storing extracted visual data
CREATE TABLE IF NOT EXISTS powerbi_visual_data (
  id SERIAL PRIMARY KEY,
  report_id VARCHAR(255) NOT NULL,
  page_name VARCHAR(255) NOT NULL,
  visual_name VARCHAR(255) NOT NULL,
  visual_type VARCHAR(100) NOT NULL,
  data_json JSONB NOT NULL,
  metadata_json JSONB NOT NULL,
  extracted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on report_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_powerbi_visual_data_report_id ON powerbi_visual_data(report_id);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_powerbi_visual_data_expires_at ON powerbi_visual_data(expires_at);

-- Create composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_powerbi_visual_data_report_expires ON powerbi_visual_data(report_id, expires_at);


