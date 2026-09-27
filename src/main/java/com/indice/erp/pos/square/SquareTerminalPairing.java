package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import org.springframework.stereotype.Component;

@Component
class SquareTerminalPairing {
    private final SquareSetupDependencies d;
    SquareTerminalPairing(SquareSetupDependencies dependencies) {
        this.d = dependencies;
    }
    SquareTerminalDtos.PairTerminalResponse pair(PosContext context, SquareTerminalDtos.PairTerminalRequest request) {
        var location = d.connections().findLocation(context, request.squareLocationId())
            .orElseThrow(() -> PosApiException.badRequest("Link the Square location before pairing a terminal."));
        var name = request.name() == null || request.name().isBlank() ? "Indice POS Terminal" : request.name().trim();
        var code = d.tokens().withToken(context, token -> d.gateway().createDeviceCode(
            token, SquareHashing.randomHex(16), location.squareLocationId(), name));
        var terminal = d.terminals().insert(context, location, code.id(), code.code(), name, code.pairBy());
        d.audit().recordTerminal(context, terminal.id(), "TERMINAL_PAIRING_CREATED", "WAITING", "Square Terminal pairing code created.");
        return new SquareTerminalDtos.PairTerminalResponse(terminal.id(), code.id(), code.code(), code.pairBy());
    }
    SquareTerminalDtos.PairTerminalResponse refresh(PosContext context, long terminalId) {
        var terminal = d.terminals().findById(context, terminalId)
            .orElseThrow(() -> PosApiException.notFound("Square terminal was not found."));
        if ("PAIRED".equalsIgnoreCase(terminal.status())) throw PosApiException.conflict("Square terminal is already paired.");
        var code = d.tokens().withToken(context, token -> d.gateway().createDeviceCode(
            token, SquareHashing.randomHex(16), terminal.squareLocationId(), terminal.name()));
        if (!d.pairingPersistence().replace(context, terminal.id(), code.id(), code.code(), code.pairBy()))
            throw PosApiException.conflict("Square terminal pairing could not be refreshed.");
        d.audit().recordTerminal(context, terminalId, "TERMINAL_PAIRING_REFRESHED", "WAITING", "Square Terminal pairing code refreshed.");
        return new SquareTerminalDtos.PairTerminalResponse(terminal.id(), code.id(), code.code(), code.pairBy());
    }
}
