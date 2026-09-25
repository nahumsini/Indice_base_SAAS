package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.terminal.TerminalBinding;
import com.indice.erp.pos.terminal.TerminalBindingRepository;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import java.util.function.Supplier;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;

final class SquarePaymentTestFactory {
    private SquarePaymentTestFactory() {}
    static SquareVerifiedPaymentStatus evidence() {
        var evidence = mock(SquareVerifiedPaymentStatus.class);
        lenient().when(evidence.verify(org.mockito.ArgumentMatchers.nullable(com.indice.erp.pos.PosContext.class), any(), any()))
            .thenAnswer(call -> new SquareCheckoutStatusMapper().map(call.getArgument(2)));
        return evidence;
    }
    static SquareTerminalPaymentService create(SquarePaymentDependencies dependencies) {
        var guard = mock(TerminalPaymentGuard.class);
        lenient().when(guard.withRegisterLock(any(), anyLong(), any())).thenAnswer(call -> {
            Supplier<?> reservation = call.getArgument(2);
            return reservation.get();
        });
        var bindings = mock(TerminalBindingRepository.class);
        lenient().when(bindings.find(any(), anyLong())).thenReturn(new TerminalBinding("SQUARE", 51L, "Front", "PAIRED"));
        var responses = new SquarePaymentResponses(dependencies, SquarePaymentAccessFixtures.access());
        var identity = new SquareCheckoutIdentityPolicy();
        var recovery = new SquarePaymentRecovery(dependencies, responses,
            new SquareCheckoutSearchRecovery(dependencies, identity, new ObjectMapper()));
        var reservation = new SquarePaymentReservation(dependencies, guard, bindings);
        var activation = mock(SquareLiveActivationPolicy.class);
        var claims=mock(SquareSubmissionClaim.class);
        lenient().when(claims.acquire(any(),any())).thenReturn(new SquareSubmissionClaim.Claim(null,"{}"));
        var submission = new SquarePaymentSubmission(dependencies,responses,claims,
            mock(SquareDispatchAuthorization.class),activation,new SquarePaymentSubmissionFailure(dependencies));
        return new SquareTerminalPaymentService(new SquarePaymentCreation(dependencies,reservation,responses,recovery,
            activation,submission),
            responses, recovery, new SquarePaymentCancellation(dependencies, responses),
            new SquarePaymentReconciliation(dependencies, recovery));
    }
}
