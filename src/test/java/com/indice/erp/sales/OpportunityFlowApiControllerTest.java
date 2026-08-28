package com.indice.erp.sales;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.sales.OpportunityFlowDtos.CatalogResponse;
import com.indice.erp.sales.OpportunityFlowDtos.FlowResponse;
import com.indice.erp.sales.OpportunityFlowDtos.StageResponse;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(OpportunityFlowApiController.class)
class OpportunityFlowApiControllerTest {

    private static final AuthSessionUser CURRENT_USER = new AuthSessionUser(1L, 7L, "Admin", "admin");

    @Autowired MockMvc mockMvc;
    @MockBean SessionAuthService sessionAuthService;
    @MockBean SessionCsrfService sessionCsrfService;
    @MockBean OpportunityFlowAccessService accessService;
    @MockBean OpportunityFlowService flowService;

    @BeforeEach
    void authenticate() {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(CURRENT_USER));
    }

    @Test
    void returnsTheTenantFlowAndManagementCapability() throws Exception {
        given(accessService.canManage(CURRENT_USER)).willReturn(true);
        given(flowService.catalog(7L, true)).willReturn(response(true));

        mockMvc.perform(get("/api/v1/sales/opportunity-flow"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canManage").value(true))
                .andExpect(jsonPath("$.defaultFlowId").value(1))
                .andExpect(jsonPath("$.flows[0].stages[0].key").value("new"));
    }

    @Test
    void rejectsMutationWithoutCsrfBeforeCallingTheFlowService() throws Exception {
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
                .given(sessionCsrfService).requireCsrf(any(), any());

        mockMvc.perform(post("/api/v1/sales/opportunity-flow")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Custom\",\"stages\":[]}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Invalid CSRF token."));

        verifyNoInteractions(flowService);
    }

    @Test
    void rejectsNonAdministrativeMutation() throws Exception {
        given(accessService.canManage(CURRENT_USER)).willReturn(false);

        mockMvc.perform(put("/api/v1/sales/opportunity-flow/2")
                        .header("X-CSRF-Token", "csrf-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Custom\",\"stages\":[]}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(flowService);
    }

    private static CatalogResponse response(boolean canManage) {
        return new CatalogResponse(List.of(new FlowResponse(
                1L,
                "factory",
                "Factory flow",
                true,
                true,
                List.of(new StageResponse("new", "New", "OPEN", "BLUE", 10, 0, false, 0)))),
                1L,
                canManage);
    }
}
