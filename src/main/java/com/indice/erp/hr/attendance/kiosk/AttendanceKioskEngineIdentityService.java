package com.indice.erp.hr.attendance.kiosk;

import com.indice.erp.kiosk.engine.KioskIdentityCredentialService;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Keeps HR's personal PIN authority mirrored in the transversal kiosk credential contract. */
@Service
public class AttendanceKioskEngineIdentityService {

    private final JdbcTemplate jdbcTemplate;
    private final KioskIdentityCredentialService credentials;

    public AttendanceKioskEngineIdentityService(
            JdbcTemplate jdbcTemplate,
            KioskIdentityCredentialService credentials) {
        this.jdbcTemplate = jdbcTemplate;
        this.credentials = credentials;
    }

    @Transactional
    public void synchronizePersonalPin(long companyId, long userCompanyId) {
        var activeHash = activePinHash(companyId, userCompanyId);
        if (activeHash.isPresent()) {
            var commonHash = credentials.activePinHash(companyId, "EMPLOYEE", userCompanyId);
            if (commonHash.isEmpty() || !commonHash.get().equals(activeHash.get())) {
                credentials.rotatePersonalPin(companyId, "EMPLOYEE", userCompanyId, activeHash.get());
            }
        } else {
            credentials.revokeIfUnreferenced(companyId, "EMPLOYEE", userCompanyId, false);
        }
    }

    private Optional<String> activePinHash(long companyId, long userCompanyId) {
        return jdbcTemplate.query(
            """
                SELECT method.secret_hash
                FROM user_access_methods method
                JOIN user_access_profiles profile ON profile.id = method.access_profile_id
                JOIN hr_users employee ON employee.id = profile.user_company_id
                WHERE method.company_id = ? AND profile.company_id = ?
                  AND profile.user_company_id = ?
                  AND method.method_type = 'pin'
                  AND COALESCE(LOWER(method.status), 'active') = 'active'
                  AND COALESCE(LOWER(profile.status), 'active') = 'active'
                  AND COALESCE(LOWER(employee.status), 'active') <> 'terminated'
                  AND method.secret_hash IS NOT NULL AND method.secret_hash <> ''
                ORDER BY method.priority ASC, method.id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getString("secret_hash"),
            companyId, companyId, userCompanyId
        ).stream().findFirst();
    }
}
