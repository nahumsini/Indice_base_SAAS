package com.indice.erp.hr.permissions;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class HrPermissionQueryService {

    private final HrPermissionListRepository listRepository;
    private final HrPermissionDetailRepository detailRepository;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties storageProperties;
    private final HrOperationalScopeService hrOperationalScopeService;

    public HrPermissionQueryService(
        HrPermissionListRepository listRepository,
        HrPermissionDetailRepository detailRepository,
        ObjectStorageService objectStorageService,
        ObjectStorageProperties storageProperties,
        HrOperationalScopeService hrOperationalScopeService
    ) {
        this.listRepository = listRepository;
        this.detailRepository = detailRepository;
        this.objectStorageService = objectStorageService;
        this.storageProperties = storageProperties;
        this.hrOperationalScopeService = hrOperationalScopeService;
    }

    public Map<String, Object> listManagement(PermissionActor actor, Map<String, String> filters) {
        return listEnvelope(listRepository.listRequests(actor.companyId(), null, resolveScope(actor), filters));
    }

    public Map<String, Object> listOwn(PermissionActor actor, Map<String, String> filters) {
        return listEnvelope(listRepository.listRequests(actor.companyId(), actor.userCompanyId(), filters));
    }

    public Map<String, Object> getManagement(PermissionActor actor, long requestId) {
        return detailEnvelope(requestId, detailRepository.findRequest(actor.companyId(), null, resolveScope(actor), requestId));
    }

    public Map<String, Object> getOwn(PermissionActor actor, long requestId) {
        return detailEnvelope(requestId, detailRepository.findRequest(actor.companyId(), actor.userCompanyId(), requestId));
    }

    private Map<String, Object> listEnvelope(HrPermissionListRepository.PermissionListResult result) {
        var body = new LinkedHashMap<String, Object>();
        body.put("items", result.items());
        body.put("count", result.items().size());
        body.put("total_count", result.totalCount());
        body.put("summary", result.summary());
        return body;
    }

    private Map<String, Object> detailEnvelope(long requestId, Map<String, Object> permission) {
        permission.put("attachments", signedAttachments(permission.get("attachments")));
        permission.put("attachmentName", firstAttachmentName(permission.get("attachments")));
        var body = new LinkedHashMap<String, Object>();
        body.put("permissionId", requestId);
        body.put("permission", permission);
        return body;
    }

    private HrOperationalScope resolveScope(PermissionActor actor) {
        return hrOperationalScopeService.resolve(new AuthSessionUser(
            actor.userId(),
            actor.companyId(),
            actor.userCompanyId(),
            actor.userName(),
            actor.role()
        ));
    }

    private List<Map<String, Object>> signedAttachments(Object attachments) {
        @SuppressWarnings("unchecked")
        var rows = attachments instanceof List<?> list ? (List<Map<String, Object>>) list : List.<Map<String, Object>>of();
        return rows.stream().map(this::signedAttachment).toList();
    }

    private Map<String, Object> signedAttachment(Map<String, Object> attachment) {
        var body = new LinkedHashMap<>(attachment);
        var objectKey = String.valueOf(attachment.getOrDefault("objectKey", ""));
        body.put("downloadUrl", signedDownload(objectKey));
        body.remove("objectKey");
        return body;
    }

    private String firstAttachmentName(Object attachments) {
        @SuppressWarnings("unchecked")
        var rows = attachments instanceof List<?> list ? (List<Map<String, Object>>) list : List.<Map<String, Object>>of();
        return rows.isEmpty() ? "" : String.valueOf(rows.getFirst().getOrDefault("fileName", ""));
    }

    private String signedDownload(String objectKey) {
        if (!objectStorageService.isEnabled() || objectKey == null || objectKey.isBlank()) {
            return null;
        }
        return objectStorageService.presignDownload(
            storageProperties.getMinio().getBucketDocuments(),
            objectKey,
            storageProperties.getMinio().getPresignExpirySeconds()
        );
    }
}
