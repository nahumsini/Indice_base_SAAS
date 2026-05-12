package com.indice.erp.hr.attendance.access;

import com.indice.erp.hr.attendance.models.AccessMethodRow;
import com.indice.erp.hr.attendance.models.AccessProfileRow;
import com.indice.erp.hr.attendance.models.AttendanceAccessUser;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


@Repository
class AttendanceAccessRepository {

    private final JdbcTemplate jdbcTemplate;
    private final AttendanceAccessMethodRepository methodRepository;

    AttendanceAccessRepository(JdbcTemplate jdbcTemplate, AttendanceAccessMethodRepository methodRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.methodRepository = methodRepository;
    }

    List<AccessProfileRow> listAccessProfilesRows(long companyId) {
        var profiles = jdbcTemplate.query(
            """
                SELECT p.id, p.company_id, p.user_company_id,
                       COALESCE(LOWER(p.status), 'active') AS status,
                       p.default_method, p.last_enrolled_at, p.metadata_json,
                       COALESCE(e.user_code, '') AS user_code,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS user_name
                FROM user_access_profiles p
                JOIN hr_users e ON e.id = p.user_company_id
                WHERE p.company_id = ?
                ORDER BY user_name ASC, p.id ASC
                """,
            (rs, rowNum) -> new AccessProfileRow(
                rs.getLong("id"),
                rs.getLong("company_id"),
                rs.getLong("user_company_id"),
                safe(rs.getString("status")),
                safe(rs.getString("default_method")),
                toLocalDateTime(rs.getTimestamp("last_enrolled_at")),
                safe(rs.getString("metadata_json")),
                safe(rs.getString("user_code")),
                safe(rs.getString("user_name")),
                List.of()
            ),
            companyId
        );

        var methodsByProfile = loadAccessMethodsByProfile(companyId);
        return profiles.stream()
            .map((profile) -> new AccessProfileRow(
                profile.id(),
                profile.companyId(),
                profile.userCompanyId(),
                profile.status(),
                profile.defaultMethod(),
                profile.lastEnrolledAt(),
                profile.metadataJson(),
                profile.userCode(),
                profile.userName(),
                methodsByProfile.getOrDefault(profile.id(), List.of())
            ))
            .toList();
    }

    Map<Long, AccessProfileRow> loadAccessProfilesByUser(long companyId) {
        var result = new HashMap<Long, AccessProfileRow>();
        for (var profile : listAccessProfilesRows(companyId)) {
            result.put(profile.userCompanyId(), profile);
        }
        return result;
    }

    AccessProfileRow loadAccessProfile(long companyId, long profileId) {
        return listAccessProfilesRows(companyId).stream()
            .filter((profile) -> profile.id() == profileId)
            .findFirst()
            .orElseThrow(() -> new NoSuchElementException("HR user access profile not found."));
    }

    AccessProfileRow loadAccessProfileByUser(long companyId, long userCompanyId) {
        return listAccessProfilesRows(companyId).stream()
            .filter((profile) -> profile.userCompanyId() == userCompanyId)
            .findFirst()
            .orElse(null);
    }


    List<AccessMethodRow> loadAccessMethods(long companyId, Long accessProfileId) {
        return methodRepository.loadAccessMethods(companyId, accessProfileId);
    }

    AccessMethodRow loadAccessMethod(long companyId, long methodId) {
        return methodRepository.loadAccessMethod(companyId, methodId);
    }

    List<AccessMethodRow> loadPublicKioskAccessMethods(long companyId, String methodType) {
        return methodRepository.loadPublicKioskAccessMethods(companyId, methodType);
    }

    boolean pinCredentialReferenceExists(long companyId, String credentialRef, Long excludedMethodId) {
        return methodRepository.pinCredentialReferenceExists(companyId, credentialRef, excludedMethodId);
    }

    AttendanceAccessUser loadAccessUser(long companyId, long userCompanyId) {
        return jdbcTemplate.query(
                """
                    SELECT uc.user_id, COALESCE(LOWER(e.status), 'active') AS status
                    FROM user_companies uc
                    JOIN hr_users e ON e.id = uc.id
                    WHERE uc.company_id = ? AND uc.id = ?
                    LIMIT 1
                    """,
                (rs, rowNum) -> new AttendanceAccessUser(
                    userCompanyId,
                    rs.getLong("user_id"),
                    safe(rs.getString("status"))
                ),
                companyId,
                userCompanyId
            ).stream()
            .findFirst()
            .orElseThrow(() -> new NoSuchElementException("HR user not found."));
    }

    void ensureUniqueAccessProfile(long companyId, long userCompanyId, Long profileId) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM user_access_profiles
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND (? IS NULL OR id <> ?)
                """,
            Integer.class,
            companyId,
            userCompanyId,
            profileId,
            profileId
        );
        if (count != null && count > 0) {
            throw new IllegalArgumentException("HR user already has an access profile.");
        }
    }

    void ensureUniqueAccessMethod(long companyId, Long methodId, String methodType, String credentialRef) {
        if (credentialRef == null) {
            return;
        }
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM user_access_methods
                WHERE company_id = ?
                  AND method_type = ?
                  AND credential_ref = ?
                  AND (? IS NULL OR id <> ?)
                """,
            Integer.class,
            companyId,
            methodType,
            credentialRef,
            methodId,
            methodId
        );
        if (count != null && count > 0) {
            throw new IllegalArgumentException("Credential reference must be unique within the company.");
        }
    }


    JdbcTemplate jdbcTemplate() {
        return jdbcTemplate;
    }

    private Map<Long, List<AccessMethodRow>> loadAccessMethodsByProfile(long companyId) {
        var result = new HashMap<Long, List<AccessMethodRow>>();
        for (var row : loadAccessMethods(companyId, null)) {
            result.computeIfAbsent(row.accessProfileId(), ignored -> new ArrayList<>()).add(row);
        }
        return result;
    }


    private LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }
}
