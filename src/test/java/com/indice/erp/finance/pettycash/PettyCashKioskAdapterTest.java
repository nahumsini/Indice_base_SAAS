package com.indice.erp.finance.pettycash;

import com.indice.erp.finance.kiosk.FinanceKioskModuleAuditService;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskActionRequest;
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

    private PettyCashKioskAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new PettyCashKioskAdapter(kioskService, moduleAudit);
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

    private KioskResolvedDefinition definition() {
        return new KioskResolvedDefinition(
            17L, 7L, PettyCashKioskCapabilities.OWNER_MODULE, "receipt_capture", 31L,
            "PETTY_CASH", "Petty Cash", KioskDefinitionStatus.ACTIVE, 2L, 3L, null,
            KioskAccessLevel.CONTROLLED, null, "tokenhint", true, 1, 1);
    }
}
