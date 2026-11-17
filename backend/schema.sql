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
  base_quantity NUMERIC(12, 4) NOT NULL DEFAULT 100 CHECK (base_quantity > 0),
  base_unit TEXT NOT NULL DEFAULT 'g' CHECK (length(trim(base_unit)) BETWEEN 1 AND 30),
  energy_kcal_per_100g NUMERIC(10, 2) NOT NULL CHECK (energy_kcal_per_100g >= 0),
  protein_g_per_100g NUMERIC(10, 2) CHECK (protein_g_per_100g IS NULL OR protein_g_per_100g >= 0),
  lipid_g_per_100g NUMERIC(10, 2) CHECK (lipid_g_per_100g IS NULL OR lipid_g_per_100g >= 0),
  carbohydrate_g_per_100g NUMERIC(10, 2) CHECK (carbohydrate_g_per_100g IS NULL OR carbohydrate_g_per_100g >= 0),
  source TEXT NOT NULL,
  source_id TEXT,
  source_code TEXT,
  source_version TEXT NOT NULL,
  source_url TEXT,
  source_locator TEXT,
  source_sha256 TEXT,
  quality_flags TEXT,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE foods ALTER COLUMN fdc_id DROP NOT NULL;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS source_code TEXT;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS base_quantity NUMERIC(12, 4) NOT NULL DEFAULT 100;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS base_unit TEXT NOT NULL DEFAULT 'g';
ALTER TABLE foods ADD COLUMN IF NOT EXISTS protein_g_per_100g NUMERIC(10, 2);
ALTER TABLE foods ADD COLUMN IF NOT EXISTS lipid_g_per_100g NUMERIC(10, 2);
ALTER TABLE foods ADD COLUMN IF NOT EXISTS carbohydrate_g_per_100g NUMERIC(10, 2);
ALTER TABLE foods ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS source_locator TEXT;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS source_sha256 TEXT;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS quality_flags TEXT;
ALTER TABLE foods ADD COLUMN IF NOT EXISTS retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE foods SET source_id = CONCAT('fdc:', fdc_id) WHERE source_id IS NULL AND fdc_id IS NOT NULL;
UPDATE foods SET source_code = source_id WHERE source_code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS foods_source_source_id_idx ON foods (source, source_id) WHERE source_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS foods_source_source_code_idx ON foods (source, source_code) WHERE source_code IS NOT NULL;

ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS food_id UUID REFERENCES foods(id);
CREATE INDEX IF NOT EXISTS inventory_items_food_id_idx ON inventory_items (food_id);

CREATE TABLE IF NOT EXISTS nutrition_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  weight_kg NUMERIC(6, 2) CHECK (weight_kg IS NULL OR weight_kg > 0),
  height_cm NUMERIC(5, 2) CHECK (height_cm IS NULL OR height_cm > 0),
  age_years SMALLINT CHECK (age_years IS NULL OR age_years BETWEEN 18 AND 120),
  sex_for_equation TEXT CHECK (sex_for_equation IS NULL OR sex_for_equation IN ('male', 'female')),
  activity_factor NUMERIC(4, 2) CHECK (activity_factor IS NULL OR activity_factor > 0),
  target_kcal NUMERIC(8, 2) CHECK (target_kcal IS NULL OR target_kcal > 0),
  target_method TEXT NOT NULL DEFAULT 'manual' CHECK (target_method IN ('manual', 'estimated')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  servings NUMERIC(8, 2) NOT NULL CHECK (servings > 0),
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  line_no SMALLINT NOT NULL CHECK (line_no > 0),
  food_id UUID NOT NULL REFERENCES foods(id),
  quantity NUMERIC(12, 4) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL CHECK (length(trim(unit)) BETWEEN 1 AND 30),
  PRIMARY KEY (recipe_id, line_no)
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  target_kcal NUMERIC(10, 2) NOT NULL CHECK (target_kcal > 0),
  total_kcal NUMERIC(12, 2) NOT NULL CHECK (total_kcal >= 0),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('draft', 'confirmed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS meal_plans_user_plan_date_idx ON meal_plans (user_id, plan_date DESC);

CREATE TABLE IF NOT EXISTS meal_plan_items (
  plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  line_no SMALLINT NOT NULL CHECK (line_no > 0),
  recipe_id UUID NOT NULL REFERENCES recipes(id),
  meal_slot TEXT NOT NULL CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack')),
  servings NUMERIC(8, 2) NOT NULL CHECK (servings > 0),
  energy_snapshot NUMERIC(12, 2) NOT NULL CHECK (energy_snapshot >= 0),
  PRIMARY KEY (plan_id, line_no)
);
