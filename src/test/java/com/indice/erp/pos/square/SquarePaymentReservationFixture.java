package com.indice.erp.pos.square;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.indice.erp.pos.*;
import com.indice.erp.pos.terminal.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;

final class SquarePaymentReservationFixture {
    final PosContext context=new PosContext(11L,7L,"Admin","admin",true,PosScope.corporateOffice());
    final SquarePaymentRequestPreparer preparer=mock(SquarePaymentRequestPreparer.class);
    final SquarePaymentIntentRepository intents=mock(SquarePaymentIntentRepository.class);
    final SquareTerminalRepository terminals=mock(SquareTerminalRepository.class);
    final TerminalPaymentGuard guard=mock(TerminalPaymentGuard.class);
    final TerminalBindingRepository bindings=mock(TerminalBindingRepository.class);
    final SquarePaymentReservation reservation;
    final SquareRecords.Terminal terminal=new SquareRecords.Terminal(51,7,61,"loc","code","device","Front","PAIRED",31L);
    SquarePaymentReservationFixture() {
        var properties=new SquareTerminalProperties(); properties.setPaymentTimeoutSeconds(300);
        var d=new SquarePaymentDependencies(properties,mock(SquareTerminalSecretProvider.class),mock(SquareConnectionTokenService.class),
            mock(SquareTerminalGateway.class),terminals,intents,new SquareCheckoutStatusMapper(),mock(SquarePaymentFinalizer.class),
            preparer,mock(SquareAuditService.class),Clock.fixed(Instant.parse("2026-09-22T12:00:00Z"),ZoneOffset.UTC),
            mock(SquareVerifiedPaymentStatus.class),mock(SquarePaymentMerchantGuard.class));
        when(guard.withRegisterLock(eq(context),eq(31L),any())).thenAnswer(call -> ((java.util.function.Supplier<?>)call.getArgument(2)).get());
        when(bindings.find(context,31)).thenReturn(new TerminalBinding("SQUARE",51L,"Front","PAIRED"));
        when(terminals.findAssigned(context,31)).thenReturn(java.util.Optional.of(terminal));
        when(preparer.prepare(eq(context),any())).thenReturn(new SquarePaymentRequestPreparer.Draft(
            SquarePaymentAccessFixtures.shift(),"{}","hash",BigDecimal.ONE,"CAD","key"));
        reservation=new SquarePaymentReservation(d,guard,bindings);
    }
    SquareTerminalDtos.CreatePaymentRequest request() { return new SquareTerminalDtos.CreatePaymentRequest(
        "key",31L,null,null,null,"CAD",List.of(),null); }
    SquareRecords.PaymentIntent intent(String hash) { return new SquareRecords.PaymentIntent(91,7,31,41,51,"loc","device","key",null,
        null,SquareTerminalPaymentStatus.WAITING,BigDecimal.ONE,"CAD",hash,"{}",null,null,11,"admin","CORPORATE_OFFICE",null,null,
        Instant.now(),Instant.now(),Instant.now()); }
}
