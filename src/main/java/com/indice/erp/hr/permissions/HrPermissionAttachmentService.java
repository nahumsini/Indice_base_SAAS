package com.indice.erp.hr.permissions;

import com.indice.erp.hr.permissions.HrPermissionAttachmentSupport.AttachmentDraft;
import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HrPermissionAttachmentService {

    private final HrPermissionCommandRepository commandRepository;
    private final HrPermissionAttachmentRepository attachmentRepository;
    private final HrPermissionQueryService queryService;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties storageProperties;

    public HrPermissionAttachmentService(
        HrPermissionCommandRepository commandRepository,
        HrPermissionAttachmentRepository attachmentRepository,
        HrPermissionQueryService queryService,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties storageProperties
    ) {
        this.commandRepository = commandRepository;
        this.attachmentRepository = attachmentRepository;
        this.queryService = queryService;
        this.objectStorageService = objectStorageService;
        this.storageProperties = storageProperties;
    }

    public Map<String, Object> createOwnUpload(PermissionActor actor, long requestId, Map<String, Object> payload) {
        ensureOwnRequest(actor, requestId);
        requireStorage();
        AttachmentDraft draft = HrPermissionAttachmentSupport.attachmentDraft(payload);
        var objectKey = HrPermissionAttachmentSupport.buildObjectKey(actor.companyId(), requestId, draft.fileName(), LocalDate.now());
        var upload = objectStorageService.presignUpload(documentsBucket(), objectKey, draft.contentType(), storageProperties.getMinio().getPresignExpirySeconds());
        var body = new LinkedHashMap<String, Object>();
        body.put("object_key", upload.objectKey());
        body.put("upload_url", upload.uploadUrl());
        body.put("expires_at", upload.expiresAt().toString());
        body.put("upload_headers", upload.uploadHeaders());
        return body;
    }

    @Transactional
    public Map<String, Object> registerOwnAttachment(PermissionActor actor, long requestId, Map<String, Object> payload) {
        ensureOwnRequest(actor, requestId);
        requireStorage();
        AttachmentDraft draft = HrPermissionAttachmentSupport.attachmentDraft(payload);
        var objectKey = HrPermissionAttachmentSupport.normalizeObjectKey(actor.companyId(), requestId, String.valueOf(payload.getOrDefault("object_key", payload.getOrDefault("objectKey", ""))));
        if (!objectStorageService.objectExists(documentsBucket(), objectKey)) {
            throw new IllegalArgumentException("object_key does not reference an existing uploaded attachment.");
        }
        attachmentRepository.insertAttachment(actor.companyId(), requestId, actor.userId(), draft.fileName(), draft.contentType(), draft.sizeBytes(), objectKey);
        return queryService.getOwn(actor, requestId);
    }

    private void ensureOwnRequest(PermissionActor actor, long requestId) {
        var state = commandRepository.loadRequestState(actor.companyId(), requestId);
        if (state.userCompanyId() != actor.userCompanyId()) {
            throw new NoSuchElementException("Permission request not found.");
        }
    }

    private void requireStorage() {
        if (!objectStorageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Object storage is not enabled.");
        }
    }

    private String documentsBucket() {
        return storageProperties.getMinio().getBucketDocuments();
    }
}
