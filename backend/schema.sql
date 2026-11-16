CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  height_cm NUMERIC(5, 2) CONSTRAINT users_height_cm_range CHECK (height_cm IS NULL OR (height_cm > 0 AND height_cm <= 300)),
  weight_kg NUMERIC(5, 2) CONSTRAINT users_weight_kg_range CHECK (weight_kg IS NULL OR (weight_kg > 0 AND weight_kg <= 500)),
  daily_calorie_target INTEGER CONSTRAINT users_daily_calorie_target_range CHECK (daily_calorie_target IS NULL OR (daily_calorie_target > 0 AND daily_calorie_target <= 10000)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5, 2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5, 2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_calorie_target INTEGER;

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_height_cm_range CHECK (height_cm IS NULL OR (height_cm > 0 AND height_cm <= 300));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_weight_kg_range CHECK (weight_kg IS NULL OR (weight_kg > 0 AND weight_kg <= 500));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_daily_calorie_target_range CHECK (daily_calorie_target IS NULL OR (daily_calorie_target > 0 AND daily_calorie_target <= 10000));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity >= 0),
  unit TEXT NOT NULL CHECK (length(trim(unit)) BETWEEN 1 AND 30),
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS inventory_items_user_id_idx ON inventory_items (user_id);

CREATE INDEX IF NOT EXISTS inventory_items_expiry_date_idx ON inventory_items (expiry_date);

CREATE TABLE IF NOT EXISTS foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fdc_id INTEGER UNIQUE,
  description TEXT NOT NULL,
  energy_kcal_per_100g NUMERIC(10, 2) NOT NULL CHECK (energy_kcal_per_100g >= 0),
  source TEXT NOT NULL,
  source_id TEXT,
  source_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE foods ALTER COLUMN fdc_id DROP NOT NULL;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS source_id TEXT;
UPDATE foods SET source_id = CONCAT('fdc:', fdc_id) WHERE source_id IS NULL AND fdc_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS foods_source_source_id_idx ON foods (source, source_id) WHERE source_id IS NOT NULL;

ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS food_id UUID REFERENCES foods(id);
CREATE INDEX IF NOT EXISTS inventory_items_food_id_idx ON inventory_items (food_id);
