package com.indice.erp.hr.permissions;

import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.util.LinkedHashMap;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HrPermissionSelfDeleteService {

    private final HrPermissionCommandRepository commandRepository;
    private final HrPermissionAttachmentRepository attachmentRepository;
    private final HrPermissionDeleteRepository deleteRepository;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties storageProperties;
    private final CompanyStorageMeter storageMeter;

    public HrPermissionSelfDeleteService(
        HrPermissionCommandRepository commandRepository,
        HrPermissionAttachmentRepository attachmentRepository,
        HrPermissionDeleteRepository deleteRepository,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties storageProperties,
        CompanyStorageMeter storageMeter
    ) {
        this.commandRepository = commandRepository;
        this.attachmentRepository = attachmentRepository;
        this.deleteRepository = deleteRepository;
        this.objectStorageService = objectStorageService;
        this.storageProperties = storageProperties;
        this.storageMeter = storageMeter;
    }

    @Transactional
    public LinkedHashMap<String, Object> deleteOwnPending(PermissionActor actor, long requestId) {
        var state = commandRepository.loadRequestState(actor.companyId(), requestId);
        if (state.userCompanyId() != actor.userCompanyId()) {
            throw new NoSuchElementException("Permission request not found.");
        }
        if (!"pending".equalsIgnoreCase(state.status())) {
            throw new IllegalArgumentException("Only pending permission requests can be deleted.");
        }
        var objectKeys = attachmentRepository.listActiveObjectKeys(actor.companyId(), requestId);
        if (deleteRepository.deletePendingOwnRequest(actor.companyId(), actor.userCompanyId(), requestId) == 0) {
            throw new IllegalArgumentException("Permission request status changed. Refresh and try again.");
        }
        if (objectStorageService.isEnabled()) {
            objectKeys.forEach(key -> {
                deleteObjectQuietly(key);
                storageMeter.release(actor.companyId(), key, "permission_request_deleted");
            });
        }
        var body = new LinkedHashMap<String, Object>();
        body.put("deleted", true);
        body.put("permissionId", requestId);
        return body;
    }

    private void deleteObjectQuietly(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return;
        }
        try {
            objectStorageService.deleteObject(storageProperties.getMinio().getBucketDocuments(), objectKey);
        } catch (RuntimeException ignored) {
        }
    }
}
