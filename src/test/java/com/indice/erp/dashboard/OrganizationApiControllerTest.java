package com.indice.erp.dashboard;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
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

@WebMvcTest(OrganizationApiController.class)
class OrganizationApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private OrganizationService organizationService;

    @Test
    void modulesReturnsUnauthorizedWhenSessionIsMissing() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/modules"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void modulesUsesSessionUserCompanyAndRole() throws Exception {
        var currentUser = new AuthSessionUser(11L, 7L, "Admin User", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(organizationService.listModules(11L, 7L, "admin")).willReturn(List.of(
            new ModuleListItem(
                "config_center",
                "Panel Inicial",
                "Company setup",
                "basic",
                "basic",
                "bi-gear-fill",
                null,
                false,
                false,
                "/modules/config_center/"
            )
        ));

        mockMvc.perform(get("/api/v1/modules"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].slug").value("config_center"));

        verify(organizationService).listModules(11L, 7L, "admin");
    }
}
