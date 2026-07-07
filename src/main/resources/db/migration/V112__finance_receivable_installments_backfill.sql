INSERT INTO finance_receivable_installments
  (company_id, receivable_id, credit_sale_id, installment_number, due_date, amount,
   paid_amount, balance_amount, currency_code, status)
SELECT
  account.company_id,
  account.id,
  account.credit_sale_id,
  1,
  account.next_payment_date,
  account.total_payable_amount,
  account.paid_amount,
  account.balance_amount,
  account.currency_code,
  CASE
    WHEN account.balance_amount <= 0 THEN 'PAID'
    WHEN account.next_payment_date < CURRENT_DATE THEN 'OVERDUE'
    WHEN account.paid_amount > 0 THEN 'PARTIAL'
    WHEN account.next_payment_date <= DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY) THEN 'DUE_SOON'
    ELSE 'ON_TIME'
  END
FROM finance_receivable_accounts account
WHERE account.deleted_at IS NULL
  AND account.total_payable_amount > 0
  AND NOT EXISTS (
    SELECT 1
    FROM finance_receivable_installments installment
    WHERE installment.receivable_id = account.id
  );
