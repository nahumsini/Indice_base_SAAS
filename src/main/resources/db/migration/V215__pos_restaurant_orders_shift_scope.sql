ALTER TABLE pos_restaurant_orders
    ADD COLUMN settlement_shift_id BIGINT NULL AFTER settlement_cash_register_id;

UPDATE pos_restaurant_orders restaurant_order
SET restaurant_order.settlement_shift_id = (
    SELECT shift.id
    FROM pos_shifts shift
    WHERE shift.company_id = restaurant_order.company_id
      AND shift.cash_register_id = restaurant_order.settlement_cash_register_id
      AND shift.deleted_at IS NULL
      AND shift.opened_at <= restaurant_order.created_at
      AND (shift.closed_at IS NULL OR shift.closed_at >= restaurant_order.created_at)
    ORDER BY shift.opened_at DESC, shift.id DESC
    LIMIT 1
);

ALTER TABLE pos_restaurant_orders
    MODIFY settlement_shift_id BIGINT NOT NULL,
    ADD KEY idx_pos_restaurant_order_shift (company_id, settlement_shift_id, ecosystem_id, status),
    ADD CONSTRAINT fk_pos_restaurant_order_shift
        FOREIGN KEY (settlement_shift_id) REFERENCES pos_shifts(id) ON DELETE RESTRICT;
