-- Additive recovery for installations whose adopted history predates the ledger structures.
-- Never rewrites Flyway history or existing accounts, settings, entries, or documents.
-- Existing structures are preserved; incomplete incompatible structures fail visibly.

SET @kpi_closeout_ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_accounting_accounts' AND COLUMN_NAME = 'parent_account_id') = 0, 'ALTER TABLE finance_accounting_accounts ADD COLUMN parent_account_id BIGINT NULL AFTER business_id', 'SELECT 1');
PREPARE kpi_closeout_statement FROM @kpi_closeout_ddl;
EXECUTE kpi_closeout_statement;
DEALLOCATE PREPARE kpi_closeout_statement;

SET @kpi_closeout_ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_accounting_accounts' AND COLUMN_NAME = 'system_code') = 0, 'ALTER TABLE finance_accounting_accounts ADD COLUMN system_code VARCHAR(80) NULL AFTER code', 'SELECT 1');
PREPARE kpi_closeout_statement FROM @kpi_closeout_ddl;
EXECUTE kpi_closeout_statement;
DEALLOCATE PREPARE kpi_closeout_statement;

SET @kpi_closeout_ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_accounting_accounts' AND COLUMN_NAME = 'account_type') = 0, 'ALTER TABLE finance_accounting_accounts ADD COLUMN account_type VARCHAR(32) NOT NULL DEFAULT ''EXPENSE'' AFTER description', 'SELECT 1');
PREPARE kpi_closeout_statement FROM @kpi_closeout_ddl;
EXECUTE kpi_closeout_statement;
DEALLOCATE PREPARE kpi_closeout_statement;

SET @kpi_closeout_ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_accounting_accounts' AND COLUMN_NAME = 'natural_balance') = 0, 'ALTER TABLE finance_accounting_accounts ADD COLUMN natural_balance VARCHAR(16) NOT NULL DEFAULT ''DEBIT'' AFTER account_type', 'SELECT 1');
PREPARE kpi_closeout_statement FROM @kpi_closeout_ddl;
EXECUTE kpi_closeout_statement;
DEALLOCATE PREPARE kpi_closeout_statement;

SET @kpi_closeout_ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_accounting_accounts' AND COLUMN_NAME = 'is_postable') = 0, 'ALTER TABLE finance_accounting_accounts ADD COLUMN is_postable BOOLEAN NOT NULL DEFAULT TRUE AFTER natural_balance', 'SELECT 1');
PREPARE kpi_closeout_statement FROM @kpi_closeout_ddl;
EXECUTE kpi_closeout_statement;
DEALLOCATE PREPARE kpi_closeout_statement;

SET @kpi_closeout_ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_accounting_accounts' AND COLUMN_NAME = 'statement_section') = 0, 'ALTER TABLE finance_accounting_accounts ADD COLUMN statement_section VARCHAR(64) NULL AFTER is_postable', 'SELECT 1');
PREPARE kpi_closeout_statement FROM @kpi_closeout_ddl;
EXECUTE kpi_closeout_statement;
DEALLOCATE PREPARE kpi_closeout_statement;

SET @kpi_closeout_ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_accounting_accounts' AND COLUMN_NAME = 'statement_line_code') = 0, 'ALTER TABLE finance_accounting_accounts ADD COLUMN statement_line_code VARCHAR(80) NULL AFTER statement_section', 'SELECT 1');
PREPARE kpi_closeout_statement FROM @kpi_closeout_ddl;
EXECUTE kpi_closeout_statement;
DEALLOCATE PREPARE kpi_closeout_statement;

SET @kpi_closeout_ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_accounting_accounts' AND COLUMN_NAME = 'sort_order') = 0, 'ALTER TABLE finance_accounting_accounts ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER statement_line_code', 'SELECT 1');
PREPARE kpi_closeout_statement FROM @kpi_closeout_ddl;
EXECUTE kpi_closeout_statement;
DEALLOCATE PREPARE kpi_closeout_statement;

SET @kpi_closeout_ddl = IF((SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_accounting_accounts' AND INDEX_NAME = 'uq_fin_accounts_company_system_code') = 0, 'ALTER TABLE finance_accounting_accounts ADD UNIQUE KEY uq_fin_accounts_company_system_code (company_id, system_code)', 'SELECT 1');
PREPARE kpi_closeout_statement FROM @kpi_closeout_ddl;
EXECUTE kpi_closeout_statement;
DEALLOCATE PREPARE kpi_closeout_statement;

SET @kpi_closeout_ddl = IF((SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_accounting_accounts' AND INDEX_NAME = 'idx_fin_accounts_company_type') = 0, 'ALTER TABLE finance_accounting_accounts ADD KEY idx_fin_accounts_company_type (company_id, account_type, status)', 'SELECT 1');
PREPARE kpi_closeout_statement FROM @kpi_closeout_ddl;
EXECUTE kpi_closeout_statement;
DEALLOCATE PREPARE kpi_closeout_statement;

SET @kpi_closeout_ddl = IF((SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_accounting_accounts' AND INDEX_NAME = 'idx_fin_accounts_parent') = 0, 'ALTER TABLE finance_accounting_accounts ADD KEY idx_fin_accounts_parent (parent_account_id)', 'SELECT 1');
PREPARE kpi_closeout_statement FROM @kpi_closeout_ddl;
EXECUTE kpi_closeout_statement;
DEALLOCATE PREPARE kpi_closeout_statement;

SET @kpi_closeout_ddl = IF((SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_accounting_accounts' AND CONSTRAINT_NAME = 'fk_fin_accounts_parent') = 0, 'ALTER TABLE finance_accounting_accounts ADD CONSTRAINT fk_fin_accounts_parent FOREIGN KEY (parent_account_id) REFERENCES finance_accounting_accounts(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE kpi_closeout_statement FROM @kpi_closeout_ddl;
EXECUTE kpi_closeout_statement;
DEALLOCATE PREPARE kpi_closeout_statement;

SET @kpi_closeout_ddl = IF((SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_accounting_accounts' AND CONSTRAINT_NAME = 'chk_fin_accounts_type') = 0, 'ALTER TABLE finance_accounting_accounts ADD CONSTRAINT chk_fin_accounts_type CHECK (account_type IN (''ASSET'', ''LIABILITY'', ''EQUITY'', ''REVENUE'', ''EXPENSE'', ''OCI''))', 'SELECT 1');
PREPARE kpi_closeout_statement FROM @kpi_closeout_ddl;
EXECUTE kpi_closeout_statement;
DEALLOCATE PREPARE kpi_closeout_statement;

SET @kpi_closeout_ddl = IF((SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_accounting_accounts' AND CONSTRAINT_NAME = 'chk_fin_accounts_natural_balance') = 0, 'ALTER TABLE finance_accounting_accounts ADD CONSTRAINT chk_fin_accounts_natural_balance CHECK (natural_balance IN (''DEBIT'', ''CREDIT''))', 'SELECT 1');
PREPARE kpi_closeout_statement FROM @kpi_closeout_ddl;
EXECUTE kpi_closeout_statement;
DEALLOCATE PREPARE kpi_closeout_statement;

CREATE TABLE IF NOT EXISTS finance_accounting_settings (
  company_id BIGINT NOT NULL,
  reporting_framework VARCHAR(40) NOT NULL DEFAULT 'IFRS_SMES_2015',
  framework_effective_date DATE NOT NULL DEFAULT '2017-01-01',
  functional_currency VARCHAR(3) NOT NULL,
  presentation_currency VARCHAR(3) NOT NULL,
  fiscal_year_start_month TINYINT NOT NULL DEFAULT 1,
  created_by_user_id BIGINT NULL,
  updated_by_user_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  version BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id),
  CONSTRAINT fk_fin_accounting_settings_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_fin_accounting_settings_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_fin_accounting_settings_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_fin_accounting_settings_framework CHECK (
    reporting_framework IN ('IFRS_SMES_2015', 'IFRS_SMES_2025', 'FULL_IFRS_IAS1', 'FULL_IFRS_18')
  ),
  CONSTRAINT chk_fin_accounting_settings_month CHECK (fiscal_year_start_month BETWEEN 1 AND 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS finance_accounting_periods (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  period_key VARCHAR(32) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  framework_snapshot VARCHAR(40) NOT NULL,
  functional_currency_snapshot VARCHAR(3) NOT NULL,
  closed_by_user_id BIGINT NULL,
  closed_at TIMESTAMP NULL,
  reopened_by_user_id BIGINT NULL,
  reopened_at TIMESTAMP NULL,
  reopen_reason VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  version BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fin_accounting_period_company_key (company_id, period_key),
  KEY idx_fin_accounting_period_company_dates (company_id, period_start, period_end),
  CONSTRAINT fk_fin_accounting_period_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_fin_accounting_period_closed_by
    FOREIGN KEY (closed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_fin_accounting_period_reopened_by
    FOREIGN KEY (reopened_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_fin_accounting_period_status CHECK (status IN ('OPEN', 'REVIEW', 'CLOSED')),
  CONSTRAINT chk_fin_accounting_period_dates CHECK (period_start <= period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS finance_journal_entries (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  period_id BIGINT NOT NULL,
  entry_number VARCHAR(48) NOT NULL,
  entry_date DATE NOT NULL,
  journal_type VARCHAR(32) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  description VARCHAR(500) NOT NULL,
  source_module VARCHAR(64) NOT NULL,
  source_type VARCHAR(80) NOT NULL,
  source_id VARCHAR(120) NOT NULL,
  source_event_key VARCHAR(220) NOT NULL,
  source_fingerprint CHAR(64) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  exchange_rate DECIMAL(19,8) NOT NULL DEFAULT 1.00000000,
  reversal_of_entry_id BIGINT NULL,
  created_by_user_id BIGINT NULL,
  posted_by_user_id BIGINT NULL,
  reversed_by_user_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  posted_at TIMESTAMP NULL,
  reversed_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fin_journal_entry_company_number (company_id, entry_number),
  UNIQUE KEY uq_fin_journal_entry_company_source (company_id, source_event_key),
  KEY idx_fin_journal_entry_company_date (company_id, entry_date, status),
  KEY idx_fin_journal_entry_period (company_id, period_id, status),
  KEY idx_fin_journal_entry_reversal (reversal_of_entry_id),
  CONSTRAINT fk_fin_journal_entry_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_fin_journal_entry_period
    FOREIGN KEY (period_id) REFERENCES finance_accounting_periods(id) ON DELETE RESTRICT,
  CONSTRAINT fk_fin_journal_entry_reversal
    FOREIGN KEY (reversal_of_entry_id) REFERENCES finance_journal_entries(id) ON DELETE RESTRICT,
  CONSTRAINT fk_fin_journal_entry_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_fin_journal_entry_posted_by
    FOREIGN KEY (posted_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_fin_journal_entry_reversed_by
    FOREIGN KEY (reversed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_fin_journal_entry_status CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED')),
  CONSTRAINT chk_fin_journal_entry_type CHECK (
    journal_type IN ('OPENING', 'SALES', 'EXPENSE', 'PAYROLL', 'INVENTORY', 'CASH',
                     'ADJUSTMENT', 'CLOSING', 'REVERSAL')
  ),
  CONSTRAINT chk_fin_journal_entry_rate CHECK (exchange_rate > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS finance_journal_lines (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  entry_id BIGINT NOT NULL,
  account_id BIGINT NOT NULL,
  line_number INT NOT NULL,
  unit_id BIGINT NULL,
  business_id BIGINT NULL,
  description VARCHAR(500) NOT NULL,
  debit_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  credit_amount DECIMAL(19,4) NOT NULL DEFAULT 0.0000,
  transaction_amount DECIMAL(19,4) NOT NULL,
  transaction_currency VARCHAR(3) NOT NULL,
  functional_amount DECIMAL(19,4) NOT NULL,
  functional_currency VARCHAR(3) NOT NULL,
  exchange_rate DECIMAL(19,8) NOT NULL,
  source_document_reference VARCHAR(160) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fin_journal_line_entry_number (entry_id, line_number),
  KEY idx_fin_journal_line_company_account (company_id, account_id),
  KEY idx_fin_journal_line_company_unit (company_id, unit_id),
  KEY idx_fin_journal_line_company_business (company_id, business_id),
  CONSTRAINT fk_fin_journal_line_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_fin_journal_line_entry
    FOREIGN KEY (entry_id) REFERENCES finance_journal_entries(id) ON DELETE RESTRICT,
  CONSTRAINT fk_fin_journal_line_account
    FOREIGN KEY (account_id) REFERENCES finance_accounting_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_fin_journal_line_unit
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
  CONSTRAINT fk_fin_journal_line_business
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL,
  CONSTRAINT chk_fin_journal_line_sides CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0)
  ),
  CONSTRAINT chk_fin_journal_line_amounts CHECK (
    transaction_amount > 0 AND functional_amount > 0 AND exchange_rate > 0
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS finance_accounting_sync_runs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  requested_from DATE NOT NULL,
  requested_to DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  discovered_count INT NOT NULL DEFAULT 0,
  posted_count INT NOT NULL DEFAULT 0,
  skipped_count INT NOT NULL DEFAULT 0,
  blocked_count INT NOT NULL DEFAULT 0,
  issues_json JSON NULL,
  initiated_by_user_id BIGINT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY idx_fin_sync_run_company_started (company_id, started_at),
  CONSTRAINT fk_fin_sync_run_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_fin_sync_run_initiated_by
    FOREIGN KEY (initiated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_fin_sync_run_status CHECK (status IN ('RUNNING', 'COMPLETED', 'COMPLETED_WITH_ISSUES', 'FAILED')),
  CONSTRAINT chk_fin_sync_run_dates CHECK (requested_from <= requested_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS finance_financial_report_runs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  comparative_start DATE NOT NULL,
  comparative_end DATE NOT NULL,
  reporting_framework VARCHAR(40) NOT NULL,
  presentation_currency VARCHAR(3) NOT NULL,
  status VARCHAR(24) NOT NULL,
  decision_ready BOOLEAN NOT NULL DEFAULT FALSE,
  quality_json JSON NOT NULL,
  payload_hash CHAR(64) NULL,
  generated_by_user_id BIGINT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fin_report_run_company_period (company_id, period_end, generated_at),
  CONSTRAINT fk_fin_report_run_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_fin_report_run_generated_by
    FOREIGN KEY (generated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_fin_report_run_status CHECK (status IN ('PRELIMINARY', 'READY', 'CLOSED')),
  CONSTRAINT chk_fin_report_run_dates CHECK (
    period_start <= period_end AND comparative_start <= comparative_end
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO finance_accounting_settings
  (company_id, reporting_framework, framework_effective_date, functional_currency,
   presentation_currency)
SELECT company.id,
       'IFRS_SMES_2015',
       '2017-01-01',
       UPPER(COALESCE(
         NULLIF(JSON_UNQUOTE(JSON_EXTRACT(settings.settings_json,
           '$.config_center.empresa_template.currency')), ''),
         'MXN'
       )),
       UPPER(COALESCE(
         NULLIF(JSON_UNQUOTE(JSON_EXTRACT(settings.settings_json,
           '$.config_center.empresa_template.currency')), ''),
         'MXN'
       ))
FROM companies company
LEFT JOIN company_settings settings ON settings.company_id = company.id
ON DUPLICATE KEY UPDATE company_id = VALUES(company_id);

INSERT IGNORE INTO finance_accounting_accounts
  (company_id, code, system_code, name, group_key, description, account_type,
   natural_balance, is_postable, statement_section, statement_line_code, sort_order,
   status, created_at, version)
SELECT company.id, chart.code, chart.system_code, chart.name, chart.group_key,
       chart.description, chart.account_type, chart.natural_balance, TRUE,
       chart.statement_section, chart.statement_line_code, chart.sort_order,
       'ACTIVE', CURRENT_TIMESTAMP, 0
FROM companies company
CROSS JOIN (
  SELECT '1000' code, 'CASH' system_code, 'Efectivo y equivalentes' name, 'OTHER' group_key,
         'Cuenta de control para efectivo y equivalentes.' description, 'ASSET' account_type,
         'DEBIT' natural_balance, 'CURRENT_ASSETS' statement_section,
         'CASH_AND_EQUIVALENTS' statement_line_code, 100 sort_order
  UNION ALL SELECT '1100', 'ACCOUNTS_RECEIVABLE', 'Cuentas por cobrar', 'OTHER',
         'Cuenta de control para clientes y otros deudores.', 'ASSET', 'DEBIT',
         'CURRENT_ASSETS', 'TRADE_RECEIVABLES', 110
  UNION ALL SELECT '1200', 'INVENTORY', 'Inventarios', 'OTHER',
         'Inventario medido con evidencia de costo.', 'ASSET', 'DEBIT',
         'CURRENT_ASSETS', 'INVENTORIES', 120
  UNION ALL SELECT '1300', 'PREPAID_EXPENSES', 'Pagos anticipados', 'OTHER',
         'Pagos que se reconocerán como gasto en periodos posteriores.', 'ASSET', 'DEBIT',
         'CURRENT_ASSETS', 'PREPAYMENTS', 130
  UNION ALL SELECT '1500', 'PROPERTY_PLANT_EQUIPMENT', 'Propiedad, planta y equipo', 'OTHER',
         'Costo de activos de larga duración.', 'ASSET', 'DEBIT',
         'NON_CURRENT_ASSETS', 'PROPERTY_PLANT_EQUIPMENT', 150
  UNION ALL SELECT '1590', 'ACCUMULATED_DEPRECIATION', 'Depreciación acumulada', 'OTHER',
         'Cuenta correctora de propiedad, planta y equipo.', 'ASSET', 'CREDIT',
         'NON_CURRENT_ASSETS', 'ACCUMULATED_DEPRECIATION', 159
  UNION ALL SELECT '2000', 'ACCOUNTS_PAYABLE', 'Cuentas por pagar', 'OTHER',
         'Cuenta de control para proveedores.', 'LIABILITY', 'CREDIT',
         'CURRENT_LIABILITIES', 'TRADE_PAYABLES', 200
  UNION ALL SELECT '2100', 'PAYROLL_PAYABLE', 'Nómina por pagar', 'PAYROLL',
         'Obligación neta con colaboradores.', 'LIABILITY', 'CREDIT',
         'CURRENT_LIABILITIES', 'PAYROLL_PAYABLE', 210
  UNION ALL SELECT '2110', 'PAYROLL_WITHHOLDINGS', 'Retenciones y cargas de nómina', 'PAYROLL',
         'Retenciones y contribuciones pendientes de entero.', 'LIABILITY', 'CREDIT',
         'CURRENT_LIABILITIES', 'PAYROLL_WITHHOLDINGS', 211
  UNION ALL SELECT '2200', 'TAXES_PAYABLE', 'Impuestos por pagar', 'OTHER',
         'Impuestos indirectos y otras obligaciones fiscales.', 'LIABILITY', 'CREDIT',
         'CURRENT_LIABILITIES', 'TAXES_PAYABLE', 220
  UNION ALL SELECT '2300', 'LOANS_PAYABLE', 'Deuda financiera', 'OTHER',
         'Préstamos y otras obligaciones financieras.', 'LIABILITY', 'CREDIT',
         'NON_CURRENT_LIABILITIES', 'BORROWINGS', 230
  UNION ALL SELECT '3000', 'CONTRIBUTED_CAPITAL', 'Capital aportado', 'OTHER',
         'Aportaciones de propietarios.', 'EQUITY', 'CREDIT',
         'EQUITY', 'CONTRIBUTED_CAPITAL', 300
  UNION ALL SELECT '3100', 'RETAINED_EARNINGS', 'Resultados acumulados', 'OTHER',
         'Resultados de periodos anteriores.', 'EQUITY', 'CREDIT',
         'EQUITY', 'RETAINED_EARNINGS', 310
  UNION ALL SELECT '4000', 'REVENUE', 'Ingresos por actividades ordinarias', 'OTHER',
         'Ingresos reconocidos por ventas de bienes y servicios.', 'REVENUE', 'CREDIT',
         'OPERATING', 'REVENUE', 400
  UNION ALL SELECT '4100', 'OTHER_INCOME', 'Otros ingresos', 'OTHER',
         'Ingresos no clasificados como actividades ordinarias.', 'REVENUE', 'CREDIT',
         'OTHER', 'OTHER_INCOME', 410
  UNION ALL SELECT '5000', 'COST_OF_SALES', 'Costo de ventas', 'OTHER',
         'Costo de inventario reconocido al realizar la venta.', 'EXPENSE', 'DEBIT',
         'OPERATING', 'COST_OF_SALES', 500
  UNION ALL SELECT '6000', 'OPERATING_EXPENSES', 'Gastos operativos', 'OTHER',
         'Cuenta de control para gastos de operación.', 'EXPENSE', 'DEBIT',
         'OPERATING', 'OPERATING_EXPENSES', 600
  UNION ALL SELECT '6100', 'PAYROLL_EXPENSE', 'Sueldos y salarios', 'PAYROLL',
         'Remuneración bruta reconocida en el periodo.', 'EXPENSE', 'DEBIT',
         'OPERATING', 'PAYROLL_EXPENSE', 610
  UNION ALL SELECT '6200', 'EMPLOYER_CONTRIBUTIONS_EXPENSE', 'Cargas patronales', 'PAYROLL',
         'Contribuciones a cargo del empleador.', 'EXPENSE', 'DEBIT',
         'OPERATING', 'EMPLOYER_CONTRIBUTIONS', 620
  UNION ALL SELECT '6300', 'DEPRECIATION_EXPENSE', 'Depreciación del periodo', 'OTHER',
         'Consumo del importe depreciable de activos.', 'EXPENSE', 'DEBIT',
         'OPERATING', 'DEPRECIATION', 630
  UNION ALL SELECT '7000', 'FINANCE_EXPENSE', 'Costos financieros', 'OTHER',
         'Intereses y otros costos de financiamiento.', 'EXPENSE', 'DEBIT',
         'FINANCING', 'FINANCE_EXPENSE', 700
  UNION ALL SELECT '8000', 'INCOME_TAX_EXPENSE', 'Impuesto a las ganancias', 'OTHER',
         'Gasto por impuesto a las ganancias.', 'EXPENSE', 'DEBIT',
         'TAX', 'INCOME_TAX_EXPENSE', 800
  UNION ALL SELECT '9000', 'OCI_FOREIGN_EXCHANGE', 'Conversión en otro resultado integral', 'OTHER',
         'Diferencias de conversión clasificadas en ORI.', 'OCI', 'CREDIT',
         'OCI', 'FOREIGN_EXCHANGE_OCI', 900
) chart;
