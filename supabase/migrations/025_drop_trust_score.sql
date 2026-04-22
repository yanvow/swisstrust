-- Migration 025 — Remove A/B/C trust score from certificates
-- Validity is now computed dynamically in JS based on current document state.

ALTER TABLE certificates DROP COLUMN IF EXISTS trust_score;
