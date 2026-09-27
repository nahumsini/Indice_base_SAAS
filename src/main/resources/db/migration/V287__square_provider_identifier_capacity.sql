ALTER TABLE pos_square_terminals
  MODIFY COLUMN square_device_code_id VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  MODIFY COLUMN square_device_id VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL;

ALTER TABLE pos_square_terminal_payment_intents
  MODIFY COLUMN square_location_id VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  MODIFY COLUMN square_device_id VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  MODIFY COLUMN square_checkout_id VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  MODIFY COLUMN square_payment_id VARCHAR(192) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL;

ALTER TABLE pos_square_webhook_events
  MODIFY COLUMN square_event_id VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  MODIFY COLUMN merchant_id VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  MODIFY COLUMN object_id VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL;

ALTER TABLE pos_square_connections
  MODIFY COLUMN merchant_id VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;

ALTER TABLE pos_square_locations
  MODIFY COLUMN square_location_id VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;

ALTER TABLE pos_square_refund_requests
  MODIFY COLUMN merchant_id VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  MODIFY COLUMN provider_refund_id VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL;

ALTER TABLE pos_terminal_payment_reversals
  MODIFY COLUMN payment_id VARCHAR(192) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  MODIFY COLUMN provider_refund_id VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;

ALTER TABLE pos_terminal_refund_adjustments
  MODIFY COLUMN provider_payment_id VARCHAR(192) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  MODIFY COLUMN provider_refund_id VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
