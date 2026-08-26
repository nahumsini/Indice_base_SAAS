ALTER TABLE pos_restaurant_orders
    ADD COLUMN first_item_at TIMESTAMP NULL AFTER check_requested_at,
    ADD COLUMN first_round_sent_at TIMESTAMP NULL AFTER first_item_at,
    ADD COLUMN kitchen_started_at TIMESTAMP NULL AFTER first_round_sent_at,
    ADD COLUMN kitchen_ready_at TIMESTAMP NULL AFTER kitchen_started_at,
    ADD COLUMN served_at TIMESTAMP NULL AFTER kitchen_ready_at;

UPDATE pos_restaurant_orders restaurant_order
SET restaurant_order.first_item_at = (
        SELECT MIN(item.created_at)
        FROM pos_restaurant_order_items item
        WHERE item.company_id = restaurant_order.company_id
          AND item.order_id = restaurant_order.id
    ),
    restaurant_order.first_round_sent_at = (
        SELECT MIN(restaurant_round.sent_at)
        FROM pos_restaurant_order_rounds restaurant_round
        WHERE restaurant_round.company_id = restaurant_order.company_id
          AND restaurant_round.order_id = restaurant_order.id
    ),
    restaurant_order.kitchen_started_at = (
        SELECT MIN(event.created_at)
        FROM pos_restaurant_order_events event
        WHERE event.company_id = restaurant_order.company_id
          AND event.order_id = restaurant_order.id
          AND event.to_status = 'PREPARING'
    ),
    restaurant_order.kitchen_ready_at = (
        SELECT MIN(event.created_at)
        FROM pos_restaurant_order_events event
        WHERE event.company_id = restaurant_order.company_id
          AND event.order_id = restaurant_order.id
          AND event.to_status = 'READY'
    ),
    restaurant_order.served_at = (
        SELECT MAX(event.created_at)
        FROM pos_restaurant_order_events event
        WHERE event.company_id = restaurant_order.company_id
          AND event.order_id = restaurant_order.id
          AND event.to_status = 'SERVED'
    );
