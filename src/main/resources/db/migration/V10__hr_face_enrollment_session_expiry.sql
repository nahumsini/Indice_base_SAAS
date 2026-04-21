ALTER TABLE `hr_face_enrollments`
  ADD COLUMN `expires_at` datetime NOT NULL AFTER `status`;
