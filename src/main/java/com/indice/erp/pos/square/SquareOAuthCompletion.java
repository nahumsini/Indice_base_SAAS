package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SquareOAuthCompletion {
    private final SquareSetupDependencies dependencies;
    private final SquareOAuthStateStore states;
    private final SquareOAuthSetup oauth;

    public SquareTerminalDtos.OAuthCallbackResponse complete(PosContext context, SquareOAuthComplete request) {
        dependencies.secrets().requireEnabled();
        if (request.code() == null || request.code().isBlank() || request.code().length() > 191
            || request.state() == null || !request.state().matches("[a-f0-9]{64}")) {
            throw PosApiException.badRequest("Square OAuth response is invalid.");
        }
        var stored = states.consume(context, SquareHashing.sha256(request.state()),
            dependencies.properties().getEnvironment(), dependencies.clock().instant());
        return oauth.complete(request.code(), stored);
    }
}
