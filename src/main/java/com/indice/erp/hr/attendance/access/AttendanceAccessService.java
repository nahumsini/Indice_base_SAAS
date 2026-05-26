package com.indice.erp.hr.attendance.access;

import com.indice.erp.hr.attendance.models.AccessProfileRow;
import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.indice.erp.hr.shared.HrPayloadUtils.nullable;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseDateTime;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseLong;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;


@Service
public class AttendanceAccessService extends AttendanceAccessKioskSupport {

    public AttendanceAccessService(
        AttendanceAccessRepository repository,
        AttendanceAccessMapper mapper,
        AttendanceAccessCredentialService credentials
    ) {
        super(repository, mapper, credentials);
    }

    public Map<String, Object> listAccessProfiles(long companyId) {
        return Map.of("items", repository.listAccessProfilesRows(companyId).stream().map(mapper::toAccessProfileMap).toList());
    }

    @Transactional
    public Map<String, Object> saveAccessProfile(long companyId, long userId, Long profileId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var userCompanyId = parseRequiredUserCompanyId(payload);
        var accessUser = repository.loadAccessUser(companyId, userCompanyId);
        if ("terminated".equals(accessUser.status())) {
            throw new IllegalArgumentException("Terminated users cannot receive kiosk access.");
        }

        var status = normalizeManagedStatus(stringValue(payload, "status"));
        var defaultMethod = credentials.normalizeEnabledAuthMethod(stringValue(payload, "default_method"));
        var metadataJson = mapper.toJson(payload.get("metadata"));
        var lastEnrolledAt = parseDateTime(payload, "last_enrolled_at");

        if (profileId == null || profileId <= 0) {
            profileId = insertAccessProfile(companyId, userId, accessUser, status, defaultMethod, metadataJson, lastEnrolledAt);
        } else {
            updateAccessProfile(companyId, profileId, accessUser, status, defaultMethod, metadataJson, lastEnrolledAt);
        }
        if ("pin".equals(defaultMethod)) {
            ensurePinAccessMethod(companyId, profileId);
        }
        return Map.of("access_profile", mapper.toAccessProfileMap(repository.loadAccessProfile(companyId, profileId)));
    }

    public Map<String, Object> listAccessMethods(long companyId) {
        return Map.of("items", repository.loadAccessMethods(companyId, null).stream().map(mapper::toAccessMethodMap).toList());
    }

    @Transactional
    public Map<String, Object> saveAccessMethod(long companyId, Long methodId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var accessProfileId = parseLong(payload, "access_profile_id");
        if (accessProfileId == null || accessProfileId <= 0) {
            throw new IllegalArgumentException("access_profile_id is required.");
        }
        var profile = repository.loadAccessProfile(companyId, accessProfileId);
        var methodType = credentials.normalizeEnabledAuthMethod(stringValue(payload, "method_type"));
        var status = normalizeManagedStatus(stringValue(payload, "status"));
        var priority = resolvePriority(payload);
        var existingMethod = loadExistingMethod(companyId, methodId, accessProfileId);

        var credentialRef = nullable(stringValue(payload, "credential_ref", "badge_code", "credential"));
        var secretRaw = nullable(stringValue(payload, "secret", "pin", "password"));
        var metadataJson = mapper.toJson(payload.get("metadata"));
        var prepared = prepareCredential(companyId, methodId, existingMethod, methodType, credentialRef, secretRaw, metadataJson, payload);

        repository.ensureUniqueAccessMethod(companyId, methodId, methodType, prepared.credentialRef());
        methodId = upsertAccessMethod(companyId, accessProfileId, methodId, methodType, status, priority, prepared, existingMethod);
        var refreshedProfile = repository.loadAccessProfile(companyId, profile.id());
        return Map.of(
            "access_method",
            mapper.toAccessMethodMap(repository.loadAccessMethod(companyId, methodId)),
            "access_profile",
            mapper.toAccessProfileMap(refreshedProfile)
        );
    }

    @Transactional
    public void ensureDefaultAccessProfile(long companyId, long userCompanyId, long createdBy) {
        var existingProfile = repository.loadAccessProfileByUser(companyId, userCompanyId);
        if (existingProfile != null) {
            ensurePinAccessMethod(companyId, existingProfile.id());
            return;
        }
        var accessUser = repository.loadAccessUser(companyId, userCompanyId);
        var profileId = insertAccessProfile(
            companyId,
            createdBy,
            accessUser,
            "active",
            "pin",
            "{\"supports_face_recognition\":false}",
            LocalDateTime.now()
        );
        ensurePinAccessMethod(companyId, profileId);
    }

    public Map<Long, AccessProfileRow> loadAccessProfilesByUser(long companyId) {
        return repository.loadAccessProfilesByUser(companyId);
    }

    public AccessProfileRow loadOrCreateAccessProfile(long companyId, long userCompanyId, long userId) {
        var profile = repository.loadAccessProfileByUser(companyId, userCompanyId);
        if (profile != null) {
            return profile;
        }
        ensureDefaultAccessProfile(companyId, userCompanyId, userId);
        return repository.loadAccessProfileByUser(companyId, userCompanyId);
    }

    public long loadAccessProfileUserCompanyId(long companyId, long profileId) {
        return repository.loadAccessProfile(companyId, profileId).userCompanyId();
    }

    public long loadAccessMethodUserCompanyId(long companyId, long methodId) {
        return repository.loadAccessMethod(companyId, methodId).userCompanyId();
    }
}
