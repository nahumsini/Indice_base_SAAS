ALTER TABLE pos_restaurant_order_items
    ADD COLUMN guest_number SMALLINT UNSIGNED NOT NULL DEFAULT 1 AFTER product_id,
    ADD CONSTRAINT chk_pos_restaurant_item_guest CHECK (guest_number BETWEEN 1 AND 1000);

CREATE INDEX idx_pos_restaurant_item_guest
    ON pos_restaurant_order_items (company_id, order_id, guest_number, sort_order);
