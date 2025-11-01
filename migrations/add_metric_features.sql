CREATE TABLE IF NOT EXISTS metric_features (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id VARCHAR NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  threshold TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_by_id VARCHAR REFERENCES users(id),
  updated_by_id VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metric_features_metric_id ON metric_features(metric_id);


