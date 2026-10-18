package com.indice.erp.sales;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.indice.erp.auth.*;
import com.indice.erp.access.tab.TabPermissionRouteClassifier;
import com.indice.erp.entitlement.RequiresCapability;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.web.servlet.MockMvc;
import static org.assertj.core.api.Assertions.*;

@WebMvcTest(SellerWorkspaceController.class)
class SellerWorkspaceControllerTest {
    @Autowired MockMvc mvc;
    @MockBean SessionAuthService auth;
    @MockBean SessionCsrfService csrf;
    @MockBean SellerWorkspaceService seller;
    @MockBean com.indice.erp.learning.LearningAppliedAdvice learningAppliedAdvice;
    @BeforeEach void setup(){when(auth.currentUser(any())).thenReturn(Optional.of(new AuthSessionUser(1L,7L,"Seller","admin")));}
    @Test void requiresLoginBeforeReadsAndWrites() throws Exception {
        when(auth.currentUser(any())).thenReturn(Optional.empty());
        mvc.perform(get("/api/v1/sales/opportunity-flow/4/seller/scripts")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/sales/opportunity-flow/4/seller/scripts").contentType(MediaType.APPLICATION_JSON).content("{}")) .andExpect(status().isUnauthorized());
        verifyNoInteractions(seller);
    }
    @Test void csrfRequiredForBothMutations() throws Exception {
        doThrow(new IllegalArgumentException()).when(csrf).requireCsrf(any(),any());
        for(String path:List.of("scripts","opportunities/3/interactions")) mvc.perform(post("/api/v1/sales/opportunity-flow/4/seller/"+path).contentType(MediaType.APPLICATION_JSON).content("{}")) .andExpect(status().isForbidden());
        verifyNoInteractions(seller);
    }
    @Test void derivesCompanyAndActorFromSession() throws Exception {
        mvc.perform(post("/api/v1/sales/opportunity-flow/4/seller/opportunities/3/interactions").header("X-CSRF-Token","test").contentType(MediaType.APPLICATION_JSON).content("{\"companyId\":999,\"userId\":999}")) .andExpect(status().isOk());
        verify(seller).record(eq(7L),eq(4L),eq(3L),eq(1L),any());
    }
    @Test void conflictsReturnSafeMachineCode() throws Exception {
        when(seller.saveScript(anyLong(),anyLong(),anyLong(),any())).thenThrow(new SellerWorkspaceService.Conflict("Private details"));
        mvc.perform(post("/api/v1/sales/opportunity-flow/4/seller/scripts").contentType(MediaType.APPLICATION_JSON).content("{}")) .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("seller_conflict"));
    }
    @Test void endpointsRequireSalesCapabilityAndLeadTab() {
        assertThat(SellerWorkspaceController.class.getAnnotation(RequiresCapability.class).value()).contains("sales");
        for(String path:List.of("scripts","summary","opportunities/1","opportunities/1/interactions")) {
            var request=new MockHttpServletRequest("GET","/api/v1/sales/opportunity-flow/1/seller/"+path);
            assertThat(new TabPermissionRouteClassifier().classify(request).orElseThrow().toString()).contains("crm.leads");
        }
    }
}
