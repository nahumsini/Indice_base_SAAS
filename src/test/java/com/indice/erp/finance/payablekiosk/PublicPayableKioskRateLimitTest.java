package com.indice.erp.finance.payablekiosk;

import com.indice.erp.finance.FinanceApiExceptionHandler;
import com.indice.erp.kiosk.engine.KioskActionDispatcher;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskRateLimitExceptionHandler;
import com.indice.erp.kiosk.engine.KioskRateLimitExceededException;
import com.indice.erp.kiosk.engine.KioskRateLimitService;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PublicPayableKioskController.class)
@Import({KioskRateLimitExceptionHandler.class, FinanceApiExceptionHandler.class})
class PublicPayableKioskRateLimitTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PayableKioskAdapter adapter;

    @MockBean
    private PayableKioskService service;

    @MockBean
    private KioskActionDispatcher dispatcher;

    @MockBean
    private PublicPayableKioskCsrf csrf;

    @MockBean
    private KioskRegistryService registry;

    @MockBean
    private KioskRateLimitService rateLimit;

    @MockBean
    private KioskEngineFeatureFlags flags;

    @BeforeEach
    void enablePayablesEngine() {
        given(flags.registryEnabled()).willReturn(true);
        given(flags.sessionsEnabled()).willReturn(true);
        given(flags.auditEnabled()).willReturn(true);
        given(flags.adapterEnabled(PayableKioskCapabilities.OWNER_MODULE)).willReturn(true);
    }

    @Test
    void pinThrottleIsNotConvertedToAnInternalServerError() throws Exception {
        given(dispatcher.dispatch(any(), any(), isNull()))
            .willThrow(new KioskRateLimitExceededException(321));

        mockMvc.perform(post("/api/v1/finance/public-payable-kiosks/public-token/authenticate")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pin\":\"123456\"}"))
            .andExpect(status().isTooManyRequests())
            .andExpect(header().string("Retry-After", "321"))
            .andExpect(jsonPath("$.message").value("Too many requests. Try again later."))
            .andExpect(jsonPath("$.retry_after_seconds").value(321));
    }
}
