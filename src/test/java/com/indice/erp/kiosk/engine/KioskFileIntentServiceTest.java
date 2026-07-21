package com.indice.erp.kiosk.engine;

import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import com.indice.erp.storage.StoredObjectMetadata;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class KioskFileIntentServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private ObjectStorageService objectStorage;

    @Mock
    private KioskFileRejectionService rejections;

    private KioskFileIntentService service;
    private KioskExecutionContext context;

    @BeforeEach
    void setUp() {
        var properties = new ObjectStorageProperties();
        properties.getMinio().setBucketDocuments("documents");
        service = new KioskFileIntentService(
            jdbcTemplate,
            objectStorage,
            properties,
            rejections,
            mock(com.indice.erp.billing.storage.CompanyStorageMeter.class)
        );
        var definition = new KioskResolvedDefinition(
            17L, 7L, "PROCESS_TASKS", "task_access", 31L, "TASKS", "Tasks",
            KioskDefinitionStatus.ACTIVE, 2L, 3L, null, KioskAccessLevel.CONTROLLED,
            null, "tokenhint", false, 1, 1);
        var session = new KioskSessionPrincipal(
            "session-1", 17L, 7L, "EMPLOYEE", 81L,
            java.util.Set.of("process-tasks.task.attachment.register@1"),
            java.time.Instant.now().plusSeconds(300));
        context = KioskExecutionContext.publicLink("PROCESS_TASKS", "token").resolved(definition, session);
    }

    @Test
    void rejectsAudioAndVideoAtTheEngineBoundary() {
        var request = KioskActionRequest.forResource(
            "process-tasks.task.attachment.presign", 41L,
            Map.of("file_name", "evidence.mp4", "content_type", "video/mp4", "size_bytes", 1024));

        assertThatThrownBy(() -> service.validateTechnicalPolicy(context, request, fileCapability()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("not allowed");
    }

    @Test
    void rejectsRegistrationWithoutMatchingPendingIntent() {
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willReturn(List.of());
        var request = KioskActionRequest.forResource(
            "process-tasks.task.attachment.register", 41L,
            Map.of(
                "object_key", "process-tasks/7/41/attachments/evidence.pdf",
                "original_filename", "evidence.pdf", "mime_type", "application/pdf",
                "size_bytes", 1024, "logical_file_id", "evidence.pdf:1024:1"));

        assertThatThrownBy(() -> service.validateTechnicalPolicy(context, request, fileCapability()))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("another session");
    }

    @Test
    void cleanupDoesNotDeleteObjectsWhenNoIntentExpired() {
        given(jdbcTemplate.query(anyString(), any(org.springframework.jdbc.core.RowMapper.class)))
            .willReturn(List.of());

        service.cleanupExpiredUploads();

        verify(objectStorage, never()).deleteObject(anyString(), anyString());
    }

    @Test
    void pendingPresignsCountTowardTheFiveFileLimit() {
        given(jdbcTemplate.queryForObject(
            contains("FROM kiosk_sessions"), eq(String.class), any(Object[].class)))
            .willReturn("session-1");
        given(jdbcTemplate.queryForObject(
            contains("status = 'ADOPTED'"),
            eq(Integer.class), any(Object[].class))).willReturn(5);
        var request = KioskActionRequest.forResource(
            "process-tasks.task.attachment.presign", 41L,
            Map.of(
                "file_name", "evidence.pdf", "content_type", "application/pdf",
                "size_bytes", 1024));

        assertThatThrownBy(() -> service.captureOutcome(
            context, request, presignCapability(),
            Map.of("object_key", "process-tasks/7/41/attachments/evidence.pdf")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Maximum number");

        verify(jdbcTemplate, never()).update(
            contains("INSERT INTO kiosk_file_intents"), any(Object[].class));
    }

    @Test
    void canExcludeAdoptedFilesFromTheConcurrentPendingLimit() {
        given(jdbcTemplate.queryForObject(
            contains("FROM kiosk_sessions"), eq(String.class), any(Object[].class)))
            .willReturn("session-1");
        given(jdbcTemplate.queryForObject(
            contains("? = 1 AND status = 'ADOPTED'"),
            eq(Integer.class), any(Object[].class))).willReturn(0);
        given(jdbcTemplate.update(
            contains("INSERT INTO kiosk_file_intents"), any(Object[].class))).willReturn(1);
        var request = KioskActionRequest.forResource(
            "process-tasks.task.attachment.presign", 41L,
            Map.of(
                "file_name", "evidence.pdf", "content_type", "application/pdf",
                "size_bytes", 1024));
        var policy = new java.util.LinkedHashMap<>(presignCapability().filePolicy());
        policy.put("countAdopted", false);
        var capability = new KioskCapabilityDescriptor(
            "process-tasks.task.attachment.presign", 1, "PROCESS_TASKS",
            KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, false, false,
            Map.of(), Map.of(), Map.copyOf(policy));

        service.captureOutcome(
            context, request, capability,
            Map.of("object_key", "process-tasks/7/41/attachments/evidence.pdf"));

        verify(jdbcTemplate).queryForObject(
            contains("? = 1 AND status = 'ADOPTED'"), eq(Integer.class),
            eq(17L), eq("session-1"), eq("41"), eq(0));
    }

    @Test
    void rejectsDomainUseWithoutAnAdoptedIntentFromTheSameSessionAndResource() {
        given(jdbcTemplate.queryForObject(
            contains("capability_key = ? AND status = 'ADOPTED'"),
            eq(Integer.class), any(Object[].class))).willReturn(0);

        assertThatThrownBy(() -> service.requireAdopted(
            context, 41L, "process-tasks/7/41/attachments/evidence.pdf",
            "process-tasks.task.attachment.presign"))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("registered");
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void cleanupRetainsOwnerSnapshotAndAuditAfterDefinitionWasPhysicallyDeleted() throws Exception {
        var rs = mock(ResultSet.class);
        given(rs.getString("intent_id")).willReturn("intent-1");
        given(rs.getLong("kiosk_definition_id")).willReturn(17L);
        given(rs.getLong("company_id")).willReturn(7L);
        given(rs.getString("owner_module")).willReturn("PROCESS_TASKS");
        given(rs.getString("session_id")).willReturn("session-1");
        given(rs.getString("capability_key"))
            .willReturn("process-tasks.task.attachment.presign@1");
        given(rs.getString("bucket_name")).willReturn("documents");
        given(rs.getString("object_key")).willReturn("orphaned/object.pdf");
        given(rs.getString("staging_object_key")).willReturn(null);
        given(jdbcTemplate.query(anyString(), any(RowMapper.class))).willAnswer(invocation -> {
            var sql = invocation.getArgument(0, String.class);
            if (sql.contains("WHERE status = 'REJECTED'")
                    || sql.contains("SELECT intent_id, bucket_name, staging_object_key")) {
                return List.of();
            }
            var mapper = (RowMapper) invocation.getArgument(1);
            return List.of(mapper.mapRow(rs, 0));
        });
        given(jdbcTemplate.update(contains("SET status = 'EXPIRED'"), any(Object[].class)))
            .willReturn(1);

        assertThat(service.cleanupExpiredUploads()).isEqualTo(1);

        verify(jdbcTemplate).update(
            contains("'KIOSK_FILE_EXPIRED'"),
            any(), any(), eq(17L), eq(7L), eq("PROCESS_TASKS"), any(), any(), any());
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void copiesToSealedKeyBeforeMagicInspectionAndAdoptsValidPdf() throws Exception {
        givenPendingIntent("evidence.pdf", "application/pdf", 1024L);
        given(objectStorage.objectMetadata(eq("documents"), contains("/sealed/")))
            .willReturn(new StoredObjectMetadata(1024L, "application/pdf"));
        given(objectStorage.readObjectPrefix(
            eq("documents"), contains("/sealed/"), eq(4096)))
            .willReturn("%PDF-1.7\n".getBytes(StandardCharsets.US_ASCII));
        given(jdbcTemplate.update(
            contains("SET status = 'ADOPTED'"), any(Object[].class))).willReturn(1);
        var stagedKey = "process-tasks/7/41/attachments/evidence.pdf";
        var response = new LinkedHashMap<String, Object>();

        service.captureOutcome(
            context, registerRequest(stagedKey), sealingRegisterCapability(), response);

        var acceptedKey = org.mockito.ArgumentCaptor.forClass(String.class);
        var ordered = inOrder(objectStorage);
        ordered.verify(objectStorage).copyObject(
            eq("documents"), eq(stagedKey), acceptedKey.capture());
        ordered.verify(objectStorage).objectMetadata("documents", acceptedKey.getValue());
        ordered.verify(objectStorage).readObjectPrefix("documents", acceptedKey.getValue(), 4096);
        assertThat(acceptedKey.getValue()).contains("/sealed/").endsWith("-evidence.pdf");
        assertThat(response)
            .containsEntry("object_key", acceptedKey.getValue())
            .containsEntry("objectKey", acceptedKey.getValue());
        verify(rejections, never()).reject(any(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void rejectsAndDeletesASealedUploadWhoseBytesDoNotMatchDeclaredPdf() throws Exception {
        givenPendingIntent("evidence.pdf", "application/pdf", 1024L);
        given(objectStorage.objectMetadata(eq("documents"), contains("/sealed/")))
            .willReturn(new StoredObjectMetadata(1024L, "application/pdf"));
        given(objectStorage.readObjectPrefix(
            eq("documents"), contains("/sealed/"), eq(4096)))
            .willReturn("not-a-pdf".getBytes(StandardCharsets.US_ASCII));
        var stagedKey = "process-tasks/7/41/attachments/evidence.pdf";

        assertThatThrownBy(() -> service.captureOutcome(
            context, registerRequest(stagedKey), sealingRegisterCapability(),
            new LinkedHashMap<>()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Uploaded file does not match the approved intent.");

        var acceptedKey = org.mockito.ArgumentCaptor.forClass(String.class);
        var ordered = inOrder(objectStorage);
        ordered.verify(objectStorage).copyObject(
            eq("documents"), eq(stagedKey), acceptedKey.capture());
        ordered.verify(objectStorage).objectMetadata("documents", acceptedKey.getValue());
        ordered.verify(objectStorage).readObjectPrefix("documents", acceptedKey.getValue(), 4096);
        ordered.verify(objectStorage).deleteObject("documents", acceptedKey.getValue());
        verify(rejections).reject(
            context, sealingRegisterCapability().versionedKey(), "41",
            stagedKey, acceptedKey.getValue());
        verify(jdbcTemplate, never()).update(
            contains("SET status = 'ADOPTED'"), any(Object[].class));
    }

    @Test
    void transactionRollbackDeletesOnlyTheSealedCopyAndLeavesStagingRetryable()
            throws Exception {
        givenPendingIntent("evidence.pdf", "application/pdf", 1024L);
        given(objectStorage.objectMetadata(eq("documents"), contains("/sealed/")))
            .willReturn(new StoredObjectMetadata(1024L, "application/pdf"));
        given(objectStorage.readObjectPrefix(
            eq("documents"), contains("/sealed/"), eq(4096)))
            .willReturn("%PDF-1.7\n".getBytes(StandardCharsets.US_ASCII));
        given(jdbcTemplate.update(
            contains("SET status = 'ADOPTED'"), any(Object[].class))).willReturn(1);
        var stagedKey = "process-tasks/7/41/attachments/evidence.pdf";
        var response = new LinkedHashMap<String, Object>();
        java.util.List<TransactionSynchronization> synchronizations;

        TransactionSynchronizationManager.initSynchronization();
        try {
            service.captureOutcome(
                context, registerRequest(stagedKey), sealingRegisterCapability(), response);
            synchronizations = TransactionSynchronizationManager.getSynchronizations();
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }

        assertThat(synchronizations).hasSize(1);
        synchronizations.getFirst().afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
        var sealedKey = String.valueOf(response.get("object_key"));
        verify(objectStorage).deleteObject("documents", sealedKey);
        verify(objectStorage, never()).deleteObject("documents", stagedKey);
    }

    private KioskCapabilityDescriptor fileCapability() {
        return new KioskCapabilityDescriptor(
            "process-tasks.task.attachment.register", 1, "PROCESS_TASKS",
            KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, true, false,
            Map.of(), Map.of(), Map.of(
                "mimeTypes", List.of("application/pdf", "image/jpeg"),
                "extensions", List.of(".pdf", ".jpg", ".jpeg"),
                "maxSizeBytes", 10L * 1024L * 1024L, "maxFiles", 5));
    }

    private KioskCapabilityDescriptor presignCapability() {
        return new KioskCapabilityDescriptor(
            "process-tasks.task.attachment.presign", 1, "PROCESS_TASKS",
            KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, false, false,
            Map.of(), Map.of(), fileCapability().filePolicy());
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private void givenPendingIntent(String fileName, String mimeType, long sizeBytes)
            throws Exception {
        var rs = mock(ResultSet.class);
        given(rs.getString("bucket_name")).willReturn("documents");
        given(rs.getString("original_filename")).willReturn(fileName);
        given(rs.getString("mime_type")).willReturn(mimeType);
        given(rs.getLong("size_bytes")).willReturn(sizeBytes);
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var mapper = (RowMapper) invocation.getArgument(1);
                return List.of(mapper.mapRow(rs, 0));
            });
    }

    private KioskActionRequest registerRequest(String objectKey) {
        return KioskActionRequest.forResource(
            "process-tasks.task.attachment.register", 41L,
            Map.of(
                "object_key", objectKey,
                "original_filename", "evidence.pdf",
                "mime_type", "application/pdf",
                "size_bytes", 1024L));
    }

    private KioskCapabilityDescriptor sealingRegisterCapability() {
        var policy = new LinkedHashMap<>(fileCapability().filePolicy());
        policy.put("sealOnRegister", true);
        return new KioskCapabilityDescriptor(
            "process-tasks.task.attachment.register", 1, "PROCESS_TASKS",
            KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, true, false,
            Map.of(), Map.of(), Map.copyOf(policy));
    }
}
