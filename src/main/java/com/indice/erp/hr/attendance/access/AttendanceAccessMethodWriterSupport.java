package com.indice.erp.hr.attendance.access;

import com.indice.erp.hr.attendance.models.AccessMethodRow;
import java.util.NoSuchElementException;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;


abstract class AttendanceAccessMethodWriterSupport extends AttendanceAccessProfileWriterSupport {

    protected AttendanceAccessMethodWriterSupport(
        AttendanceAccessRepository repository,
        AttendanceAccessMapper mapper,
        AttendanceAccessCredentialService credentials
    ) {
        super(repository, mapper, credentials);
    }

    protected long upsertAccessMethod(
        long companyId,
        long accessProfileId,
        Long methodId,
        String methodType,
        String status,
        int priority,
        PreparedCredential prepared,
        AccessMethodRow existingMethod
    ) {
        var secretHash = credentials.resolveSecretHash(existingMethod, methodType, prepared.secretRaw());
        if (methodId == null || methodId <= 0) {
            KeyHolder keyHolder = new GeneratedKeyHolder();
            repository.jdbcTemplate().update(connection -> {
                var statement = connection.prepareStatement(
                    """
                        INSERT INTO user_access_methods
                        (company_id, access_profile_id, method_type, credential_ref, secret_hash, status, priority, metadata_json)
                        VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
                        """,
                    new String[] {"id"}
                );
                statement.setLong(1, companyId);
                statement.setLong(2, accessProfileId);
                statement.setString(3, methodType);
                statement.setString(4, prepared.credentialRef());
                statement.setString(5, secretHash);
                statement.setString(6, status);
                statement.setInt(7, priority);
                statement.setString(8, prepared.metadataJson());
                return statement;
            }, keyHolder);
            return keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        }
        updateAccessMethod(companyId, methodId, methodType, status, priority, prepared, secretHash);
        return methodId;
    }

    protected void updateAccessMethod(
        long companyId,
        long methodId,
        String methodType,
        String status,
        int priority,
        PreparedCredential prepared,
        String secretHash
    ) {
        var updated = repository.jdbcTemplate().update(
            """
                UPDATE user_access_methods
                SET method_type = ?, credential_ref = ?, secret_hash = ?,
                    status = ?, priority = ?, metadata_json = CAST(? AS JSON)
                WHERE id = ? AND company_id = ?
                """,
            methodType,
            prepared.credentialRef(),
            secretHash,
            status,
            priority,
            prepared.metadataJson(),
            methodId,
            companyId
        );
        if (updated == 0) {
            throw new NoSuchElementException("HR user access method not found.");
        }
    }
}
