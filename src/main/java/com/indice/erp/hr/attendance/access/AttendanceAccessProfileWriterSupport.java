package com.indice.erp.hr.attendance.access;

import com.indice.erp.hr.attendance.models.AccessMethodRow;
import com.indice.erp.hr.attendance.models.AttendanceAccessUser;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.NoSuchElementException;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;


abstract class AttendanceAccessProfileWriterSupport extends AttendanceAccessSupport {

    protected AttendanceAccessProfileWriterSupport(
        AttendanceAccessRepository repository,
        AttendanceAccessMapper mapper,
        AttendanceAccessCredentialService credentials
    ) {
        super(repository, mapper, credentials);
    }

    protected AccessMethodRow ensurePinAccessMethod(long companyId, long accessProfileId) {
        var existingPin = repository.loadAccessMethods(companyId, accessProfileId).stream()
            .filter((method) -> "pin".equals(method.methodType()))
            .findFirst()
            .orElse(null);
        if (existingPin != null) {
            return existingPin;
        }
        var pin = credentials.generateUniquePin(companyId, null);
        var credentialRef = credentials.pinCredentialReference(companyId, pin);
        var metadataJson = mapper.mergePinMetadataJson(null, null, pin);
        KeyHolder keyHolder = new GeneratedKeyHolder();
        repository.jdbcTemplate().update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO user_access_methods
                    (company_id, access_profile_id, method_type, credential_ref, secret_hash, status, priority, metadata_json)
                    VALUES (?, ?, 'pin', ?, ?, 'active', 10, CAST(? AS JSON))
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            statement.setLong(2, accessProfileId);
            statement.setString(3, credentialRef);
            statement.setString(4, credentials.encodeSecret(pin));
            statement.setString(5, metadataJson);
            return statement;
        }, keyHolder);
        var methodId = keyHolder.getKey() == null ? null : keyHolder.getKey().longValue();
        return methodId == null ? repository.loadAccessMethods(companyId, accessProfileId).getFirst() : repository.loadAccessMethod(companyId, methodId);
    }

    protected long insertAccessProfile(
        long companyId,
        long createdBy,
        AttendanceAccessUser accessUser,
        String status,
        String defaultMethod,
        String metadataJson,
        LocalDateTime lastEnrolledAt
    ) {
        repository.ensureUniqueAccessProfile(companyId, accessUser.userCompanyId(), null);
        KeyHolder keyHolder = new GeneratedKeyHolder();
        repository.jdbcTemplate().update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO user_access_profiles
                    (company_id, user_company_id, user_id, status, default_method, last_enrolled_at, metadata_json, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            statement.setLong(2, accessUser.userCompanyId());
            statement.setLong(3, accessUser.userId());
            statement.setString(4, status);
            statement.setString(5, defaultMethod);
            if (lastEnrolledAt == null) {
                statement.setNull(6, Types.TIMESTAMP);
            } else {
                statement.setTimestamp(6, Timestamp.valueOf(lastEnrolledAt));
            }
            statement.setString(7, metadataJson);
            statement.setLong(8, createdBy);
            return statement;
        }, keyHolder);
        return keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
    }

    protected void updateAccessProfile(
        long companyId,
        long profileId,
        AttendanceAccessUser accessUser,
        String status,
        String defaultMethod,
        String metadataJson,
        LocalDateTime lastEnrolledAt
    ) {
        var existing = repository.loadAccessProfile(companyId, profileId);
        repository.ensureUniqueAccessProfile(companyId, accessUser.userCompanyId(), profileId);
        var updated = repository.jdbcTemplate().update(
            """
                UPDATE user_access_profiles
                SET user_company_id = ?, user_id = ?, status = ?, default_method = ?,
                    last_enrolled_at = ?, metadata_json = CAST(? AS JSON)
                WHERE id = ? AND company_id = ?
                """,
            accessUser.userCompanyId(),
            accessUser.userId(),
            status,
            defaultMethod,
            lastEnrolledAt == null ? existing.lastEnrolledAt() == null ? null : Timestamp.valueOf(existing.lastEnrolledAt()) : Timestamp.valueOf(lastEnrolledAt),
            metadataJson,
            profileId,
            companyId
        );
        if (updated == 0) {
            throw new NoSuchElementException("HR user access profile not found.");
        }
    }
}
