package com.indice.erp.hr;

import com.indice.erp.hr.permissions.HrPermissionAttachmentRepository;
import com.indice.erp.hr.permissions.HrPermissionAttachmentService;
import com.indice.erp.hr.permissions.HrPermissionCommandRepository;
import com.indice.erp.hr.permissions.HrPermissionQueryService;
import com.indice.erp.hr.permissions.PermissionActor;
import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.util.Map;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HrPermissionAttachmentServiceTest {

    @Mock
    private HrPermissionCommandRepository commandRepository;

    @Mock
    private HrPermissionAttachmentRepository attachmentRepository;

    @Mock
    private HrPermissionQueryService queryService;

    @Mock
    private ObjectStorageService objectStorageService;

    @Test
    void createOwnUploadRejectsWhenStorageIsDisabled() {
        var service = createService();
        var actor = new PermissionActor(7L, 1L, 12L, "Attendance User", "user", java.util.List.of());

        when(commandRepository.loadRequestState(1L, 9L))
            .thenReturn(new HrPermissionCommandRepository.PermissionRequestState(9L, 12L, "pending"));
        when(objectStorageService.isEnabled()).thenReturn(false);

        var error = assertThrows(ObjectStorageDisabledException.class, () -> service.createOwnUpload(actor, 9L, Map.of(
            "file_name", "support.pdf",
            "content_type", "application/pdf",
            "size_bytes", 1024
        )));

        assertEquals("Object storage is not enabled.", error.getMessage());
    }

    @Test
    void registerOwnAttachmentRejectsAnotherUsersRequest() {
        var service = createService();
        var actor = new PermissionActor(7L, 1L, 12L, "Attendance User", "user", java.util.List.of());

        when(commandRepository.loadRequestState(1L, 9L))
            .thenReturn(new HrPermissionCommandRepository.PermissionRequestState(9L, 44L, "pending"));

        var error = assertThrows(NoSuchElementException.class, () -> service.registerOwnAttachment(actor, 9L, Map.of(
            "file_name", "support.pdf",
            "content_type", "application/pdf",
            "size_bytes", 1024,
            "object_key", "hr/permissions/1/9/attachments/2026/05/18/file.pdf"
        )));

        assertEquals("Permission request not found.", error.getMessage());
    }

    private HrPermissionAttachmentService createService() {
        var properties = new ObjectStorageProperties();
        properties.setProvider("minio");
        properties.getMinio().setBucketDocuments("indice-hr-documents");
        properties.getMinio().setPresignExpirySeconds(900);
        return new HrPermissionAttachmentService(
            commandRepository,
            attachmentRepository,
            queryService,
            objectStorageService,
            properties
        );
    }
}
