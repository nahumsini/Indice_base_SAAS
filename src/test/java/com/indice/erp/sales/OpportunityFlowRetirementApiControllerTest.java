package com.indice.erp.sales;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.indice.erp.auth.*;
import java.util.Optional;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(OpportunityFlowRetirementApiController.class)
class OpportunityFlowRetirementApiControllerTest {
    @MockBean com.indice.erp.learning.LearningAppliedAdvice learningAppliedAdvice;
    @MockBean SessionAuthService auth;
    @MockBean SessionCsrfService csrf;
    @MockBean OpportunityFlowAccessService access;
    @MockBean OpportunityFlowRetirementService service;
    @Autowired MockMvc mvc;
    final AuthSessionUser user=new AuthSessionUser(1L,7L,"Synthetic","admin");
    final String url="/api/v1/sales/opportunity-flow/2/retirement";
    @BeforeEach void setup(){given(auth.currentUser(any())).willReturn(Optional.of(user));given(access.canManage(user)).willReturn(true);}
    @Test void authenticationAndActorAreRequired() throws Exception {
        given(auth.currentUser(any())).willReturn(Optional.empty());
        mvc.perform(get(url).param("targetFlowId","1")).andExpect(status().isUnauthorized());
        given(auth.currentUser(any())).willReturn(Optional.of(user));
        mvc.perform(get(url).param("targetFlowId","1")).andExpect(status().isConflict());
        mvc.perform(get(url).param("targetFlowId","1").header("X-Flow-Actor","8:1")).andExpect(status().isConflict());
        verifyNoInteractions(service);
    }
    @Test void permissionsAndCsrfFailClosed() throws Exception {
        given(access.canManage(user)).willReturn(false);
        mvc.perform(get(url).param("targetFlowId","1").header("X-Flow-Actor","7:1")).andExpect(status().isForbidden());
        given(access.canManage(user)).willReturn(true);
        willThrow(new IllegalArgumentException()).given(csrf).requireCsrf(any(),any());
        mvc.perform(post(url).header("X-Flow-Actor","7:1").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isForbidden());verifyNoInteractions(service);
    }
    @Test void currentCompanyAndUserArePassedToTheOwnerAndStaleReviewIsAConflict() throws Exception {
        given(service.retire(eq(7L),eq(1L),eq(2L),any())).willThrow(new OpportunityFlowRetirementService.Changed());
        mvc.perform(post(url).header("X-Flow-Actor","7:1").header("X-CSRF-Token","test-only").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("flow_changed"));
    }
}
