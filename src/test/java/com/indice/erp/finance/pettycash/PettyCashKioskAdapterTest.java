package com.indice.erp.finance.pettycash;

import com.indice.erp.finance.kiosk.FinanceKioskModuleAuditService;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskSessionPrincipal;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class PettyCashKioskAdapterTest {

    @Mock
    private PettyCashPublicKioskService kioskService;

    @Mock
    private FinanceKioskModuleAuditService moduleAudit;

    @Mock
    private PettyCashEmployeeKioskService employeeCenter;

    private PettyCashKioskAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new PettyCashKioskAdapter(kioskService, moduleAudit, employeeCenter);
    }

    @Test
    void requiresAControlledSessionForEveryCapabilityAfterIdentityVerification() {
        var request = KioskActionRequest.of(PettyCashKioskCapabilities.MOVEMENTS_READ, Map.of());

        assertThatThrownBy(() -> adapter.authorize(publicContext(), request).requireAllowed())
            .isInstanceOf(SecurityException.class)
            .hasMessage("Kiosk authentication is required.");
        assertThat(adapter.authorize(employeeContext(), request).allowed()).isTrue();
    }

    @Test
    void delegatesReceiptCaptureAndWritesModuleAuditWithTheCreatedRecord() {
        var context = employeeContext();
        var request = KioskActionRequest.of(
            PettyCashKioskCapabilities.RECEIPT_CREATE,
            Map.of("amount", "125.00", "concept", "Taxi"));
        var response = Map.<String, Object>of(
            "settlement_line", Map.of("id", 301L),
            "status", "CAPTURED");
        given(kioskService.publicCreateReceipt("fund-token", request.payload())).willReturn(response);

        assertThat(adapter.execute(context, request)).isSameAs(response);

        then(moduleAudit).should().success(
            context, "PETTY_CASH_RECEIPT_CREATED", "SETTLEMENT_LINE", 301L,
            Map.of("policy", "DIRECT"));
    }

    @Test
    void rejectsCrossModuleContextsBeforeCallingPettyCash() {
        var context = KioskExecutionContext.publicLink("EXPENSES", "fund-token");
        var request = KioskActionRequest.of(PettyCashKioskCapabilities.IDENTITY_VERIFY, Map.of("pin", "123456"));

        assertThatThrownBy(() -> adapter.execute(context, request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("does not belong to Petty Cash");
    }

    @Test
    void exposesEmployeeWorkspaceOnlyThroughTheCashScope() {
        given(employeeCenter.supports(definition())).willReturn(true);
        given(employeeCenter.bootstrap(definition(), 501L)).willReturn(Map.of(
            "authentication", "ENGINE_PIN_SESSION",
            "fund", Map.of("id", 31L)));

        assertThat(adapter.supportsEmployeeCenter(definition())).isTrue();
        assertThat(adapter.employeeCenterTabPermissionKeys(definition()))
            .containsExactly("petty_cash.cash");
        assertThat(adapter.employeeCapabilityTabPermissionKeys(
            definition(), capability(PettyCashKioskCapabilities.IDENTITY_VERIFY)))
            .isEmpty();
        assertThat(adapter.employeeBootstrap(engineEmployeeContext()))
            .containsEntry("authentication", "ENGINE_PIN_SESSION");
    }

    @Test
    void delegatesTheExactFundAssignmentScopeDecisionToPettyCash() {
        given(employeeCenter.accessAllows(definition(), 501L, false)).willReturn(true);

        assertThat(adapter.employeeCenterAccessAllows(
            definition(), 501L, 81L, false)).isTrue();

        then(employeeCenter).should().accessAllows(definition(), 501L, false);
    }

    @Test
    void delegatesMobileEmployeeReceiptAndKeepsModuleAudit() {
        var context = engineEmployeeContext();
        var request = KioskActionRequest.of(
            PettyCashKioskCapabilities.RECEIPT_CREATE,
            Map.of("amount", "125.00", "concept", "Taxi"));
        var response = Map.<String, Object>of(
            "settlement_line", Map.of("id", 302L),
            "status", "CAPTURED");
        given(employeeCenter.execute(definition(), 501L, request)).willReturn(response);

        assertThat(adapter.authorize(context, request).allowed()).isTrue();
        assertThat(adapter.executeEmployee(context, request)).isSameAs(response);
        then(employeeCenter).should().execute(definition(), 501L, request);
        then(moduleAudit).should().success(
            context, "PETTY_CASH_RECEIPT_CREATED", "SETTLEMENT_LINE", 302L,
            Map.of("policy", "DIRECT"));
    }

    private KioskExecutionContext publicContext() {
        return KioskExecutionContext.publicLink(PettyCashKioskCapabilities.OWNER_MODULE, "fund-token")
            .resolved(definition(), null);
    }

    private KioskExecutionContext employeeContext() {
        var session = new KioskSessionPrincipal(
            "session-employee", 17L, 7L, "EMPLOYEE", 81L,
            Set.of(PettyCashKioskCapabilities.RECEIPT_CREATE + "@1"),
            Instant.now().plusSeconds(600));
        return KioskExecutionContext.publicLink(PettyCashKioskCapabilities.OWNER_MODULE, "fund-token")
            .resolved(definition(), session);
    }

    private KioskExecutionContext engineEmployeeContext() {
        var session = new KioskSessionPrincipal(
            "session-mobile-petty", 17L, 7L, "USER", 501L,
            Set.of(PettyCashKioskCapabilities.RECEIPT_CREATE + "@v1"),
            Instant.now().plusSeconds(600));
        return new KioskExecutionContext(
            PettyCashKioskCapabilities.OWNER_MODULE,
            "MOBILE_MULTI_KIOSK",
            "definition:17",
            "mobile",
            "browser-ref").resolved(definition(), session);
    }

    private KioskCapabilityDescriptor capability(String key) {
        return PettyCashKioskCapabilities.descriptors().stream()
            .filter(candidate -> key.equals(candidate.key()))
            .findFirst()
            .orElseThrow();
    }

    private KioskResolvedDefinition definition() {
        return new KioskResolvedDefinition(
            17L, 7L, PettyCashKioskCapabilities.OWNER_MODULE, "receipt_capture", 31L,
            "PETTY_CASH", "Petty Cash", KioskDefinitionStatus.ACTIVE, 2L, 3L, null,
            KioskAccessLevel.CONTROLLED, null, "tokenhint", true, 1, 1);
    }
}
