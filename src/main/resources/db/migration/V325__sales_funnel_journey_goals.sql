-- Add planning outcomes without changing existing briefs or stage snapshots.
ALTER TABLE sales_funnel_briefs
    DROP CHECK chk_funnel_brief_goal,
    ADD CONSTRAINT chk_funnel_brief_goal CHECK (goal IN
        ('UNDECIDED','AWARENESS','INQUIRIES','APPOINTMENTS','PURCHASES','QUOTES','RENEWALS'));
