package com.indice.erp.hr.attendance.access;

import com.indice.erp.hr.attendance.models.AccessMethodRow;
import com.indice.erp.hr.shared.HrPayloadUtils;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import static com.indice.erp.hr.attendance.support.AttendanceInput.parseBoolean;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseInteger;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseLong;


abstract class AttendanceAccessSupport {

    protected static final List<String> PUBLIC_KIOSK_AUTH_METHODS = List.of("pin");

    protected final AttendanceAccessRepository repository;
    protected final AttendanceAccessMapper mapper;
    protected final AttendanceAccessCredentialService credentials;

    protected AttendanceAccessSupport(
        AttendanceAccessRepository repository,
        AttendanceAccessMapper mapper,
        AttendanceAccessCredentialService credentials
    ) {
        this.repository = repository;
        this.mapper = mapper;
        this.credentials = credentials;
    }

    protected PreparedCredential prepareCredential(
        long companyId,
        Long methodId,
        AccessMethodRow existingMethod,
        String methodType,
        String credentialRef,
        String secretRaw,
        String metadataJson,
        Map<String, Object> payload
    ) {
        if ("badge".equals(methodType) && credentialRef == null) {
            throw new IllegalArgumentException("credential_ref is required for badge methods.");
        }
        if ("pin".equals(methodType)) {
            var shouldRegeneratePin = parseBoolean(payload, "regenerate_pin") || parseBoolean(payload, "auto_generate_pin");
            if (secretRaw == null && (existingMethod == null || !"pin".equals(existingMethod.methodType()) || shouldRegeneratePin)) {
                secretRaw = credentials.generateUniquePin(companyId, methodId);
            }
            if (secretRaw != null) {
                secretRaw = credentials.normalizePinCode(secretRaw);
                credentialRef = credentials.pinCredentialReference(companyId, secretRaw);
                metadataJson = mapper.mergePinMetadataJson(existingMethod == null ? null : existingMethod.metadataJson(), metadataJson, secretRaw);
            } else if (existingMethod != null) {
                credentialRef = existingMethod.credentialRef();
                metadataJson = mapper.mergePinMetadataJson(existingMethod.metadataJson(), metadataJson, null);
            }
        } else if (!"badge".equals(methodType)) {
            credentialRef = null;
        }
        if (!"pin".equals(methodType) && !"password".equals(methodType)) {
            secretRaw = null;
        }
        return new PreparedCredential(credentialRef, secretRaw, metadataJson);
    }

    protected AccessMethodRow resolveSinglePinMatch(long companyId, String credentialPayload, List<AccessMethodRow> candidates) {
        var matches = candidates.stream()
            .filter((method) -> credentials.matchesPin(companyId, credentialPayload, method))
            .toList();
        if (matches.size() > 1) {
            throw new IllegalArgumentException("PIN is assigned to more than one user.");
        }
        if (matches.isEmpty()) {
            return null;
        }
        var match = matches.getFirst();
        var currentReference = credentials.pinCredentialReference(companyId, credentialPayload);
        if (!Objects.equals(match.credentialRef(), currentReference)) {
            repository.updatePinCredentialReference(companyId, match.id(), currentReference);
        }
        return match;
    }

    protected AccessMethodRow loadExistingMethod(long companyId, Long methodId, long accessProfileId) {
        if (methodId == null || methodId <= 0) {
            return null;
        }
        var existing = repository.loadAccessMethod(companyId, methodId);
        if (existing.accessProfileId() != accessProfileId) {
            throw new IllegalArgumentException("Access method does not belong to the selected access profile.");
        }
        return existing;
    }

    protected long parseRequiredUserCompanyId(Map<String, Object> payload) {
        var userCompanyId = parseLong(payload, "user_company_id");
        if (userCompanyId == null || userCompanyId <= 0) {
            throw new IllegalArgumentException("user_company_id is required.");
        }
        return userCompanyId;
    }

    protected int resolvePriority(Map<String, Object> payload) {
        var priority = HrPayloadUtils.parseInteger(payload, "priority");
        return priority == null || priority < 0 ? 100 : priority;
    }

    protected String normalizeManagedStatus(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase();
        return switch (normalized) {
            case "", "active", "enabled" -> "active";
            case "inactive", "disabled" -> "inactive";
            default -> throw new IllegalArgumentException("Unsupported status.");
        };
    }

    protected Map<String, Object> normalizePayload(Map<String, Object> payload) {
        return payload == null ? Map.of() : payload;
    }

    protected record PreparedCredential(String credentialRef, String secretRaw, String metadataJson) {
    }
}
