-- Add explicit, backwards-compatible visual experience settings to public catalogs.
ALTER TABLE sales_public_catalogs
    ADD COLUMN experience_profile VARCHAR(32) NOT NULL DEFAULT 'GENERAL' AFTER cover_image_url,
    ADD COLUMN accent_color CHAR(7) NOT NULL DEFAULT '#FF6B5E' AFTER experience_profile,
    ADD COLUMN hero_style VARCHAR(24) NOT NULL DEFAULT 'SOFT' AFTER accent_color,
    ADD COLUMN layout_style VARCHAR(24) NOT NULL DEFAULT 'GRID' AFTER hero_style,
    ADD COLUMN card_style VARCHAR(24) NOT NULL DEFAULT 'ELEVATED' AFTER layout_style,
    ADD COLUMN image_ratio VARCHAR(24) NOT NULL DEFAULT 'LANDSCAPE' AFTER card_style;
