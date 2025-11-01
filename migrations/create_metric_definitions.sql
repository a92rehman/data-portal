-- Migration: Create metric_types and metrics tables
-- This migration creates tables for storing metric type definitions and individual metrics

-- Create metric_types table
CREATE TABLE IF NOT EXISTS metric_types (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL UNIQUE,
  what_are_they TEXT NOT NULL,
  focus TEXT NOT NULL,
  why_they_matter TEXT NOT NULL,
  key_question TEXT NOT NULL,
  primary_audience TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_by_id VARCHAR REFERENCES users(id),
  updated_by_id VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create metrics table
CREATE TABLE IF NOT EXISTS metrics (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type_id VARCHAR NOT NULL REFERENCES metric_types(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  definition TEXT NOT NULL,
  threshold TEXT,
  order_index INTEGER DEFAULT 0,
  created_by_id VARCHAR REFERENCES users(id),
  updated_by_id VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_metric_types_order ON metric_types(order_index);
CREATE INDEX IF NOT EXISTS idx_metrics_type_id ON metrics(metric_type_id);
CREATE INDEX IF NOT EXISTS idx_metrics_order ON metrics(order_index);
CREATE INDEX IF NOT EXISTS idx_metric_types_created_by ON metric_types(created_by_id);
CREATE INDEX IF NOT EXISTS idx_metrics_created_by ON metrics(created_by_id);



