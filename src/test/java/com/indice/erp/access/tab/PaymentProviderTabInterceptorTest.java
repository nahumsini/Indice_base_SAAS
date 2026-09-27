package com.indice.erp.access.tab;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PaymentProviderTabInterceptorTest {
    @Test void deniesSquarePaymentWithoutSalePermission() throws Exception {
        var auth = mock(SessionAuthService.class); var access = mock(TabPermissionAccessService.class);
        var request = new MockHttpServletRequest("POST", "/api/v1/pos/square/terminal-payments");
        request.getSession();
        when(auth.currentUser(any())).thenReturn(Optional.of(new AuthSessionUser(3L, 1L, "User", "user")));
        when(access.canAccess(any(), any())).thenReturn(false);
        var response = new MockHttpServletResponse();
        var interceptor = new PaymentProviderTabInterceptor(auth, access,
            new PaymentProviderTabPolicy(), new ObjectMapper());

        assertThat(interceptor.preHandle(request, response, new Object())).isFalse();
        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("tab_permission_required", "pos.sale");
    }

    @Test void exactProviderWebhookBypassesBrowserTabPermission() throws Exception {
        var access = mock(TabPermissionAccessService.class);
        var interceptor = new PaymentProviderTabInterceptor(mock(SessionAuthService.class), access,
            new PaymentProviderTabPolicy(), new ObjectMapper());
        var request = new MockHttpServletRequest("POST", "/api/v1/pos/square/webhook");

        assertThat(interceptor.preHandle(request, new MockHttpServletResponse(), new Object())).isTrue();
        verifyNoInteractions(access);
    }
}
