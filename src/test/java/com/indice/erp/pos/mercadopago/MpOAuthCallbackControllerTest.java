package com.indice.erp.pos.mercadopago;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class MpOAuthCallbackControllerTest {
    @Test void callbackOnlyRedirectsToAuthenticatedWorkspaceWithNoCache() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new MpOAuthCallbackController()).build();
        String state = "a".repeat(43);
        mvc.perform(get("/api/v1/pos/mercado-pago/oauth/callback").param("code", "synthetic-code").param("state", state))
            .andExpect(status().isSeeOther())
            .andExpect(header().string("Location", "/point-of-sale/cajas?mp_oauth_code=synthetic-code&mp_oauth_state=" + state))
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(header().string("Referrer-Policy", "no-referrer"));
    }
    @Test void malformedAndDeniedCallbacksCarryNoProviderText() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new MpOAuthCallbackController()).build();
        mvc.perform(get("/api/v1/pos/mercado-pago/oauth/callback").param("code", "synthetic-code").param("state", "invalid"))
            .andExpect(header().string("Location", "/point-of-sale/cajas?mp_oauth_error=invalid_response"));
        mvc.perform(get("/api/v1/pos/mercado-pago/oauth/callback").param("error", "provider-sensitive-error"))
            .andExpect(header().string("Location", "/point-of-sale/cajas?mp_oauth_error=access_denied"));
    }
}
