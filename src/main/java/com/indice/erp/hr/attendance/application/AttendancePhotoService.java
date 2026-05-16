package com.indice.erp.hr.attendance.application;

import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import com.indice.erp.storage.PresignedUpload;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

import static com.indice.erp.hr.attendance.support.AttendanceInput.normalizeEventType;

@Service
public class AttendancePhotoService {

    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties objectStorageProperties;

    public AttendancePhotoService(
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties
    ) {
        this.objectStorageService = objectStorageService;
        this.objectStorageProperties = objectStorageProperties;
    }

    public Map<String, Object> createAttendanceUpload(
        long companyId,
        long userCompanyId,
        String contentType,
        String eventType,
        LocalDate attendanceDate
    ) {
        ensureEnabled();
        return toUploadResponse(
            objectStorageService.presignUpload(
                attendanceBucket(),
                buildAttendancePhotoObjectKey(companyId, userCompanyId, contentType, eventType, attendanceDate),
                contentType,
                presignExpirySeconds()
            )
        );
    }

    public Map<String, Object> createUserAttendanceUpload(
        long companyId,
        long userId,
        String contentType,
        String eventType,
        LocalDate attendanceDate
    ) {
        ensureEnabled();
        return toUploadResponse(
            objectStorageService.presignUpload(
                attendanceBucket(),
                buildUserAttendancePhotoObjectKey(companyId, userId, contentType, eventType, attendanceDate),
                contentType,
                presignExpirySeconds()
            )
        );
    }

    public String signedAttendancePhotoUrl(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || !objectStorageService.isEnabled()) {
            return null;
        }

        return objectStorageService.presignDownload(
            attendanceBucket(),
            objectKey,
            presignExpirySeconds()
        );
    }

    public String signedProfileAvatarUrl(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || !objectStorageService.isEnabled()) {
            return null;
        }

        try {
            return objectStorageService.presignDownload(
                documentsBucket(),
                objectKey,
                presignExpirySeconds()
            );
        } catch (RuntimeException ex) {
            return null;
        }
    }

    public boolean isStorageEnabled() {
        return objectStorageService.isEnabled();
    }

    public String normalizeAttendancePhotoObjectKey(long companyId, long userCompanyId, String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return null;
        }

        var trimmed = objectKey.trim();
        var expectedPrefix = "hr/attendance/" + companyId + "/" + userCompanyId + "/";
        if (!trimmed.startsWith(expectedPrefix)) {
            throw new IllegalArgumentException("photo_url must match the expected attendance upload prefix.");
        }

        ensureExistingAttendanceObject(trimmed);
        return trimmed;
    }

    public String normalizeUserAttendancePhotoObjectKey(long companyId, long userId, String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return null;
        }

        var trimmed = objectKey.trim();
        var expectedPrefix = "hr/user-attendance/" + companyId + "/" + userId + "/";
        if (!trimmed.startsWith(expectedPrefix)) {
            throw new IllegalArgumentException("photo_url must match the expected user attendance upload prefix.");
        }

        ensureExistingAttendanceObject(trimmed);
        return trimmed;
    }

    private Map<String, Object> toUploadResponse(PresignedUpload upload) {
        var body = new LinkedHashMap<String, Object>();
        body.put("object_key", upload.objectKey());
        body.put("upload_url", upload.uploadUrl());
        body.put("expires_at", upload.expiresAt().toString());
        body.put("upload_headers", upload.uploadHeaders());
        return body;
    }

    private void ensureExistingAttendanceObject(String objectKey) {
        ensureEnabled();
        if (!objectStorageService.objectExists(attendanceBucket(), objectKey)) {
            throw new IllegalArgumentException("photo_url does not reference an existing uploaded object.");
        }
    }

    private void ensureEnabled() {
        if (!objectStorageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Object storage is not enabled.");
        }
    }

    private String buildAttendancePhotoObjectKey(long companyId, long userCompanyId, String contentType, String eventType, LocalDate attendanceDate) {
        var targetDate = attendanceDate == null ? LocalDate.now() : attendanceDate;
        var targetEventType = eventType == null || eventType.isBlank() ? "check_in" : eventType;
        return "hr/attendance/"
            + companyId + "/"
            + userCompanyId + "/"
            + targetDate.getYear() + "/"
            + String.format("%02d", targetDate.getMonthValue()) + "/"
            + String.format("%02d", targetDate.getDayOfMonth()) + "/"
            + normalizeEventType(targetEventType) + "-"
            + UUID.randomUUID()
            + extensionForContentType(contentType);
    }

    private String buildUserAttendancePhotoObjectKey(long companyId, long userId, String contentType, String eventType, LocalDate attendanceDate) {
        var targetDate = attendanceDate == null ? LocalDate.now() : attendanceDate;
        var targetEventType = eventType == null || eventType.isBlank() ? "check_in" : eventType;
        return "hr/user-attendance/"
            + companyId + "/"
            + userId + "/"
            + targetDate.getYear() + "/"
            + String.format("%02d", targetDate.getMonthValue()) + "/"
            + String.format("%02d", targetDate.getDayOfMonth()) + "/"
            + normalizeEventType(targetEventType) + "-"
            + UUID.randomUUID()
            + extensionForContentType(contentType);
    }

    private String extensionForContentType(String contentType) {
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }

    private String attendanceBucket() {
        return objectStorageProperties.getMinio().getBucketAttendance();
    }

    private String documentsBucket() {
        return objectStorageProperties.getMinio().getBucketDocuments();
    }

    private int presignExpirySeconds() {
        return objectStorageProperties.getMinio().getPresignExpirySeconds();
    }
}
