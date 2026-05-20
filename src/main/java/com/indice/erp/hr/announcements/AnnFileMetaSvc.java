package com.indice.erp.hr.announcements;

import com.indice.erp.hr.shared.HrPayloadUtils;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AnnFileMetaSvc {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectStorageService storageService;
    private final ObjectStorageProperties storageProperties;

    public AnnFileMetaSvc(
        JdbcTemplate jdbcTemplate,
        ObjectStorageService storageService,
        ObjectStorageProperties storageProperties
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.storageService = storageService;
        this.storageProperties = storageProperties;
    }

    public Map<Long, List<Map<String, Object>>> byAnnouncement(long companyId, List<Long> announcementIds) {
        if (announcementIds.isEmpty()) {
            return Map.of();
        }
        var params = new ArrayList<Object>();
        params.add(companyId);
        params.addAll(announcementIds);
        var rows = jdbcTemplate.query(
            """
                SELECT id, announcement_id, original_filename, mime_type, size_bytes, object_key
                FROM hr_announcement_attachments
                WHERE company_id = ?
                  AND announcement_id IN (%s)
                  AND deleted_at IS NULL
                ORDER BY id ASC
                """.formatted(placeholders(announcementIds.size())),
            (rs, rowNum) -> {
                var item = new LinkedHashMap<String, Object>();
                var objectKey = HrPayloadUtils.safe(rs.getString("object_key"));
                item.put("id", rs.getLong("id"));
                item.put("announcement_id", rs.getLong("announcement_id"));
                item.put("original_filename", HrPayloadUtils.safe(rs.getString("original_filename")));
                item.put("mime_type", HrPayloadUtils.safe(rs.getString("mime_type")));
                item.put("size_bytes", rs.getLong("size_bytes"));
                item.put("object_key", objectKey);
                item.put("download_url", downloadUrl(objectKey));
                return item;
            },
            params.toArray()
        );
        return rows.stream().collect(Collectors.groupingBy(
            row -> ((Number) row.get("announcement_id")).longValue(),
            HashMap::new,
            Collectors.toList()
        ));
    }

    private String downloadUrl(String objectKey) {
        if (objectKey.isBlank() || !storageService.isEnabled()) {
            return null;
        }
        return storageService.presignDownload(
            storageProperties.getMinio().getBucketDocuments(),
            objectKey,
            storageProperties.getMinio().getPresignExpirySeconds()
        );
    }

    private String placeholders(int count) {
        return "?,".repeat(count).replaceAll(",$", "");
    }
}
