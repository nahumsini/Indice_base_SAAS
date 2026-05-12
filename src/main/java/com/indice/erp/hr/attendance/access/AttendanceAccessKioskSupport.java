package com.indice.erp.hr.attendance.access;

import com.indice.erp.hr.attendance.models.AccessMethodRow;
import com.indice.erp.hr.attendance.models.AccessProfileRow;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;


abstract class AttendanceAccessKioskSupport extends AttendanceAccessMethodWriterSupport {

    protected AttendanceAccessKioskSupport(
        AttendanceAccessRepository repository,
        AttendanceAccessMapper mapper,
        AttendanceAccessCredentialService credentials
    ) {
        super(repository, mapper, credentials);
    }

    public List<String> determinePublicKioskAuthMethods(long companyId) {
        var availableMethods = new ArrayList<String>();
        for (var methodType : PUBLIC_KIOSK_AUTH_METHODS) {
            if (!repository.loadPublicKioskAccessMethods(companyId, methodType).isEmpty()) {
                availableMethods.add(methodType);
            }
        }
        return availableMethods;
    }

    public AccessMethodRow resolvePublicKioskAccessMethod(long companyId, String authMethod, String credentialPayload) {
        var candidateMethods = repository.loadPublicKioskAccessMethods(companyId, authMethod);
        if (candidateMethods.isEmpty()) {
            return null;
        }
        return switch (authMethod) {
            case "pin" -> resolveSinglePinMatch(companyId, credentialPayload, candidateMethods);
            default -> null;
        };
    }

    public String normalizePublicKioskAuthMethod(String value) {
        return credentials.normalizePublicKioskAuthMethod(value, PUBLIC_KIOSK_AUTH_METHODS);
    }

    public String resolveRequestedAuthMethod(Map<String, Object> payload, String defaultMethod) {
        var requested = stringValue(payload, "auth_method");
        return credentials.normalizeEnabledAuthMethod(requested.isBlank() ? defaultMethod : requested);
    }

    public AccessMethodRow resolveActiveAccessMethod(long companyId, long accessProfileId, String authMethod) {
        return repository.loadAccessMethods(companyId, accessProfileId).stream()
            .filter((method) -> authMethod.equals(method.methodType()))
            .filter((method) -> "active".equals(method.status()))
            .findFirst()
            .orElse(null);
    }

    public String validateAuthAttempt(AccessProfileRow profile, AccessMethodRow method, String authMethod, String credentialPayload) {
        if (!"active".equals(profile.status())) {
            return "rejected";
        }
        if ("manual_override".equals(authMethod)) {
            return "overridden";
        }
        if (method == null || !"active".equals(method.status())) {
            return "rejected";
        }
        return switch (authMethod) {
            case "badge" -> Objects.equals(method.credentialRef(), credentialPayload) ? "success" : "failure";
            case "pin", "password" -> credentials.credentialMatches(credentialPayload, method.secretHash()) ? "success" : "failure";
            case "facial_recognition" -> "success";
            default -> "rejected";
        };
    }

    public Map<String, Object> toAccessProfileMap(AccessProfileRow profile) {
        return mapper.toAccessProfileMap(profile);
    }
}
