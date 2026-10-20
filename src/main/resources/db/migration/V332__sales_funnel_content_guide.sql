-- Additive, optional planning choices. Omitted guides preserve earlier saved choices.
ALTER TABLE sales_funnels ADD COLUMN content_guide_json JSON NULL AFTER stages_json;
