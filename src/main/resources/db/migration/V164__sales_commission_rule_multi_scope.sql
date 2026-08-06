ALTER TABLE `sales_commission_rules`
  ADD COLUMN `user_ids_json` json DEFAULT NULL AFTER `user_name`,
  ADD COLUMN `user_names_json` json DEFAULT NULL AFTER `user_ids_json`,
  ADD COLUMN `product_ids_json` json DEFAULT NULL AFTER `product_name`,
  ADD COLUMN `product_names_json` json DEFAULT NULL AFTER `product_ids_json`;

UPDATE `sales_commission_rules`
SET `user_ids_json` = JSON_ARRAY(`user_id`),
    `user_names_json` = JSON_ARRAY(`user_name`)
WHERE `user_id` IS NOT NULL AND `user_id` <> '';

UPDATE `sales_commission_rules`
SET `product_ids_json` = JSON_ARRAY(`product_id`),
    `product_names_json` = JSON_ARRAY(`product_name`)
WHERE `product_id` IS NOT NULL AND `product_id` <> '';
