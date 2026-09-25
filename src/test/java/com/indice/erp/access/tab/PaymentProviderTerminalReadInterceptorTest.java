package com.indice.erp.access.tab;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PaymentProviderTerminalReadInterceptorTest {
    @Test void mercadoPagoTerminalReadAcceptsEitherPosPermission() throws Exception {
        var auth=mock(SessionAuthService.class); var access=mock(TabPermissionAccessService.class);
        var user=new AuthSessionUser(3L,1L,"User","admin");
        var request=new MockHttpServletRequest("GET","/api/v1/pos/mercado-pago/terminals");
        request.getSession(); when(auth.currentUser(any())).thenReturn(Optional.of(user));
        when(access.canAccess(eq(user),argThat(requirement ->
            requirement.anyOf().containsAll(java.util.List.of("pos.sale","pos.cortes"))))).thenReturn(true);
        var allowed=new PaymentProviderTabInterceptor(auth,access,new PaymentProviderTabPolicy(),
            new ObjectMapper()).preHandle(request,new MockHttpServletResponse(),new Object());
        assertThat(allowed).isTrue(); verify(access).canAccess(eq(user),any());
    }
}
