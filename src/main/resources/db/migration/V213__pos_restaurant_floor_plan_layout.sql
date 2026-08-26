ALTER TABLE pos_restaurant_tables
    ADD COLUMN layout_shape VARCHAR(16) NOT NULL DEFAULT 'ROUND' AFTER sort_order,
    ADD COLUMN layout_x SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER layout_shape,
    ADD COLUMN layout_y SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER layout_x,
    ADD COLUMN layout_width TINYINT UNSIGNED NOT NULL DEFAULT 3 AFTER layout_y,
    ADD COLUMN layout_height TINYINT UNSIGNED NOT NULL DEFAULT 3 AFTER layout_width,
    ADD COLUMN layout_rotation SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER layout_height;

UPDATE pos_restaurant_tables
SET layout_x = MOD(GREATEST(sort_order - 1, 0), 3) * 4,
    layout_y = FLOOR(GREATEST(sort_order - 1, 0) / 3) * 4,
    layout_width = 3,
    layout_height = 3,
    layout_rotation = 0;

ALTER TABLE pos_restaurant_tables
    ADD CONSTRAINT chk_pos_restaurant_table_layout_shape
        CHECK (layout_shape IN ('ROUND', 'SQUARE', 'RECTANGLE')),
    ADD CONSTRAINT chk_pos_restaurant_table_layout_x
        CHECK (layout_x BETWEEN 0 AND 11),
    ADD CONSTRAINT chk_pos_restaurant_table_layout_y
        CHECK (layout_y BETWEEN 0 AND 999),
    ADD CONSTRAINT chk_pos_restaurant_table_layout_size
        CHECK (layout_width BETWEEN 1 AND 12 AND layout_height BETWEEN 1 AND 12),
    ADD CONSTRAINT chk_pos_restaurant_table_layout_rotation
        CHECK (layout_rotation IN (0, 90));
