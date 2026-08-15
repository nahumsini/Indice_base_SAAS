package com.indice.erp.distributorportal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(DistributorPortalApiController.class)
class DistributorPortalApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService auth;

    @MockBean
    private DistributorPortalService service;

    @Test
    void contextRequiresAnAuthenticatedSession() throws Exception {
        given(auth.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/distributor-portal/context"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void distributorContextIsReturnedForTheActiveCompany() throws Exception {
        var actor = new AuthSessionUser(9L, 12L, 22L, "Distributor Owner", "superadmin");
        given(auth.currentUser(any())).willReturn(Optional.of(actor));
        given(service.context(actor)).willReturn(new DistributorPortalResponse.Context(
            12L,
            "Aliado Norte",
            "Distributor Owner",
            "DISTRIBUTOR",
            "superadmin",
            List.of("CONTRACTS_ACCESS", "CONSULTING", "SYSTEM_TICKETS")
        ));

        mockMvc.perform(get("/api/v1/distributor-portal/context"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.account_type").value("DISTRIBUTOR"))
            .andExpect(jsonPath("$.operator_name").value("Distributor Owner"))
            .andExpect(jsonPath("$.available_tabs[0]").value("CONTRACTS_ACCESS"))
            .andExpect(jsonPath("$.available_tabs[1]").value("CONSULTING"))
            .andExpect(jsonPath("$.available_tabs[2]").value("SYSTEM_TICKETS"));
    }

    @Test
    void nonDistributorCompanyIsForbidden() throws Exception {
        var actor = new AuthSessionUser(9L, 12L, 22L, "Customer Owner", "superadmin");
        given(auth.currentUser(any())).willReturn(Optional.of(actor));
        given(service.context(actor)).willThrow(
            new DistributorPortalForbiddenException("The active company is not a distributor account.")
        );

        mockMvc.perform(get("/api/v1/distributor-portal/context"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("The active company is not a distributor account."));
    }
}
