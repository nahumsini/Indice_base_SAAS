ALTER TABLE sales_commission_cut_schedules
  ADD COLUMN schedule_name VARCHAR(120) NULL AFTER company_id;

UPDATE sales_commission_cut_schedules
SET schedule_name = 'Automatización principal'
WHERE schedule_name IS NULL OR TRIM(schedule_name) = '';

ALTER TABLE sales_commission_cut_schedules
  MODIFY schedule_name VARCHAR(120) NOT NULL,
  DROP INDEX uk_sales_commission_cut_schedule_company,
  ADD UNIQUE KEY uk_sales_commission_cut_schedule_name (company_id, schedule_name);
