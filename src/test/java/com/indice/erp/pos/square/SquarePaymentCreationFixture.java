package com.indice.erp.pos.square;

import static org.mockito.Mockito.mock;
import com.indice.erp.pos.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;

final class SquarePaymentCreationFixture {
    final SquarePaymentIntentRepository intents=mock(SquarePaymentIntentRepository.class);
    final SquareTerminalGateway gateway=mock(SquareTerminalGateway.class);
    final SquareConnectionTokenService tokens=mock(SquareConnectionTokenService.class);
    final SquarePaymentReservation reservations=mock(SquarePaymentReservation.class);
    final SquareDispatchAuthorization dispatch=mock(SquareDispatchAuthorization.class);
    final SquareLiveActivationPolicy activation=mock(SquareLiveActivationPolicy.class);
    final SquarePaymentRecovery recovery=mock(SquarePaymentRecovery.class);
    final SquarePaymentResponses responses=mock(SquarePaymentResponses.class);
    final SquareSubmissionClaim claims=mock(SquareSubmissionClaim.class);
    final SquarePaymentDependencies dependencies;
    final SquarePaymentCreation creation;
    SquarePaymentCreationFixture() {
        dependencies=new SquarePaymentDependencies(new SquareTerminalProperties(),mock(SquareTerminalSecretProvider.class),tokens,gateway,
            mock(SquareTerminalRepository.class),intents,new SquareCheckoutStatusMapper(),mock(SquarePaymentFinalizer.class),
            mock(SquarePaymentRequestPreparer.class),mock(SquareAuditService.class),Clock.systemUTC(),
            mock(SquareVerifiedPaymentStatus.class),mock(SquarePaymentMerchantGuard.class));
        var submission=new SquarePaymentSubmission(dependencies,responses,claims,dispatch,activation,new SquarePaymentSubmissionFailure(dependencies));
        creation=new SquarePaymentCreation(dependencies,reservations,responses,recovery,activation,submission);
    }
    PosContext context() { return new PosContext(11L,7L,"Admin","admin",true,PosScope.corporateOffice()); }
    SquareTerminalDtos.CreatePaymentRequest request() { return new SquareTerminalDtos.CreatePaymentRequest(
        "key",31L,null,null,null,"CAD",List.of(),null); }
    SquareTerminalDtos.PaymentIntentResponse response(String status) { return new SquareTerminalDtos.PaymentIntentResponse(
        91,status,BigDecimal.ONE,"CAD",null,null,null,null,null); }
    SquareSubmissionBody submissionBody() { return new SquareSubmissionBody(dependencies,
        new SquareCheckoutPayloads(new com.fasterxml.jackson.databind.ObjectMapper())); }
    SquareRecords.PaymentIntent intent() { return intent(Instant.now()); }
    SquareRecords.PaymentIntent intent(Instant created) { return new SquareRecords.PaymentIntent(91,7,31,41,51,"loc","device","key",null,null,
        SquareTerminalPaymentStatus.WAITING,BigDecimal.ONE,"CAD","hash","{}",null,null,11,"admin","CORPORATE_OFFICE",null,null,
        created,Instant.now(),Instant.now()); }
    SquareRecords.PaymentIntent storedIntent(Instant created,String request) { return new SquareRecords.PaymentIntent(91,7,31,41,51,"loc",
        "device","key",null,null,SquareTerminalPaymentStatus.WAITING,BigDecimal.ONE,"CAD","hash","{}",request,null,null,11,
        "admin","CORPORATE_OFFICE",null,null,created,Instant.now(),Instant.now()); }
}
