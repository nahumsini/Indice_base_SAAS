package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import org.springframework.stereotype.Service;

@Service
public class SquareTerminalPaymentService {
    private final SquarePaymentCreation creation;
    private final SquarePaymentResponses responses;
    private final SquarePaymentRecovery recovery;
    private final SquarePaymentCancellation cancellation;
    private final SquarePaymentReconciliation reconciliation;
    public SquareTerminalPaymentService(SquarePaymentCreation creation, SquarePaymentResponses responses,
            SquarePaymentRecovery recovery, SquarePaymentCancellation cancellation, SquarePaymentReconciliation reconciliation) {
        this.creation = creation;
        this.responses = responses;
        this.recovery = recovery;
        this.cancellation = cancellation;
        this.reconciliation = reconciliation;
    }
    public SquareTerminalDtos.PaymentIntentResponse create(PosContext context, SquareTerminalDtos.CreatePaymentRequest request) {
        return creation.create(context, request);
    }
    public SquareTerminalDtos.PaymentIntentResponse status(PosContext context, long id) {
        return responses.status(context, id);
    }
    public SquareTerminalDtos.PaymentIntentListResponse recoverable(PosContext context, Long register, Long shift, int limit) {
        return responses.recoverable(context, register, shift, limit);
    }
    public SquareTerminalDtos.PaymentIntentResponse recover(PosContext context, long id) {
        return recovery.recover(context, id);
    }
    public SquareTerminalDtos.PaymentIntentResponse cancel(PosContext context, long id) {
        return cancellation.cancel(context, id);
    }
    public int reconcilePendingBatch(int limit) {
        return reconciliation.reconcile(limit);
    }
}
