package com.indice.erp.hr;

import com.indice.erp.hr.permissions.HrPermissionAttachmentRepository;
import com.indice.erp.hr.permissions.HrPermissionCommandRepository;
import com.indice.erp.hr.permissions.HrPermissionDeleteRepository;
import com.indice.erp.hr.permissions.HrPermissionSelfDeleteService;
import com.indice.erp.hr.permissions.PermissionActor;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.util.List;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HrPermissionSelfDeleteServiceTest {

    @Mock
    private HrPermissionCommandRepository commandRepository;

    @Mock
    private HrPermissionAttachmentRepository attachmentRepository;

    @Mock
    private HrPermissionDeleteRepository deleteRepository;

    @Mock
    private ObjectStorageService objectStorageService;

    @Mock
    private ObjectStorageProperties storageProperties;

    @Test
    void deleteOwnPendingRemovesRequestAndAttachments() {
        var service = createService();
        var actor = new PermissionActor(7L, 1L, 12L, "Attendance User", "user", List.of());
        var minio = new ObjectStorageProperties.Minio();
        minio.setBucketDocuments("indice-hr-documents");

        when(commandRepository.loadRequestState(1L, 9L)).thenReturn(new HrPermissionCommandRepository.PermissionRequestState(9L, 12L, "pending"));
        when(attachmentRepository.listActiveObjectKeys(1L, 9L)).thenReturn(List.of("permissions/9/file.pdf"));
        when(deleteRepository.deletePendingOwnRequest(1L, 12L, 9L)).thenReturn(1);
        when(objectStorageService.isEnabled()).thenReturn(true);
        when(storageProperties.getMinio()).thenReturn(minio);

        var result = service.deleteOwnPending(actor, 9L);

        assertEquals(true, result.get("deleted"));
        assertEquals(9L, result.get("permissionId"));
        verify(objectStorageService).deleteObject("indice-hr-documents", "permissions/9/file.pdf");
    }

    @Test
    void deleteOwnPendingRejectsApprovedRequests() {
        var service = createService();
        var actor = new PermissionActor(7L, 1L, 12L, "Attendance User", "user", List.of());

        when(commandRepository.loadRequestState(1L, 9L)).thenReturn(new HrPermissionCommandRepository.PermissionRequestState(9L, 12L, "approved"));

        var error = assertThrows(IllegalArgumentException.class, () -> service.deleteOwnPending(actor, 9L));

        assertEquals("Only pending permission requests can be deleted.", error.getMessage());
        verify(deleteRepository, never()).deletePendingOwnRequest(1L, 12L, 9L);
    }

    @Test
    void deleteOwnPendingRejectsOtherUsersRequest() {
        var service = createService();
        var actor = new PermissionActor(7L, 1L, 12L, "Attendance User", "user", List.of());

        when(commandRepository.loadRequestState(1L, 9L)).thenReturn(new HrPermissionCommandRepository.PermissionRequestState(9L, 44L, "pending"));

        assertThrows(NoSuchElementException.class, () -> service.deleteOwnPending(actor, 9L));
        verify(deleteRepository, never()).deletePendingOwnRequest(1L, 12L, 9L);
    }

    private HrPermissionSelfDeleteService createService() {
        return new HrPermissionSelfDeleteService(
            commandRepository,
            attachmentRepository,
            deleteRepository,
            objectStorageService,
            storageProperties,
            mock(com.indice.erp.billing.storage.CompanyStorageMeter.class)
        );
    }
}
