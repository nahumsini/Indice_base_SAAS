package com.indice.erp.finance.providers;

import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.providers.dto.DeleteProviderResponse;
import com.indice.erp.finance.providers.dto.ProviderListResponse;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProviderControllerTest {

    @Mock
    private FinanceRequestGuard guard;

    @Mock
    private ProviderService providerService;

    @Mock
    private HttpSession session;

    @Test
    void listUsesReadGuardAndReturnsProviders() {
        var controller = controller();
        var context = ProviderTestData.context();
        var body = new ProviderListResponse(List.of(ProviderTestData.response(99L)), 1);
        when(guard.requireReadAccess(session)).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(providerService.list(context)).thenReturn(body);

        var response = controller.list(session);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireReadAccess(session);
    }

    @Test
    void getUsesReadGuardAndReturnsProvider() {
        var controller = controller();
        var context = ProviderTestData.context();
        var body = ProviderTestData.response(55L);
        when(guard.requireReadAccess(session)).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(providerService.get(context, 55L)).thenReturn(body);

        var response = controller.get(session, 55L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
    }

    @Test
    void createUsesWriteGuardWithCsrfAndReturnsCreated() {
        var controller = controller();
        var context = ProviderTestData.context();
        var request = ProviderTestData.createRequest("ACME", "RFC123");
        var body = ProviderTestData.response(88L);
        when(guard.requireWriteAccess(session, "csrf-token")).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(providerService.create(context, request)).thenReturn(body);

        var response = controller.create(session, "csrf-token", request);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireWriteAccess(session, "csrf-token");
    }

    @Test
    void updateUsesWriteGuardWithCsrf() {
        var controller = controller();
        var context = ProviderTestData.context();
        var request = ProviderTestData.updateRequest("ACME", "RFC123", ProviderStatus.INACTIVE);
        var body = ProviderTestData.response(89L);
        when(guard.requireWriteAccess(session, "csrf-token")).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(providerService.update(context, 89L, request)).thenReturn(body);

        var response = controller.update(session, "csrf-token", 89L, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireWriteAccess(session, "csrf-token");
    }

    @Test
    void deleteUsesWriteGuardWithCsrf() {
        var controller = controller();
        var context = ProviderTestData.context();
        var body = new DeleteProviderResponse(true);
        when(guard.requireWriteAccess(session, "csrf-token")).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(providerService.delete(context, 90L)).thenReturn(body);

        var response = controller.delete(session, "csrf-token", 90L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireWriteAccess(session, "csrf-token");
    }

    @Test
    void createReturnsGuardErrorWithoutCallingService() {
        var controller = controller();
        var error = ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Invalid CSRF token."));
        when(guard.requireWriteAccess(session, null)).thenReturn(new FinanceRequestGuard.Result(null, error));

        var response = controller.create(session, null, ProviderTestData.createRequest("ACME", "RFC123"));

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(error.getBody(), response.getBody());
        verifyNoInteractions(providerService);
    }

    private FinanceProvidersController controller() {
        return new FinanceProvidersController(guard, providerService);
    }
}
