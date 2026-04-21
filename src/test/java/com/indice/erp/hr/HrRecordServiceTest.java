package com.indice.erp.hr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.indice.erp.storage.DisabledObjectStorageService;
import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import com.indice.erp.storage.PresignedUpload;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class HrRecordServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void createAttachmentUploadRejectsWhenStorageIsDisabled() {
        var service = createService();

        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(1L), eq(2L)))
            .thenAnswer(invocation -> {
                @SuppressWarnings("unchecked")
                var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
                ResultSet rs = mock(ResultSet.class);
                when(rs.getLong("id")).thenReturn(2L);
                when(rs.getString("status")).thenReturn("pending");
                return List.of(rowMapper.mapRow(rs, 0));
            });

        Map<String, Object> payload = new HashMap<>();
        payload.put("file_name", "incident-report.pdf");
        payload.put("content_type", "application/pdf");
        payload.put("size_bytes", 1024);

        assertThrows(ObjectStorageDisabledException.class, () -> service.createAttachmentUpload(1L, 2L, payload));
    }

    @Test
    void createAttachmentUploadReturnsPresignedPayloadWhenStorageIsEnabled() {
        ObjectStorageService objectStorageService = mock(ObjectStorageService.class);
        when(objectStorageService.isEnabled()).thenReturn(true);
        when(objectStorageService.presignUpload(anyString(), anyString(), anyString(), eq(900)))
            .thenReturn(new PresignedUpload(
                "hr/records/1/2/attachments/example-upload.pdf",
                "https://minio.example.test/upload",
                Instant.parse("2026-04-15T12:00:00Z"),
                Map.of("Content-Type", "application/pdf")
            ));

        var service = createService(objectStorageService, createStorageProperties());

        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(1L), eq(2L)))
            .thenAnswer(invocation -> {
                @SuppressWarnings("unchecked")
                var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
                ResultSet rs = mock(ResultSet.class);
                when(rs.getLong("id")).thenReturn(2L);
                when(rs.getString("status")).thenReturn("pending");
                return List.of(rowMapper.mapRow(rs, 0));
            });

        Map<String, Object> payload = new HashMap<>();
        payload.put("file_name", "Incident Report.pdf");
        payload.put("content_type", "application/pdf");
        payload.put("size_bytes", 2048);

        var result = service.createAttachmentUpload(1L, 2L, payload);

        assertEquals("hr/records/1/2/attachments/example-upload.pdf", result.get("object_key"));
        assertEquals("https://minio.example.test/upload", result.get("upload_url"));
    }

    private HrRecordService createService() {
        return createService(new DisabledObjectStorageService(), createStorageProperties());
    }

    private HrRecordService createService(
        ObjectStorageService objectStorageService,
        ObjectStorageProperties objectStorageProperties
    ) {
        return new HrRecordService(jdbcTemplate, objectStorageService, objectStorageProperties);
    }

    private ObjectStorageProperties createStorageProperties() {
        var properties = new ObjectStorageProperties();
        properties.setProvider("minio");
        properties.getMinio().setBucketDocuments("indice-hr-documents");
        properties.getMinio().setPresignExpirySeconds(900);
        return properties;
    }
}
