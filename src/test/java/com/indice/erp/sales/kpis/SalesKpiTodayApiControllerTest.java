package com.indice.erp.sales.kpis;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.kpis.currency.KpiExchangeRateContext;
import com.indice.erp.kpis.currency.KpiMonetaryAggregate;
import com.indice.erp.kpis.currency.KpiNativeCurrencyTotal;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(SalesKpiTodayApiController.class)
class SalesKpiTodayApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private SalesKpiTodayService service;

    @Test
    void rejectsMissingSession() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/sales/kpis/today"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void derivesTenantFromSessionAndReturnsTypedSummary() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(
            new AuthSessionUser(5L, 23L, 71L, "Demo", "admin")
        ));
        given(service.today(23L, "MXN")).willReturn(summary());

        mockMvc.perform(get("/api/v1/sales/kpis/today").param("preferredCurrency", "MXN"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.date").value("2026-08-31"))
            .andExpect(jsonPath("$.timezone").value("America/Toronto"))
            .andExpect(jsonPath("$.saleCount").value(1))
            .andExpect(jsonPath("$.monetaryTotal.preferredCurrency").value("MXN"))
            .andExpect(jsonPath("$.monetaryTotal.preferredTotal").value(125.50));
    }

    private SalesTodaySummaryResponse summary() {
        return new SalesTodaySummaryResponse(
            LocalDate.of(2026, 8, 31),
            "America/Toronto",
            1,
            new KpiMonetaryAggregate(
                "MXN",
                new BigDecimal("125.50"),
                List.of(new KpiNativeCurrencyTotal("MXN", new BigDecimal("125.50"))),
                new KpiExchangeRateContext("daily", LocalDate.of(2026, 8, 31), "Official sources"),
                false,
                0,
                List.of()
            )
        );
    }
}
