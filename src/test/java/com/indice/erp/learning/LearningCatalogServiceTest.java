package com.indice.erp.learning;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrAccessService;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;

class LearningCatalogServiceTest {
    @Test void filtersEveryChapterByCurrentPermissionInBothLocales() throws Exception {
        var authorization=mock(AiToolAuthorizationService.class);
        when(authorization.withCapabilityEvaluation(any())).thenAnswer(i->((Supplier<?>)i.getArgument(0)).get());
        var actor=new AuthSessionUser(1L,2L,3L,"Synthetic","user");
        when(authorization.canReadGuideTab(eq(actor),eq("receivables"),anyString())).thenReturn(true);
        var service=new LearningCatalogService(new ObjectMapper(),authorization,mock(HrAccessService.class));
        assertThat(service.available(actor,"es-MX")).hasSize(5);
        assertThat(service.available(actor,"en-CA")).hasSize(5);
        assertThat(service.available(actor,"en-CA").getFirst().tab().steps().getFirst().description()).contains("customer");
        assertThatThrownBy(()->service.require(actor,"human_resources.payroll",2)).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->service.require(actor,"receivables.payments",1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->service.available(actor,null)).isInstanceOf(IllegalArgumentException.class);
        when(authorization.canReadGuideTab(eq(actor),anyString(),anyString())).thenReturn(false);
        assertThat(service.available(actor,"es-MX")).isEmpty();
    }
}
