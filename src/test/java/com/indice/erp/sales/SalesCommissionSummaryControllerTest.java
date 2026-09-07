package com.indice.erp.sales;

import com.indice.erp.auth.*;
import com.indice.erp.kpis.KpiRequestAccessService;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.access.tab.TabPermissionRouteClassifier;
import java.util.Optional;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.assertj.core.api.Assertions.*;

@WebMvcTest(SalesCommissionSummaryController.class)
class SalesCommissionSummaryControllerTest {
    @Autowired MockMvc mvc;
    @MockBean SessionAuthService auth;
    @MockBean KpiRequestAccessService access;
    @MockBean SalesCommissionSummaryService service;
    final String path="/api/v1/sales/commission-summary";
    final String body="{\"preferredCurrency\":\"USD\",\"selections\":[{\"saleId\":1,\"componentIndexes\":[0]}]}";
    @Test void anonymousIsDeniedBeforeDataAccess() throws Exception {
        when(auth.currentUser(any())).thenReturn(Optional.empty());
        mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
        verifyNoInteractions(service,access);
    }
    @Test void queryUsesOnlyAuthenticatedCompanyAndResolvedScope() throws Exception {
        var user=new AuthSessionUser(11L,7L,"Test","admin");
        when(auth.currentUser(any())).thenReturn(Optional.of(user));
        var scope=HrOperationalScope.businessOffice(3L,4L);
        when(access.monetary(user,"SALES_COMMISSION")).thenReturn(scope);
        mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
        verify(service).summarize(eq(7L),eq(scope),any());
    }
    @Test void invalidIndicesAndCurrencyAreRejectedWithoutReadingData() throws Exception {
        mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body.replace("[0]","[-1]"))).andExpect(status().isBadRequest());
        mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body.replace("USD","INVALID"))).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void foreignSelectionIsUnavailable() throws Exception {
        var user=new AuthSessionUser(11L,7L,"Test","admin");
        when(auth.currentUser(any())).thenReturn(Optional.of(user));
        when(access.monetary(user,"SALES_COMMISSION")).thenReturn(HrOperationalScope.corporateOffice());
        when(service.summarize(eq(7L),any(),any())).thenThrow(new NoSuchElementException("Unavailable"));
        mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isNotFound());
    }
    @Test void routeHasAnExplicitOwnerTab() {
        assertThat(new TabPermissionRouteClassifier().classify(new org.springframework.mock.web.MockHttpServletRequest("POST", path))
            .orElseThrow().anyOf()).containsExactly("crm.sales");
    }
    @Test void missingModuleOrScopePermissionIsDeniedBeforeReadingMoney() throws Exception {
        var user=new AuthSessionUser(11L,7L,"Test","user");
        when(auth.currentUser(any())).thenReturn(Optional.of(user));
        when(access.monetary(user,"SALES_COMMISSION")).thenThrow(new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN));
        mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
}
