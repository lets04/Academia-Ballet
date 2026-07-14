-- Add instructor, capacity, and level columns to groups table
ALTER TABLE groups
ADD COLUMN IF NOT EXISTS instructor text,
ADD COLUMN IF NOT EXISTS capacity integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS level text;
