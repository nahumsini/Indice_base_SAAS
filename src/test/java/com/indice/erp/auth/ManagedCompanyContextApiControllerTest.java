package com.indice.erp.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ManagedCompanyContextApiController.class)
class ManagedCompanyContextApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService auth;

    @MockBean
    private SessionCsrfService csrf;

    @MockBean
    private ManagedCompanyContextService managedCompanies;

    @Test
    void contextRequiresAnAuthenticatedSession() throws Exception {
        given(auth.currentActor(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/auth/managed-companies"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Authentication is required."));
    }

    @Test
    void rootOrDistributorCanReadTheirDelegatedCompanies() throws Exception {
        var actor = new AuthSessionUser(41L, 7L, 11L, "Distributor", "owner");
        var client = new ManagedCompanyContextResponse.ManagedCompany(
            44L, "Cliente Norte", ManagedCompanyContextService.DISTRIBUTOR_PORTFOLIO, false, true
        );
        var response = new ManagedCompanyContextResponse(
            ManagedCompanyContextService.DISTRIBUTOR_PORTFOLIO,
            7L,
            "Distribuidor Uno",
            false,
            null,
            false,
            List.of(client)
        );
        given(auth.currentActor(any())).willReturn(Optional.of(actor));
        given(managedCompanies.current(any(), any())).willReturn(response);

        mockMvc.perform(get("/api/v1/auth/managed-companies"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.authority_mode").value("DISTRIBUTOR_PORTFOLIO"))
            .andExpect(jsonPath("$.companies[0].id").value(44))
            .andExpect(jsonPath("$.companies[0].read_only").value(true));
    }

    @Test
    void activatingAClientRequiresCsrfAndPreservesTheActorSession() throws Exception {
        var actor = new AuthSessionUser(41L, 7L, 11L, "Distributor", "owner");
        var client = new ManagedCompanyContextResponse.ManagedCompany(
            44L, "Cliente Norte", ManagedCompanyContextService.DISTRIBUTOR_PORTFOLIO, true, true
        );
        var response = new ManagedCompanyContextResponse(
            ManagedCompanyContextService.DISTRIBUTOR_PORTFOLIO,
            7L,
            "Distribuidor Uno",
            true,
            client,
            true,
            List.of(client)
        );
        given(auth.currentActor(any())).willReturn(Optional.of(actor));
        given(managedCompanies.activate(any(), any(Long.class), any())).willReturn(response);

        mockMvc.perform(post("/api/v1/auth/managed-company")
                .header("X-CSRF-Token", "csrf-test")
                .contentType(APPLICATION_JSON)
                .content("{\"company_id\":44}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.active_company.id").value(44))
            .andExpect(jsonPath("$.read_only").value(true));

        verify(csrf).requireCsrf(any(), org.mockito.ArgumentMatchers.eq("csrf-test"));
        verify(managedCompanies).activate(any(), org.mockito.ArgumentMatchers.eq(44L), any());
    }

    @Test
    void clearingAClientContextReturnsToTheAuthorityCompany() throws Exception {
        var actor = new AuthSessionUser(41L, 7L, 11L, "Distributor", "owner");
        var response = new ManagedCompanyContextResponse(
            ManagedCompanyContextService.DISTRIBUTOR_PORTFOLIO,
            7L,
            "Distribuidor Uno",
            false,
            null,
            false,
            List.of()
        );
        given(auth.currentActor(any())).willReturn(Optional.of(actor));
        given(managedCompanies.clear(any(), any())).willReturn(response);

        mockMvc.perform(delete("/api/v1/auth/managed-company")
                .header("X-CSRF-Token", "csrf-test"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.active").value(false));

        verify(managedCompanies).clear(any(), any());
    }
}
