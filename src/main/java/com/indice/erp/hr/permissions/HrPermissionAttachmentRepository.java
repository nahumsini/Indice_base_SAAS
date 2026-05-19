package com.indice.erp.hr.permissions;

import com.indice.erp.hr.shared.HrPayloadUtils;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class HrPermissionAttachmentRepository {

    private final JdbcTemplate jdbcTemplate;

    public HrPermissionAttachmentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public long insertAttachment(
        long companyId,
        long requestId,
        long actorUserId,
        String fileName,
        String mimeType,
        long sizeBytes,
        String objectKey
    ) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO user_permission_attachments
                    (company_id, permission_request_id, original_filename, mime_type, size_bytes, object_key, uploaded_by_user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, companyId);
            statement.setLong(2, requestId);
            statement.setString(3, fileName);
            statement.setString(4, mimeType);
            statement.setLong(5, sizeBytes);
            statement.setString(6, objectKey);
            statement.setLong(7, actorUserId);
            return statement;
        }, keyHolder);
        return keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
    }

    public List<String> listActiveObjectKeys(long companyId, long requestId) {
        return jdbcTemplate.query(
            """
                SELECT object_key
                FROM user_permission_attachments
                WHERE company_id = ?
                  AND permission_request_id = ?
                  AND deleted_at IS NULL
                ORDER BY id ASC
                """,
            (rs, rowNum) -> HrPayloadUtils.safe(rs.getString("object_key")),
            companyId,
            requestId
        );
    }
}
