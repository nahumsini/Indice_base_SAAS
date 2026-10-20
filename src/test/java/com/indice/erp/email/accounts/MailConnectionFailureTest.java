package com.indice.erp.email.accounts;

import jakarta.mail.*;
import java.net.*;
import javax.net.ssl.SSLHandshakeException;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class MailConnectionFailureTest {
    @Test void classifiesTransportFailuresWithoutExposingProviderTextOrCause() {
        var cases=java.util.Map.of(
            new AuthenticationFailedException("sensitive-provider-diagnostic"),MailConnectionFailure.Code.AUTHENTICATION_FAILED,
            new UnknownHostException("private-host-diagnostic"),MailConnectionFailure.Code.DNS_FAILED,
            new SocketTimeoutException("private-timeout"),MailConnectionFailure.Code.CONNECTION_TIMEOUT,
            new ConnectException("private-connection"),MailConnectionFailure.Code.CONNECTION_FAILED,
            new SSLHandshakeException("private-certificate"),MailConnectionFailure.Code.TLS_FAILED,
            new PublicMailSocketFactory.DestinationRejected(),MailConnectionFailure.Code.DESTINATION_REJECTED);
        cases.forEach((exception,code)->{
            var failure=MailConnectionFailure.classify(new MessagingException("sensitive-wrapper",exception));
            assertThat(failure.code()).isEqualTo(code);
            assertThat(failure.getMessage()).isEqualTo(code.name());assertThat(failure.getCause()).isNull();
            assertThat(failure.toString()).doesNotContain("sensitive","private-");
        });
    }
    @Test void unknownDiagnosticsStayGenericAndCauseCyclesAreBounded() {
        var first=new Exception("smtp-password=synthetic-secret");var second=new Exception("second",first);first.initCause(second);
        var failure=MailConnectionFailure.classify(first);
        assertThat(failure.code()).isEqualTo(MailConnectionFailure.Code.UNKNOWN);
        assertThat(failure.toString()).doesNotContain("synthetic-secret");
    }
    @Test void realProbeRejectsPrivateDestinationsBeforeAuthentication() {
        assertThatThrownBy(()->new JakartaMailConnectionProbe().verify("SMTP","127.0.0.1",465,"TLS","synthetic","secret"))
            .isInstanceOf(MailConnectionFailure.class).hasMessage("DESTINATION_REJECTED");
    }
}
