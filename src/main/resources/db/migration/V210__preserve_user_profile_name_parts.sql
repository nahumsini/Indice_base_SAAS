ALTER TABLE `user_profiles`
    ADD COLUMN `given_names` varchar(160) DEFAULT NULL AFTER `full_name`,
    ADD COLUMN `family_names` varchar(160) DEFAULT NULL AFTER `given_names`;
