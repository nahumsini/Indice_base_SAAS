package com.indice.erp.sales;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.assertj.core.api.Assertions.*;
import com.indice.erp.auth.*;
import com.indice.erp.access.tab.*;
import com.indice.erp.entitlement.RequiresCapability;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PostSaleWorkspaceController.class)
class PostSaleWorkspaceControllerTest {
    static final String BASE="/api/v1/sales/post-sales/workspace";
    @Autowired MockMvc mvc;
    @MockBean SessionAuthService auth;
    @MockBean SessionCsrfService csrf;
    @MockBean PostSaleWorkspaceService service;
    @MockBean TabPermissionAccessService tabs;
    @MockBean com.indice.erp.learning.LearningAppliedAdvice learningAppliedAdvice;
    @BeforeEach void setup(){when(auth.currentUser(any())).thenReturn(Optional.of(new AuthSessionUser(1L,7L,"Seller","admin")));when(tabs.canAccess(any(),any())).thenReturn(true);}
    @Test void authenticationAndPostSalePermissionProtectReadsAndMutations() throws Exception {
        when(auth.currentUser(any())).thenReturn(Optional.empty());
        mvc.perform(get(BASE)).andExpect(status().isUnauthorized());
        when(auth.currentUser(any())).thenReturn(Optional.of(new AuthSessionUser(1L,7L,"Seller","admin")));
        when(tabs.canAccess(any(),any())).thenReturn(false);
        mvc.perform(get(BASE)).andExpect(status().isForbidden());
        mvc.perform(put(BASE+"/items/won/4").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());verifyNoInteractions(service);
    }
    @Test void reactivationRequiresBothPostSalesAndOpportunities() throws Exception {
        when(tabs.canAccess(any(),any())).thenAnswer(call->call.getArgument(1).toString().contains("crm.contracts"));
        mvc.perform(post(BASE+"/items/lost/4/reactivate").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());verifyNoInteractions(service);
    }
    @Test void csrfRequiredForEveryMutation() throws Exception {
        doThrow(new IllegalArgumentException()).when(csrf).requireCsrf(any(),any());
        mvc.perform(put(BASE+"/items/won/4").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
        mvc.perform(post(BASE+"/items/lost/4/reactivate").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
        mvc.perform(post(BASE+"/flows").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
        mvc.perform(put(BASE+"/flows/1").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());verifyNoInteractions(service);
    }
    @Test void actorAndCompanyComeFromSessionAndConflictsAreSafe() throws Exception {
        mvc.perform(put(BASE+"/items/won/4").contentType(MediaType.APPLICATION_JSON).content("{\"companyId\":999,\"userId\":999}")).andExpect(status().isOk());
        verify(service).save(eq(7L),eq(1L),eq("won"),eq(4L),any());
        when(service.save(anyLong(),anyLong(),anyString(),anyLong(),any())).thenThrow(new PostSaleWorkspaceService.Conflict());
        mvc.perform(put(BASE+"/items/won/4").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("post_sale_conflict"));
    }
    @Test void routesKeepSalesEntitlementAndPostSalesTabOwner() {
        assertThat(PostSaleWorkspaceController.class.getAnnotation(RequiresCapability.class).value()).contains("sales");
        for(String path:List.of("","/flows","/items/won/4","/items/lost/4/reactivate"))assertThat(new TabPermissionRouteClassifier().classify(new MockHttpServletRequest("GET",BASE+path)).orElseThrow().toString()).contains("crm.contracts");
    }
    @Test void sortingDefaultsAndExplicitOrderKeepSessionAuthority() throws Exception {
        mvc.perform(get(BASE).param("companyId","999")).andExpect(status().isOk());
        verify(service).workspace(eq(7L),eq("won"),isNull(),isNull(),isNull(),isNull(),eq(1),eq(50),eq(true),
            eq(new PostSaleWorkspaceDtos.WorkspaceSort("nextAction","asc")));
        mvc.perform(get(BASE).param("kind","lost").param("sort","stage").param("direction","desc").param("page","2").param("pageSize","10")).andExpect(status().isOk());
        verify(service).workspace(eq(7L),eq("lost"),isNull(),isNull(),isNull(),isNull(),eq(2),eq(10),eq(true),
            eq(new PostSaleWorkspaceDtos.WorkspaceSort("stage","desc")));
    }
    @Test void unknownSortAndDirectionAreRejectedBeforeBusinessQueries() throws Exception {
        for(String column:List.of("company_id","client DESC; DROP TABLE users","totalAmount"))
            mvc.perform(get(BASE).param("sort",column)).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("post_sale_validation"));
        mvc.perform(get(BASE).param("direction","asc; SELECT 1")).andExpect(status().isUnprocessableEntity());
        verifyNoInteractions(service);
    }
}
