package com.indice.erp.hr.attendance.application;

import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class AttendancePhotoRetentionJob {

    private static final String RETENTION_REASON = "RETENTION_30_DAYS";
    private static final Logger LOGGER = LoggerFactory.getLogger(AttendancePhotoRetentionJob.class);

    private final JdbcTemplate jdbcTemplate;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties objectStorageProperties;
    private final int batchSize;

    public AttendancePhotoRetentionJob(
        JdbcTemplate jdbcTemplate,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties,
        @Value("${app.hr.attendance.photo-retention-batch-size:200}") int batchSize
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectStorageService = objectStorageService;
        this.objectStorageProperties = objectStorageProperties;
        this.batchSize = Math.max(batchSize, 1);
    }

    @Scheduled(fixedDelayString = "${app.hr.attendance.photo-retention-delay-ms:3600000}")
    @Transactional
    public void deleteExpiredAttendancePhotos() {
        if (!objectStorageService.isEnabled()) {
            return;
        }

        var now = LocalDateTime.now();
        var expiredPhotos = loadExpiredPhotos(now);
        for (var photo : expiredPhotos) {
            try {
                objectStorageService.deleteObject(attendanceBucket(), photo.objectKey());
                markPhotoDeleted(photo.id(), now);
            } catch (RuntimeException ex) {
                LOGGER.warn("Unable to delete expired attendance photo for event {}.", photo.id(), ex);
            }
        }
    }

    private List<ExpiredAttendancePhoto> loadExpiredPhotos(LocalDateTime now) {
        return jdbcTemplate.query(
            """
                SELECT id, COALESCE(photo_url, '') AS object_key
                FROM user_attendance_events
                WHERE COALESCE(TRIM(photo_url), '') <> ''
                  AND photo_retained_until IS NOT NULL
                  AND photo_retained_until <= ?
                  AND photo_deleted_at IS NULL
                ORDER BY photo_retained_until ASC, id ASC
                LIMIT ?
                """,
            (rs, rowNum) -> new ExpiredAttendancePhoto(
                rs.getLong("id"),
                rs.getString("object_key")
            ),
            Timestamp.valueOf(now),
            batchSize
        );
    }

    private void markPhotoDeleted(long eventId, LocalDateTime deletedAt) {
        jdbcTemplate.update(
            """
                UPDATE user_attendance_events
                SET photo_deleted_at = ?,
                    photo_retention_reason = ?
                WHERE id = ?
                  AND photo_deleted_at IS NULL
                """,
            Timestamp.valueOf(deletedAt),
            RETENTION_REASON,
            eventId
        );
    }

    private String attendanceBucket() {
        return objectStorageProperties.getMinio().getBucketAttendance();
    }

    private record ExpiredAttendancePhoto(long id, String objectKey) {
    }
}
