-- Optional campaign brief; existing funnels and estimates remain intact.
CREATE TABLE sales_funnel_briefs (
    company_id BIGINT NOT NULL,
    funnel_id CHAR(36) NOT NULL,
    idea TEXT NOT NULL,
    offer TEXT NOT NULL,
    location VARCHAR(180) NOT NULL,
    goal VARCHAR(40) NOT NULL,
    channels_json JSON NOT NULL,
    materials_json JSON NOT NULL,
    destination VARCHAR(40) NOT NULL,
    destination_detail VARCHAR(500) NOT NULL,
    timing VARCHAR(200) NOT NULL,
    budget_note VARCHAR(200) NOT NULL,
    ai_response MEDIUMTEXT NOT NULL,
    deferred_recommendations_json JSON NOT NULL,
    PRIMARY KEY (company_id, funnel_id),
    CONSTRAINT fk_funnel_brief_plan FOREIGN KEY (company_id, funnel_id) REFERENCES sales_funnels(company_id, id),
    CONSTRAINT chk_funnel_brief_goal CHECK (goal IN ('UNDECIDED','AWARENESS','INQUIRIES','APPOINTMENTS','PURCHASES')),
    CONSTRAINT chk_funnel_brief_destination CHECK (destination IN ('UNDECIDED','WHATSAPP','PHONE','FORM','WEBSITE','STORE'))
);
