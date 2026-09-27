package com.indice.erp.pos.square;

import com.indice.erp.pos.*;
import com.indice.erp.pos.returns.PosReturnService.SquareCommand;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SquareRefundService {
    private final SquareRefundPolicy policy; private final SquareRefundReservation reservation;
    private final SquarePaymentIntentRepository intents; private final SquarePaymentAccess access;
    private final SquareRefundLifecycle lifecycle; private final SquareRefundQueries refunds;
    private final SquareRefundRecovery recovery;
    private final SquareConnectionTokenService tokens;
    private final SquareTerminalGateway gateway;
    @Autowired
    public SquareRefundService(SquareRefundPolicy policy, SquareRefundReservation reservation,
            SquarePaymentIntentRepository intents, SquarePaymentAccess access, SquareRefundLifecycle lifecycle,
            SquareRefundQueries refunds, SquareRefundRecovery recovery,
            SquareConnectionTokenService tokens, SquareTerminalGateway gateway) {
        this.policy=policy; this.reservation=reservation; this.intents=intents; this.access=access;
        this.lifecycle=lifecycle; this.refunds=refunds; this.recovery=recovery;
        this.tokens=tokens; this.gateway=gateway;
    }
    public SquareRefundService(SquareRefundPolicy policy, SquareRefundReservation reservation,
            SquarePaymentIntentRepository intents, SquarePaymentAccess access, SquareRefundLifecycle lifecycle,
            SquareRefundQueries refunds, SquareRefundRecovery recovery) {
        this(policy, reservation, intents, access, lifecycle, refunds, recovery, null, null);
    }
    public SquareRefundService(SquareConnectionTokenService tokens, SquareTerminalGateway gateway) {
        this(null, null, null, null, null, null, null, tokens, gateway);
    }
    public SquareRefundRecord refund(PosContext context, long intentId, SquareRefundRequest request) {
        policy.requireEnabled();
        if (request == null) throw PosApiException.badRequest("Square refund request is required.");
        var reserved = reservation.reserve(context, intentId, request);
        var intent = intents.findById(context, intentId)
            .orElseThrow(() -> PosApiException.notFound("Square payment intent was not found."));
        access.require(context, intent);
        return lifecycle.progress(intent, reserved, SquareRefundActor.user(context.userId()));
    }
    public SquareRefundRecord refresh(PosContext context, long intentId) {
        policy.requireEnabled();
        var intent=intents.findById(context,intentId)
            .orElseThrow(()->PosApiException.notFound("Square payment intent was not found."));
        access.require(context,intent);
        var refund=refunds.latest(context.companyId(),intentId)
            .orElseThrow(()->PosApiException.conflict("No Square refund requires refresh."));
        if (!java.util.Set.of("PENDING","UNCERTAIN").contains(refund.status())) return refund;
        return recovery.check(intent,refund,SquareRefundActor.user(context.userId()),null,false);
    }

    /** Compatibility bridge for the original-tender return aggregate. */
    public SquareTerminalGateway.Refund refundOrRecover(PosContext context, SquareCommand command) {
        if (command == null || command.paymentId() == null || command.requestKey() == null)
            throw PosApiException.conflict("Falta la identidad del pago original.");
        try {
            var result = tokens.withToken(context, token -> command.refundId() == null
                ? gateway.refundPayment(token, command.requestKey(), command.paymentId(),
                    command.amount(), command.currency())
                : gateway.getRefund(token, command.refundId()));
            if (result == null || !command.paymentId().equals(result.paymentId()) || result.amount() == null
                    || command.amount().compareTo(result.amount()) != 0
                    || !command.currency().equals(result.currency()))
                throw PosApiException.conflict(
                    "La respuesta de Square no coincide con el pago original. La devolución sigue pendiente.");
            return result;
        } catch (SquareGatewayException exception) {
            throw PosApiException.serviceUnavailable(
                "No se pudo confirmar el reembolso con Square. Usa Actualizar; se conserva la misma solicitud para evitar duplicados.");
        }
    }
}
