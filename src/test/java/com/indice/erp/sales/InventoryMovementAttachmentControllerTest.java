package com.indice.erp.sales;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.indice.erp.auth.*;
import com.indice.erp.access.tab.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
class InventoryMovementAttachmentControllerTest {
    SessionAuthService auth=mock(SessionAuthService.class);
    SessionCsrfService csrf=mock(SessionCsrfService.class);
    TabPermissionAccessService tabs=mock(TabPermissionAccessService.class);
    InventoryMovementAttachmentService service=mock(InventoryMovementAttachmentService.class);
    InventoryMovementAttachmentController controller=new InventoryMovementAttachmentController(auth,csrf,tabs,service);
    MockHttpSession session=new MockHttpSession();
    AuthSessionUser user=new AuthSessionUser(1L,7L,"Fixture","root");
    @Test void anonymousRequestsFailClosed() {
        when(auth.currentUser(session)).thenReturn(Optional.empty());
        assertEquals(401,controller.list(session,99L).getStatusCode().value());
        verifyNoInteractions(service);
    }
    @Test void missingTabPermissionCannotReadFiles() {
        when(auth.currentUser(session)).thenReturn(Optional.of(user));
        when(tabs.canAccess(eq(user),any())).thenReturn(false);
        assertEquals(403,controller.list(session,99L).getStatusCode().value());
        verifyNoInteractions(service);
    }
    @Test void writesRequireCsrfBeforeOwnerInvocation() {
        when(auth.currentUser(session)).thenReturn(Optional.of(user));
        doThrow(new IllegalArgumentException("Invalid CSRF token.")).when(csrf).requireCsrf(session,null);
        assertEquals(403,controller.reserve(session,99L,null,new InventoryMovementAttachmentService.UploadRequest("invoice.pdf","application/pdf",8)).getStatusCode().value());
        verifyNoInteractions(service);
    }
    @Test void unavailablePrivateStorageIsReadableFailure() {
        when(auth.currentUser(session)).thenReturn(Optional.of(user));
        when(tabs.canAccess(eq(user),any())).thenReturn(true);
        when(service.reserve(eq(user),eq(99L),any())).thenThrow(new com.indice.erp.storage.ObjectStorageDisabledException("Storage unavailable"));
        assertEquals(503,controller.reserve(session,99L,"token",new InventoryMovementAttachmentService.UploadRequest("invoice.pdf","application/pdf",8)).getStatusCode().value());
    }
}
