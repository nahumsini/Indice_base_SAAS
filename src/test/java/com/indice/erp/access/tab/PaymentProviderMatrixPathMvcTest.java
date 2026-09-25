package com.indice.erp.access.tab;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.*;
import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.square.*;
import java.util.Optional;
import java.net.URI;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PaymentProviderMatrixPathMvcTest {
    @Test void matrixParameterCannotDowngradePaymentToSetupPermission() throws Exception {
        var auth=mock(SessionAuthService.class); var tabs=mock(TabPermissionAccessService.class);
        var user=new AuthSessionUser(3L,1L,"User","user");
        when(auth.currentUser(any())).thenReturn(Optional.of(user));
        when(tabs.canAccess(eq(user),any())).thenAnswer(call ->
            call.<TabPermissionRequirement>getArgument(1).anyOf().contains("pos.cortes"));
        var interceptor=new PaymentProviderTabInterceptor(auth,tabs,
            new PaymentProviderTabPolicy(),new ObjectMapper());
        var guard=mock(PosRequestGuard.class);
        var controller=new SquareTerminalController(guard,mock(SquareTerminalProperties.class),
            mock(SquareSetupService.class),mock(SquareTerminalPaymentService.class));
        var mvc=MockMvcBuilders.standaloneSetup(controller).addInterceptors(interceptor).build();

        mvc.perform(post("/api/v1/pos/square;x/terminal-payments")
            .session(new MockHttpSession()).contentType("application/json").content("{}"))
            .andExpect(status().isForbidden());
        mvc.perform(post(URI.create("/api/v1/pos/square%3Bx/terminal-payments"))
            .session(new MockHttpSession()).contentType("application/json").content("{}"))
            .andExpect(status().is4xxClientError());
        mvc.perform(post(URI.create("/api/v1/pos/square%3bx/terminal-payments"))
            .session(new MockHttpSession()).contentType("application/json").content("{}"))
            .andExpect(status().is4xxClientError());
        verifyNoInteractions(guard);
    }
}
