package com.indice.erp.kiosk.engine;

import com.indice.erp.finance.payablekiosk.PayableKioskLifecycleHandler;
import com.indice.erp.finance.payablekiosk.PayableKioskService;
import com.indice.erp.finance.pettycash.PettyCashKioskLifecycleHandler;
import com.indice.erp.finance.pettycash.PettyCashService;
import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskLifecycleHandler;
import com.indice.erp.pos.customerdisplay.CustomerDisplayService;
import com.indice.erp.pos.kiosk.PointOfSaleKioskLifecycleHandler;
import com.indice.erp.pos.selfservice.SelfServiceKioskService;
import com.indice.erp.processTasks.kiosk.ProcessTaskKioskLifecycleHandler;
import com.indice.erp.processTasks.kiosk.ProcessTaskKioskService;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogLifecycleHandler;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogService;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class KioskLifecycleHandlersTest {

    @Test
    void salesDelegatesPublicCatalogLifecycleToItsService() {
        var service = mock(SalesPublicCatalogService.class);
        var handler = new SalesPublicCatalogLifecycleHandler(service);
        var definition = definition("SALES", "public_catalog", 91L);

        handler.transition(transition(definition));

        assertThat(handler.supports(definition)).isTrue();
        assertThat(handler.supports(definition("SALES", "another_type", 91L))).isFalse();
        verify(service).transition(
            argThat(context -> context.companyId() == 20L
                && context.userId() == 7L
                && context.scopeType().name().equals("CORPORATE")),
            eq(91L),
            argThat(request -> request.status().equals("DISABLED")
                && request.reason().equals("maintenance")));
    }

    @Test
    void pointOfSaleDelegatesCustomerDisplayByDefinitionId() {
        var customerDisplays = mock(CustomerDisplayService.class);
        var selfService = mock(SelfServiceKioskService.class);
        var handler = new PointOfSaleKioskLifecycleHandler(customerDisplays, selfService);
        var definition = definition("POINT_OF_SALE", "customer_display", 91L);

        handler.transition(transition(definition));

        assertThat(handler.supports(definition)).isTrue();
        verify(customerDisplays).transition(
            argThat(context -> context.companyId() == 20L
                && context.userId() == 7L
                && context.scope().isCorporateOffice()),
            eq(10L), eq(KioskDefinitionStatus.DISABLED), eq("maintenance"));
        verifyNoInteractions(selfService);
    }

    @Test
    void pointOfSaleDelegatesSelfServiceByLegacyReference() {
        var customerDisplays = mock(CustomerDisplayService.class);
        var selfService = mock(SelfServiceKioskService.class);
        var handler = new PointOfSaleKioskLifecycleHandler(customerDisplays, selfService);
        var definition = definition("POINT_OF_SALE", "self_service", 91L);

        handler.transition(transition(definition));

        assertThat(handler.supports(definition)).isTrue();
        assertThat(handler.supports(definition("POINT_OF_SALE", "future_pos", 91L))).isFalse();
        verify(selfService).transition(
            argThat(context -> context.companyId() == 20L
                && context.userId() == 7L
                && context.scope().isCorporateOffice()),
            eq(91L),
            argThat(request -> request.status().equals("DISABLED")
                && request.reason().equals("maintenance")));
        verifyNoInteractions(customerDisplays);
    }

    @Test
    void financeHandlersDelegateToTheirFunctionalServices() {
        var pettyCash = mock(PettyCashService.class);
        var payables = mock(PayableKioskService.class);
        var pettyHandler = new PettyCashKioskLifecycleHandler(pettyCash);
        var payableHandler = new PayableKioskLifecycleHandler(payables);
        var pettyDefinition = definition("PETTY_CASH", "receipt_capture", 91L);
        var payableDefinition = definition("EXPENSES", "accounts_payable", 92L);

        pettyHandler.transition(transition(pettyDefinition));
        payableHandler.transition(transition(payableDefinition));

        assertThat(pettyHandler.supports(pettyDefinition)).isTrue();
        assertThat(payableHandler.supports(payableDefinition)).isTrue();
        assertThat(pettyHandler.supports(payableDefinition)).isFalse();
        verify(pettyCash).transitionKiosk(
            argThat(context -> context.companyId() == 20L
                && context.userId() == 7L
                && context.scope().isCorporateOffice()),
            eq(91L), eq(KioskDefinitionStatus.DISABLED), eq("maintenance"));
        verify(payables).transition(
            argThat(context -> context.companyId() == 20L
                && context.userId() == 7L
                && context.scope().isCorporateOffice()),
            eq(92L), eq(KioskDefinitionStatus.DISABLED), eq("maintenance"));
    }

    @Test
    void attendanceDelegatesEverySupportedAttendanceType() {
        var attendance = mock(HrAttendanceService.class);
        var handler = new AttendanceKioskLifecycleHandler(attendance);
        var definition = definition("HUMAN_RESOURCES", "contract_site", 91L);

        handler.transition(transition(definition));

        assertThat(handler.supports(definition)).isTrue();
        assertThat(handler.supports(definition("HUMAN_RESOURCES", "future_hr", 91L))).isFalse();
        verify(attendance).transitionKioskDevice(
            20L, 7L, 91L, KioskDefinitionStatus.DISABLED, "maintenance");
    }

    @Test
    void processTasksDelegatesAllOwnedKioskTypes() {
        var tasks = mock(ProcessTaskKioskService.class);
        var handler = new ProcessTaskKioskLifecycleHandler(tasks);
        var definition = definition("PROCESS_TASKS", "task_capture", 91L);

        handler.transition(transition(definition));

        assertThat(handler.supports(definition)).isTrue();
        assertThat(handler.supports(definition("SALES", "task_capture", 91L))).isFalse();
        verify(tasks).transitionKiosk(
            20L, 7L, 91L, KioskDefinitionStatus.DISABLED, "maintenance");
    }

    private KioskLifecycleTransition transition(KioskResolvedDefinition definition) {
        return new KioskLifecycleTransition(
            definition, 7L, KioskDefinitionStatus.DISABLED, "maintenance");
    }

    private KioskResolvedDefinition definition(String owner, String type, Long legacyId) {
        return new KioskResolvedDefinition(
            10L, 20L, owner, type, legacyId, "K-01", "Kiosk",
            KioskDefinitionStatus.ACTIVE, null, null, null,
            KioskAccessLevel.CONTROLLED, null, "hint", false, 1, 1);
    }
}
