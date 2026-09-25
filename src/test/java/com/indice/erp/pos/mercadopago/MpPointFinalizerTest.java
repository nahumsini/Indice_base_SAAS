package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.checkout.VerifiedTerminalCheckout;
import com.indice.erp.pos.checkout.dto.PosCheckoutResponse;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpPointFinalizerTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final VerifiedTerminalCheckout checkout = mock(VerifiedTerminalCheckout.class);
    private final TerminalPaymentGuard guard = mock(TerminalPaymentGuard.class);
    private final MpPaymentFinalizer service = new MpPaymentFinalizer(new MpIntentStore(jdbc, new MpIntentMapper()),
        new MpIntentWriter(jdbc), checkout, guard, MpPaymentTestFixtures.JSON, new MpPaymentAudit(jdbc));
    private void locked(MpIntent intent) {
        when(jdbc.query(contains("FOR UPDATE"), any(MpIntentMapper.class), eq(42L), eq(17L))).thenReturn(List.of(intent));
    }
    @Test void reloadsApprovedIntentUnderRegisterAndIntentLocksBeforeSingleCheckout() {
        var approved = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "status", "APPROVED"); locked(approved);
        var receipt = MpPaymentTestFixtures.JSON.read("{\"ticket\":{\"id\":81}}", PosCheckoutResponse.class);
        when(checkout.checkout(any(), any(), eq("MERCADO_PAGO"), eq(17L), eq(11L))).thenReturn(receipt);
        when(jdbc.update(contains("SET pos_ticket_id=?"), any(Object[].class))).thenReturn(1);
        service.finalizeApproved(MpPaymentTestFixtures.intent());
        var ordered = inOrder(guard, jdbc, checkout);
        ordered.verify(guard).lockRegister(approved.context(), 9);
        ordered.verify(jdbc).query(contains("FOR UPDATE"), any(MpIntentMapper.class), eq(42L), eq(17L));
        ordered.verify(checkout).checkout(eq(approved.context()), any(), eq("MERCADO_PAGO"), eq(17L), eq(11L));
    }
    @Test void refundPendingOrAlreadyCompletedIntentCannotFinalizeAgain() {
        var approved = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "status", "APPROVED");
        locked(MpPaymentTestFixtures.change(approved, "refundPending", true)); service.finalizeApproved(approved);
        locked(MpPaymentTestFixtures.change(approved, "posTicketId", 81L)); service.finalizeApproved(approved);
        verifyNoInteractions(checkout);
        verify(jdbc, never()).update(contains("SET pos_ticket_id=?"), any(Object[].class));
    }
    @Test void checkoutFaultCannotLinkOrAuditAnUncommittedSale() {
        var approved = MpPaymentTestFixtures.change(MpPaymentTestFixtures.intent(), "status", "APPROVED"); locked(approved);
        when(checkout.checkout(any(), any(), anyString(), anyLong(), anyLong())).thenThrow(new IllegalStateException("inventory conflict"));
        assertThrows(IllegalStateException.class, () -> service.finalizeApproved(approved));
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }
}
