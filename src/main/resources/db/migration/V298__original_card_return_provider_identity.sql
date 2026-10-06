ALTER TABLE pos_return_payments
  ADD COLUMN provider_code varchar(24) NULL,
  ADD COLUMN provider_intent_id bigint NULL,
  ADD COLUMN provider_refund_request_id bigint NULL,
  ADD CONSTRAINT chk_original_return_provider CHECK (provider_code IS NULL OR provider_code IN ('SQUARE','MERCADO_PAGO'));

UPDATE pos_return_payments p
JOIN pos_returns r ON r.company_id=p.company_id AND r.id=p.return_id
JOIN pos_square_terminal_payment_intents i ON i.company_id=r.company_id AND i.pos_ticket_id=r.ticket_id
  AND i.square_payment_id=p.provider_payment_id
SET p.provider_code='SQUARE',p.provider_intent_id=i.id
WHERE p.payment_method='CARD' AND p.provider_payment_id IS NOT NULL;
