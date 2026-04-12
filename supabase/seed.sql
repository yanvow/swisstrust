-- ============================================================
-- SwissTrust — Seed data: Swiss agencies
-- Run AFTER schema.sql
-- These are pre-seeded agencies (no login account — user_id is NULL)
-- When an agency self-registers, user_id is populated.
-- ============================================================

INSERT INTO agencies (company_name, address, contact_email, is_verified) VALUES
  ('Moser Vernet & Cie',    'Rue Ami-Lullin 4, 1207 Genève',               'info@moservernet.ch',    true),
  ('Naef Immobilier',       'Rue de Rive 14, 1204 Genève',                  'info@naef.ch',           true),
  ('Régie du Rhône',        'Boulevard du Pont-d''Arve 28, 1205 Genève',    'info@regie-rhone.ch',    true),
  ('ASLOCA Genève',         'Rue du Lac 12, 1207 Genève',                   'info@asloca-ge.ch',      true),
  ('Immoflex SA',           'Avenue de la Gare 10, 1003 Lausanne',          'info@immoflex.ch',       true),
  ('Privera AG',            'Nordring 4, 3001 Bern',                        'info@privera.ch',        true),
  ('Wincasa AG',            'Pfingstweidstrasse 60, 8005 Zürich',           'info@wincasa.ch',        true),
  ('Livit AG',              'Altstetterstrasse 124, 8048 Zürich',           'info@livit.ch',          true),
  ('CBRE Switzerland',      'Rue du Rhône 80, 1204 Genève',                 'info@cbre.ch',           true),
  ('JLL Switzerland',       'Seestrasse 39, 8700 Küsnacht',                 'info@jll.ch',            true);
