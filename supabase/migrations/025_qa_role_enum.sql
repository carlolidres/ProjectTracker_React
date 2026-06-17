-- Step 1 of 2: Add QA role to user_role enum.
-- PostgreSQL requires ALTER TYPE ... ADD VALUE to be committed before the new
-- value can be used in the same session/transaction.
--
-- Supabase SQL Editor: run this file ALONE first, then run 026_qa_cnf_fields.sql
-- in a separate New query. IF NOT EXISTS makes this safe to re-run if a prior
-- attempt partially added 'qa'.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'qa';
