package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class SquareSetupService {
    private final SquareSetupDependencies dependencies;
    private final SquareOAuthSetup oauth;
    private final SquareLocationSetup locations;
    private final SquareTerminalPairing pairing;
    private final SquareRegisterTerminalBinding bindings;
    private final SquareTerminalLifecycle lifecycle;
    public SquareSetupService(SquareSetupDependencies dependencies, SquareOAuthSetup oauth, SquareLocationSetup locations,
            SquareTerminalPairing pairing, SquareRegisterTerminalBinding bindings, SquareTerminalLifecycle lifecycle) {
        this.dependencies = dependencies;
        this.oauth = oauth;
        this.locations = locations;
        this.pairing = pairing;
        this.bindings = bindings;
        this.lifecycle = lifecycle;
    }
    public SquareTerminalDtos.OAuthStartResponse startOAuth(PosContext context) {
        return oauth.start(context);
    }
    public SquareTerminalDtos.OAuthCallbackResponse completeOAuth(String code, String state) {
        return oauth.complete(code, state);
    }
    public List<SquareTerminalDtos.SquareLocation> squareLocations(PosContext context) {
        return locations.list(context);
    }
    public SquareRecords.Location linkLocation(PosContext context, String id) {
        return locations.link(context, id);
    }
    public SquareTerminalDtos.PairTerminalResponse pairTerminal(PosContext context, SquareTerminalDtos.PairTerminalRequest request) {
        return pairing.pair(context, request);
    }
    public SquareTerminalDtos.TerminalResponse assignTerminal(PosContext context, long register, long terminal) {
        return bindings.assign(context, register, terminal);
    }
    public void unassignTerminal(PosContext context, long register) { bindings.unassign(context, register); }
    public SquareTerminalDtos.TerminalResponse disableTerminal(PosContext context, long terminal) { return lifecycle.disable(context, terminal); }
    public SquareTerminalDtos.PairTerminalResponse refreshPairingCode(PosContext context, long terminal) { return pairing.refresh(context, terminal); }
    public List<SquareTerminalDtos.TerminalResponse> listTerminals(PosContext context) {
        return dependencies.terminals().list(context).stream().map(SquareRegisterTerminalBinding::response).toList();
    }
}
