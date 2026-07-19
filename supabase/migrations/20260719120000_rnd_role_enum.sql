-- Step 1 of 2: Add RnD role to user_role enum.
-- PostgreSQL requires ALTER TYPE ... ADD VALUE to be committed before the new
-- value can be used in later statements/migrations.
-- Apply this migration alone first, then 20260719120100_rnd_role_helpers.sql.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'rnd';
