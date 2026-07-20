package com.indice.erp.processTasks.kiosk;

import com.indice.erp.hr.attendance.kiosk.AttendanceKioskTokenService;
import com.indice.erp.processTasks.tasks.ProcessTaskAssignmentScopeService;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

/** Personal credential resolution and organizational identity checks for the pilot. */
@Service
class ProcessTaskKioskIdentityService {

    private final JdbcTemplate jdbcTemplate;
    private final AttendanceKioskTokenService tokenService;
    private final ProcessTaskAssignmentScopeService assignmentScopeService;
    private final BCryptPasswordEncoder passwordEncoder;

    ProcessTaskKioskIdentityService(
            JdbcTemplate jdbcTemplate,
            AttendanceKioskTokenService tokenService,
            ProcessTaskAssignmentScopeService assignmentScopeService,
            BCryptPasswordEncoder passwordEncoder) {
        this.jdbcTemplate = jdbcTemplate;
        this.tokenService = tokenService;
        this.assignmentScopeService = assignmentScopeService;
        this.passwordEncoder = passwordEncoder;
    }

    ProcessTaskKioskEmployee resolveEmployeeByPin(long companyId, String pin) {
        var credentialRef = tokenService.pinCredentialReference(companyId, pin);
        var rows = jdbcTemplate.query(
            """
                SELECT m.id AS method_id,
                       p.user_company_id,
                       uc.user_id,
                       COALESCE(e.user_code, '') AS user_code,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position_title,
                       COALESCE(e.department, '') AS department,
                       COALESCE(LOWER(e.status), 'active') AS status,
                       m.credential_ref,
                       m.secret_hash
                FROM user_access_methods m
                JOIN user_access_profiles p ON p.id = m.access_profile_id
                JOIN hr_users e ON e.id = p.user_company_id
                JOIN user_companies uc ON uc.id = p.user_company_id
                WHERE m.company_id = ?
                  AND COALESCE(LOWER(m.status), 'active') = 'active'
                  AND COALESCE(LOWER(p.status), 'active') = 'active'
                  AND COALESCE(LOWER(e.status), 'active') <> 'terminated'
                  AND m.method_type = 'pin'
                ORDER BY p.user_company_id ASC, m.priority ASC, m.id ASC
                """,
            (rs, rowNum) -> new ProcessTaskKioskPinCandidate(
                rs.getLong("method_id"),
                rs.getLong("user_company_id"),
                rs.getLong("user_id"),
                fallback(rs.getString("user_code"), ""),
                fallback(rs.getString("full_name"), ""),
                fallback(rs.getString("position_title"), ""),
                fallback(rs.getString("department"), ""),
                fallback(rs.getString("status"), "active"),
                fallback(rs.getString("credential_ref"), ""),
                fallback(rs.getString("secret_hash"), "")
            ),
            companyId
        );

        for (var candidate : rows) {
            if (!candidate.secretHash().isBlank() && passwordEncoder.matches(pin, candidate.secretHash())) {
                if (!credentialRef.equals(candidate.credentialRef())) {
                    jdbcTemplate.update(
                        "UPDATE user_access_methods SET credential_ref = ? WHERE company_id = ? AND id = ?",
                        credentialRef, companyId, candidate.methodId()
                    );
                }
                jdbcTemplate.update(
                    """
                        INSERT INTO kiosk_identity_credentials (
                            company_id, identity_type, identity_id, credential_type,
                            credential_reference, secret_hash, status
                        ) VALUES (?, 'EMPLOYEE', ?, 'PIN', ?, ?, 'ACTIVE')
                        ON DUPLICATE KEY UPDATE
                            credential_reference = VALUES(credential_reference),
                            secret_hash = VALUES(secret_hash), status = 'ACTIVE'
                        """,
                    companyId, candidate.userCompanyId(),
                    credentialRef,
                    candidate.secretHash()
                );
                return new ProcessTaskKioskEmployee(
                    candidate.userCompanyId(), candidate.userId(), candidate.userCode(),
                    candidate.fullName(), candidate.positionTitle(), candidate.department(), candidate.status()
                );
            }
        }
        return null;
    }

    ProcessTaskKioskEmployee loadEmployee(long companyId, long userCompanyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT e.id AS user_company_id,
                       uc.user_id,
                       COALESCE(e.user_code, '') AS user_code,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position_title,
                       COALESCE(e.department, '') AS department,
                       COALESCE(LOWER(e.status), 'active') AS status
                FROM hr_users e
                JOIN user_companies uc ON uc.id = e.id
                WHERE e.company_id = ? AND e.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new ProcessTaskKioskEmployee(
                rs.getLong("user_company_id"), rs.getLong("user_id"),
                fallback(rs.getString("user_code"), ""), fallback(rs.getString("full_name"), ""),
                fallback(rs.getString("position_title"), ""), fallback(rs.getString("department"), ""),
                fallback(rs.getString("status"), "active")
            ),
            companyId,
            userCompanyId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("HR user not found.");
        }
        var employee = rows.getFirst();
        if ("terminated".equals(employee.status())) {
            throw new IllegalArgumentException("This user is terminated.");
        }
        return employee;
    }

    void requireScope(ProcessTaskKioskRow kiosk, ProcessTaskKioskEmployee employee) {
        assignmentScopeService.requireKioskScopeAccess(
            kiosk.companyId(), employee.userId(), kiosk.unitId(), kiosk.businessId());
    }

    void requirePublicScope(ProcessTaskKioskRow kiosk, ProcessTaskKioskEmployee employee) {
        try {
            requireScope(kiosk, employee);
        } catch (IllegalArgumentException | NoSuchElementException rejected) {
            // Public identity failures must not reveal whether the PIN existed
            // but belonged to a collaborator outside this kiosk's scope.
            throw new IllegalArgumentException("Credential validation failed.");
        }
    }

    private String fallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
