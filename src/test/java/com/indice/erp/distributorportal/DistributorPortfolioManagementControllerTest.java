package com.indice.erp.distributorportal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.config.AppWebProperties;
import com.indice.erp.configcenter.InvitationEmailService;
import com.indice.erp.consulting.ConsultingAdministrationService;
import com.indice.erp.platformadmin.PlatformAccountProvisioningService;
import com.indice.erp.platformadmin.PlatformAdminService;
import com.indice.erp.platformadmin.PlatformCompanyModuleService;
import com.indice.erp.platformadmin.PlatformCompanyUserService;
import com.indice.erp.platformadmin.PlatformTrialExtensionService;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(DistributorPortfolioManagementController.class)
class DistributorPortfolioManagementControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService auth;

    @MockBean
    private SessionCsrfService csrf;

    @MockBean
    private DistributorPortfolioAccessPolicy portfolioAccess;

    @MockBean
    private PlatformAdminService accounts;

    @MockBean
    private PlatformAccountProvisioningService provisioning;

    @MockBean
    private PlatformCompanyModuleService companyModules;

    @MockBean
    private PlatformCompanyUserService companyUsers;

    @MockBean
    private PlatformTrialExtensionService trialExtensions;

    @MockBean
    private ConsultingAdministrationService consulting;

    @MockBean
    private InvitationEmailService invitationEmailService;

    @MockBean
    private AppWebProperties appWebProperties;

    @Test
    void distributorCatalogUsesOnlyTheActiveCommercialOffer() throws Exception {
        var actor = new AuthSessionUser(9L, 12L, 22L, "Distributor Owner", "superadmin");
        given(auth.currentUser(any())).willReturn(Optional.of(actor));
        given(portfolioAccess.requireDistributor(actor))
            .willReturn(new DistributorPortfolioAccessPolicy.DistributorIdentity(12L, "Aliado Norte"));
        given(accounts.activeCatalogAfterAuthorization()).willReturn(Map.of(
            "versions", List.of(Map.of("id", 1L, "status", "ACTIVE")),
            "products", List.of(Map.of("product_code", "basic_expenses"))
        ));

        mockMvc.perform(get("/api/v1/distributor-portal/catalog"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.versions[0].status").value("ACTIVE"))
            .andExpect(jsonPath("$.products[0].product_code").value("basic_expenses"));

        verify(accounts).activeCatalogAfterAuthorization();
        verify(accounts, never()).catalogAfterAuthorization();
    }
}
