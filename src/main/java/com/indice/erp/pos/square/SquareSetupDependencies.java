package com.indice.erp.pos.square;

import com.indice.erp.pos.cashregister.CashRegisterService;
import java.time.Clock;
import org.springframework.stereotype.Component;

@Component
record SquareSetupDependencies(SquareTerminalProperties properties, SquareTerminalSecretProvider secrets,
        SquareTokenCodec codec, SquareConnectionTokenService tokens, SquareTerminalGateway gateway,
        SquareConnectionRepository connections, SquareTerminalRepository terminals,
        SquareTerminalVerificationStore verification, SquareTerminalPairingPersistence pairingPersistence,
        CashRegisterService registers, SquareAuditService audit, Clock clock) {
}
