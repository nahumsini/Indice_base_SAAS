package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import com.indice.erp.pos.checkout.dto.PosCheckoutResponse;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VerifiedTerminalCheckout {
    private final TerminalPaymentGuard guard;
    private final TerminalCheckoutEvidenceRepository evidence;
    private final TerminalCheckoutSnapshotPolicy snapshots;
    private final ShiftRepository shifts;
    private final CheckoutService checkout;
    public VerifiedTerminalCheckout(TerminalPaymentGuard guard, TerminalCheckoutEvidenceRepository evidence,
            TerminalCheckoutSnapshotPolicy snapshots, ShiftRepository shifts, CheckoutService checkout) {
        this.guard = guard;
        this.evidence = evidence;
        this.snapshots = snapshots;
        this.shifts = shifts;
        this.checkout = checkout;
    }
    @Transactional
    public PosCheckoutResponse checkout(PosContext context, PosCheckoutRequest request,
            String providerCode, long intentId, long originalShiftId) {
        guard.lockRegister(context, request.cashRegisterId());
        var approved = evidence.requireApproved(context, providerCode, intentId);
        if (!approved.matches(context) || approved.registerId() != request.cashRegisterId()
                || approved.shiftId() != originalShiftId) throw PosApiException.conflict("Terminal attempt scope changed.");
        snapshots.validate(approved, request);
        var shift = shifts.findOpenByUserAndRegister(context, request.cashRegisterId()).orElse(null);
        if (shift == null || shift.id() != originalShiftId) {
            throw PosApiException.conflict("Terminal sale can only finalize in its original open shift.");
        }
        guard.assertNoPendingExcept(context, request.cashRegisterId(), providerCode, intentId);
        return checkout.complete(context, request);
    }
}
