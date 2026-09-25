package com.indice.erp.ai.commercial;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.*;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.sales.SalesAssistantService;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class AiCommercialApiControllerTest {
    AiAccessTokenService tokens = mock(AiAccessTokenService.class);
    AiCommercialAccess access = mock(AiCommercialAccess.class);
    AiCommercialActionService actions = mock(AiCommercialActionService.class);
    SalesAssistantService owner = mock(SalesAssistantService.class);
    AiToolUsageAuditService audit = mock(AiToolUsageAuditService.class);
    AiActionRepository actionAudit = mock(AiActionRepository.class);
    AiAccessTokenRepository.StoredToken token = new AiAccessTokenRepository.StoredToken(11,
        new AuthSessionUser(1L,2L,3L,"Synthetic","root"), Set.of("customers.create"));
    MockMvc mvc;
    @BeforeEach void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new AiCommercialApiController(tokens,access,actions,owner,audit,actionAudit,
            new ObjectMapper().findAndRegisterModules())).build();
    }
    @Test void everyCommercialEndpointRequiresBearerAndItsExactScope() throws Exception {
        when(tokens.authenticate(any(),anyString())).thenReturn(Optional.empty());
        for (String tool : AiCommercialAccess.READS) anonymous(tool);
        for (String tool : AiCommercialAccess.ACTIONS) { anonymous(tool); anonymous("preview_"+tool); }
        verifyNoInteractions(actions,owner);
    }
    private void anonymous(String tool) throws Exception {
        mvc.perform(post("/api/v1/ai/tools/commercial/"+tool).contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isUnauthorized()).andExpect(header().string("Cache-Control","no-store"));
        verify(tokens,atLeastOnce()).authenticate(null,AiCommercialAccess.scope(tool.replace("preview_","")));
    }
    @Test void backendRejectsAuthorityUnknownNestedFieldsAndUnconfirmedPayload() throws Exception {
        when(tokens.authenticate(any(),anyString())).thenReturn(Optional.of(token));
        for (String body : new String[]{"{\"name\":\"Test\",\"companyId\":99}","{\"name\":\"Test\",\"unitId\":8}","{\"items\":[{\"productName\":\"Test\",\"lineTotal\":0}]}","{\"ownerUserCompanyId\":1.5}"}) {
            mvc.perform(post("/api/v1/ai/tools/commercial/preview_create_customer").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("invalid_request"));
        }
        mvc.perform(post("/api/v1/ai/tools/commercial/create_customer").contentType(MediaType.APPLICATION_JSON)
            .content("{\"confirmationToken\":\"synthetic\",\"idempotencyKey\":\"synthetic\",\"name\":\"Injected\"}"))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(actions,owner);
    }
    @Test void permissionRevocationAndStalePreviewHaveSafeDistinctErrors() throws Exception {
        when(tokens.authenticate(any(),anyString())).thenReturn(Optional.of(token));
        doThrow(new SecurityException("private context")).when(access).require(token,"create_customer");
        mvc.perform(post("/api/v1/ai/tools/commercial/preview_create_customer").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.message").value("Current Indice permissions and organizational scope are required."));
        verifyNoInteractions(actions);
    }
}
