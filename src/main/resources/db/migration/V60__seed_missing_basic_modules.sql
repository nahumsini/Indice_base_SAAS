INSERT INTO modules (slug, name, description, icon, badge_text, tier, sort_order, is_core, is_active)
SELECT
    'petty_cash',
    'Caja Chica',
    'Control de caja chica y gastos operativos',
    'bi-wallet2',
    NULL,
    'pro',
    2,
    0,
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM modules
    WHERE slug = 'petty_cash'
);

INSERT INTO modules (slug, name, description, icon, badge_text, tier, sort_order, is_core, is_active)
SELECT
    'kpis',
    'KPIs',
    'Indicadores operativos y tableros ejecutivos',
    'bi-bar-chart-line',
    NULL,
    'pro',
    5,
    0,
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM modules
    WHERE slug = 'kpis'
);
