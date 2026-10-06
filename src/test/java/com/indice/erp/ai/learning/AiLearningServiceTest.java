package com.indice.erp.ai.learning;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.*;
import com.indice.erp.auth.AuthSessionUser;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class AiLearningServiceTest {
    @Test void commercialGuidesUseCurrentRoutesTabsAndOnlyTheirAuthorizedDomainActions() throws Exception {
        var authorization=mock(AiToolAuthorizationService.class);var capabilities=mock(AiToolCapabilityService.class);
        var user=new AuthSessionUser(1L,2L,3L,"Synthetic","root");
        var token=new AiAccessTokenRepository.StoredToken(4,user,Set.of("learning.read","inventory.read","inventory.movements.create"));
        when(authorization.canReadGuideTab(eq(user),anyString(),anyString())).thenAnswer(i->Set.of("inventory","crm","pos").contains(i.getArgument(1)));
        when(capabilities.allowedTools(token)).thenReturn(List.of("list_inventory_balances","preview_transfer_inventory_stock","transfer_inventory_stock","get_sales_today","get_hr_kpis","get_cash_status"));
        var service=new AiLearningService(new ObjectMapper(),authorization,capabilities,mock(com.indice.erp.hr.HrAccessService.class));
        for(var locale:List.of("es-MX","en-CA")) {
            var guide=service.guide(token,new AiLearningContracts.Request(null,null,locale));assertThat(guide.modules()).hasSize(3);
            var inventory=guide.modules().stream().filter(m->m.module().equals("inventory")).findFirst().orElseThrow();assertThat(inventory.tabs()).hasSize(6);
            assertThat(inventory.tabs().stream().filter(t->t.tab().equals("inventory")).findFirst().orElseThrow().availableTools()).containsExactly("list_inventory_balances","preview_transfer_inventory_stock","transfer_inventory_stock");
            var crm=guide.modules().stream().filter(m->m.module().equals("crm")).findFirst().orElseThrow();assertThat(crm.tabs()).hasSize(8);assertThat(crm.tabs()).extracting(AiLearningContracts.TabGuide::tab).doesNotContain("products","providers","inventory","after-sales");
            var pos=guide.modules().stream().filter(m->m.module().equals("pos")).findFirst().orElseThrow();assertThat(pos.pageId()).isEqualTo("point-of-sale");assertThat(pos.tabs()).hasSize(6);
            assertThat(guide.modules().stream().flatMap(m->m.tabs().stream()).flatMap(t->t.availableTools().stream())).doesNotContain("get_hr_kpis");
        }
    }
    @Test void guideFiltersTabsAndToolsUsingCurrentAuthorityAndSupportsBothLocales() throws Exception {
        var authorization=mock(AiToolAuthorizationService.class);var capabilities=mock(AiToolCapabilityService.class);
        var user=new AuthSessionUser(1L,2L,3L,"Synthetic","user");
        var token=new AiAccessTokenRepository.StoredToken(4,user,Set.of("learning.read","tasks.read"));
        when(authorization.canReadGuideTab(eq(user),eq("processes"),eq("calendar"))).thenReturn(true);
        when(capabilities.allowedTools(token)).thenReturn(List.of("list_tasks","get_task_detail"));
        var service=new AiLearningService(new ObjectMapper(),authorization,capabilities,mock(com.indice.erp.hr.HrAccessService.class));
        for(var locale:List.of("es-MX","en-CA")) {
            var guide=service.guide(token,new AiLearningContracts.Request(null,null,locale));
            assertThat(guide.modules()).hasSize(1);
            assertThat(guide.modules().getFirst().tabs()).hasSize(1);
            assertThat(guide.modules().getFirst().tabs().getFirst().availableTools()).containsExactly("list_tasks","get_task_detail");
            assertThat(guide.modules().getFirst().pageId()).isEqualTo("processes-tasks");
        }
        assertThatThrownBy(()->service.guide(token,new AiLearningContracts.Request("human_resources","payroll","es-MX"))).isInstanceOf(java.util.NoSuchElementException.class);
        when(authorization.canReadGuideTab(user,"processes","calendar")).thenReturn(false);
        assertThatThrownBy(()->service.guide(token,null)).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->service.guide(token,new AiLearningContracts.Request(null,"calendar","es-MX"))).isInstanceOf(IllegalArgumentException.class);
    }
}
