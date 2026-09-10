package com.indice.erp.finance.budgetlines;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.indice.erp.entitlement.*;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import com.indice.erp.finance.FinanceApiException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class BudgetExpenseSchedulerTest {
    @Test void oneCompanyFailureDoesNotStopAnotherAndWorkerUsesTenantScopedSystemContext() {
        var repository = mock(BudgetExpenseOccurrenceRepository.class);
        var service = mock(BudgetExpenseSynchronizationService.class);
        when(repository.companiesAfter(0,100)).thenReturn(List.of(10L,20L));
        when(service.synchronize(argThat(c -> c.companyId()==10L))).thenThrow(new IllegalStateException("test"));
        new BudgetExpenseScheduler(repository,service).synchronizeDueBudgets();
        var contexts=ArgumentCaptor.forClass(FinanceContext.class);
        verify(service,times(2)).synchronize(contexts.capture());
        assertThat(contexts.getAllValues()).extracting(FinanceContext::companyId).containsExactly(10L,20L);
        assertThat(contexts.getAllValues()).allSatisfy(c -> {assertThat(c.userId()).isNull();assertThat(c.role()).isEqualTo("SYSTEM");});
    }

    @Test void disabledFlagAndDeniedEntitlementPreventAllMaterialization() {
        var repository=mock(BudgetExpenseOccurrenceRepository.class);
        var materializer=mock(BudgetExpenseMaterializer.class);
        var entitlement=mock(CompanyEntitlementService.class);
        var context=new FinanceContext(1L,2L,"Test","admin",true,FinanceScope.corporateOffice());
        var zones=mock(FinanceBusinessTimeZoneResolver.class);
        assertThat(new BudgetExpenseSynchronizationService(repository,materializer,entitlement,zones,false).synchronize(context).enabled()).isFalse();
        verifyNoInteractions(repository,materializer,entitlement);
        when(entitlement.resolve(2L,"expenses")).thenReturn(new CompanyEntitlementResolution(2L,"expenses",false,EntitlementPolicyMode.ENFORCE,List.of()));
        assertThatThrownBy(() -> new BudgetExpenseSynchronizationService(repository,materializer,entitlement,zones,true).synchronize(context)).hasMessageContaining("unavailable");
        verifyNoInteractions(repository,materializer);
    }

    @Test void aFailedReviewWriteDoesNotStopOtherLinesAndIsReportedForRetry() {
        var repository=mock(BudgetExpenseOccurrenceRepository.class);
        var materializer=mock(BudgetExpenseMaterializer.class);
        var entitlement=mock(CompanyEntitlementService.class);
        var zones=mock(FinanceBusinessTimeZoneResolver.class);
        var context=new FinanceContext(1L,2L,"Test","admin",true,FinanceScope.corporateOffice());
        when(zones.resolve(2L)).thenReturn(ZoneId.of("UTC"));
        when(entitlement.resolve(2L,"expenses")).thenReturn(new CompanyEntitlementResolution(2L,"expenses",true,EntitlementPolicyMode.ENFORCE,List.of()));
        when(repository.candidates(eq(context),eq(0L),eq(100),any(LocalDate.class))).thenReturn(List.of(10L,20L));
        when(materializer.materialize(context,10L)).thenThrow(FinanceApiException.badRequest("Invalid reference"));
        doThrow(new IllegalStateException("Test write failure")).when(materializer).recordInvalidReference(context,10L);
        when(materializer.materialize(context,20L)).thenReturn(true);
        var result=new BudgetExpenseSynchronizationService(repository,materializer,entitlement,zones,true).synchronize(context);
        assertThat(result.generated()).isEqualTo(1);
        assertThat(result.reviews()).containsExactly(new BudgetExpenseSyncResult.Review(10L,"BUD-10","RETRY_REQUIRED"));
    }
}
