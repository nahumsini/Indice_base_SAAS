package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.returns.PosReturnService.SquareCommand;
import org.springframework.stereotype.Service;

/** Network calls are deliberately outside the return aggregate's database transactions. */
@Service
public class SquareRefundService {
    private final SquareConnectionTokenService tokens;
    private final SquareTerminalGateway gateway;
    public SquareRefundService(SquareConnectionTokenService tokens, SquareTerminalGateway gateway) {
        this.tokens = tokens; this.gateway = gateway;
    }
    public SquareTerminalGateway.Refund refundOrRecover(PosContext context, SquareCommand command) {
        if (command == null || command.paymentId() == null || command.requestKey() == null)
            throw PosApiException.conflict("Falta la identidad del pago original.");
        try {
            var result = tokens.withToken(context, token -> command.refundId() == null
                    ? gateway.refundPayment(token, command.requestKey(), command.paymentId(), command.amount(), command.currency())
                    : gateway.getRefund(token, command.refundId()));
            if (result == null || !command.paymentId().equals(result.paymentId()) || result.amount() == null
                    || command.amount().compareTo(result.amount()) != 0 || !command.currency().equals(result.currency()))
                throw PosApiException.conflict("La respuesta de Square no coincide con el pago original. La devolución sigue pendiente.");
            return result;
        } catch (SquareGatewayException exception) {
            throw PosApiException.serviceUnavailable("No se pudo confirmar el reembolso con Square. Usa Actualizar; se conserva la misma solicitud para evitar duplicados.");
        }
    }
}
