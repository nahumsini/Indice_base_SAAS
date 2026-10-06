-- Optional commercial plan interest for consultant follow-up.
ALTER TABLE platform_leads
    ADD COLUMN plan_interest VARCHAR(20) NULL AFTER utm_campaign;
