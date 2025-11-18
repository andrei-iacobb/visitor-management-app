-- Migration: Add vehicle details columns for SharePoint sync
-- Date: 2025-01-18
-- Description: Add make, model, year, and notes columns to vehicles table

-- Add new columns to vehicles table
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS make VARCHAR(100),
ADD COLUMN IF NOT EXISTS model VARCHAR(100),
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment to document the change
COMMENT ON COLUMN vehicles.make IS 'Vehicle manufacturer (e.g., Toyota, Ford)';
COMMENT ON COLUMN vehicles.model IS 'Vehicle model (e.g., Camry, F-150)';
COMMENT ON COLUMN vehicles.year IS 'Vehicle manufacturing year';
COMMENT ON COLUMN vehicles.notes IS 'Additional notes about the vehicle';
