-- Personal identity is owned by the user across their company memberships.
-- NULL retains the legacy phone projection until the user's first explicit edit.
ALTER TABLE user_profiles ADD COLUMN phone_numbers_json JSON NULL AFTER phone;
