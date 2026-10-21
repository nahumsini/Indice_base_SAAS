CREATE TABLE meeting_attendance (
 company_id BIGINT NOT NULL,
 meeting_id BIGINT NOT NULL,
 user_id BIGINT NOT NULL,
 attendance_status VARCHAR(12) NOT NULL,
 recorded_by BIGINT NOT NULL,
 recorded_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(company_id,meeting_id,user_id),
 CONSTRAINT fk_attendance_meeting FOREIGN KEY(company_id,meeting_id) REFERENCES meeting_records(company_id,id) ON DELETE CASCADE,
 CONSTRAINT fk_attendance_user FOREIGN KEY(user_id) REFERENCES users(id),
 CONSTRAINT fk_attendance_actor FOREIGN KEY(recorded_by) REFERENCES users(id),
 CONSTRAINT chk_meeting_attendance_status CHECK(attendance_status IN ('PRESENT','ABSENT'))
);
