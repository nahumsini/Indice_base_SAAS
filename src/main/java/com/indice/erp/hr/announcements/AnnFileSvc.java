package com.indice.erp.hr.announcements;

import com.indice.erp.hr.shared.HrPayloadUtils;
import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnnFileSvc {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectStorageService storageService;
    private final ObjectStorageProperties storageProperties;
    private final AnnVisSvc visSvc;
    private final HrAnnouncementQueryService queryService;

    public AnnFileSvc(
        JdbcTemplate jdbcTemplate,
        ObjectStorageService storageService,
        ObjectStorageProperties storageProperties,
        AnnVisSvc visSvc,
        HrAnnouncementQueryService queryService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.storageService = storageService;
        this.storageProperties = storageProperties;
        this.visSvc = visSvc;
        this.queryService = queryService;
    }

    public Map<String, Object> presign(HrAnnouncementActor actor, long announcementId, Map<String, Object> payload) {
        visSvc.requireCompanyAnnouncement(actor.companyId(), announcementId);
        requireStorage();
        var draft = AnnFileSupport.draft(payload);
        var objectKey = AnnFileSupport.objectKey(actor.companyId(), announcementId, draft.fileName(), LocalDate.now());
        var upload = storageService.presignUpload(bucket(), objectKey, draft.contentType(), expirySeconds());
        var body = new LinkedHashMap<String, Object>();
        body.put("object_key", upload.objectKey());
        body.put("upload_url", upload.uploadUrl());
        body.put("expires_at", upload.expiresAt().toString());
        body.put("upload_headers", upload.uploadHeaders());
        return body;
    }

    @Transactional
    public Map<String, Object> register(HrAnnouncementActor actor, long announcementId, Map<String, Object> payload) {
        visSvc.requireCompanyAnnouncement(actor.companyId(), announcementId);
        requireStorage();
        var draft = AnnFileSupport.draft(payload);
        var objectKey = AnnFileSupport.normalizeKey(
            actor.companyId(),
            announcementId,
            HrPayloadUtils.stringValue(payload, "object_key", "objectKey")
        );
        if (!storageService.objectExists(bucket(), objectKey)) {
            throw new IllegalArgumentException("object_key does not reference an existing uploaded attachment.");
        }
        insert(actor, announcementId, draft, objectKey);
        return queryService.loadOne(actor.companyId(), announcementId);
    }

    @Transactional
    public Map<String, Object> delete(HrAnnouncementActor actor, long announcementId, long attachmentId) {
        visSvc.requireCompanyAnnouncement(actor.companyId(), announcementId);
        var updated = jdbcTemplate.update(
            """
                UPDATE hr_announcement_attachments
                SET deleted_at = CURRENT_TIMESTAMP,
                    deleted_by = ?
                WHERE company_id = ?
                  AND announcement_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                """,
            actor.userId(),
            actor.companyId(),
            announcementId,
            attachmentId
        );
        if (updated == 0) {
            throw new java.util.NoSuchElementException("Attachment not found.");
        }
        return queryService.loadOne(actor.companyId(), announcementId);
    }

    private void insert(HrAnnouncementActor actor, long announcementId, AnnFileSupport.FileDraft draft, String objectKey) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO hr_announcement_attachments
                    (company_id, announcement_id, original_filename, mime_type, size_bytes, object_key, uploaded_by_user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, actor.companyId());
            statement.setLong(2, announcementId);
            statement.setString(3, draft.fileName());
            statement.setString(4, draft.contentType());
            statement.setLong(5, draft.sizeBytes());
            statement.setString(6, objectKey);
            statement.setLong(7, actor.userId());
            return statement;
        }, keyHolder);
    }

    private void requireStorage() {
        if (!storageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Object storage is not enabled.");
        }
    }

    private String bucket() {
        return storageProperties.getMinio().getBucketDocuments();
    }

    private int expirySeconds() {
        return storageProperties.getMinio().getPresignExpirySeconds();
    }
}
