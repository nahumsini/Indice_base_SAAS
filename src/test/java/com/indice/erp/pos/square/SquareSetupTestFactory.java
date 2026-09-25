package com.indice.erp.pos.square;

import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import static org.mockito.Mockito.mock;

final class SquareSetupTestFactory {
    private SquareSetupTestFactory() {}
    static SquareSetupService create(SquareSetupDependencies dependencies) {
        var guard = mock(TerminalPaymentGuard.class);
        var mutations = mock(SquareTerminalMutationReader.class);
        return new SquareSetupService(dependencies, new SquareOAuthSetup(dependencies, mock(SquareConnectionPersistence.class)), new SquareLocationSetup(dependencies),
            new SquareTerminalPairing(dependencies), new SquareRegisterTerminalBinding(dependencies, guard, mutations),
            new SquareTerminalLifecycle(dependencies, guard, mutations));
    }
}
