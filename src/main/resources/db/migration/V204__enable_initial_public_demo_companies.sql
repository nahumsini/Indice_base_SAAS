-- Initial public demo catalog selected by platform administration.
-- IDs correspond to the existing production accounts shown in Root:
-- 18 Tacos El Amigo
-- 22 Aceros y Aluminios
-- 29 Ferretería Horizonte
-- 30 Nova Consultoría
-- 31 Estacionamientos
-- 37 Supermercados Horizonte

UPDATE companies
SET public_demo_enabled = TRUE
WHERE id IN (18, 22, 29, 30, 31, 37)
  AND commercial_account_type = 'SUPER_ADMIN';
