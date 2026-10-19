package com.indice.erp.email.accounts;

import jakarta.mail.AuthenticationFailedException;
import jakarta.mail.MessagingException;
import java.net.*;
import java.security.cert.CertificateException;
import java.util.*;
import javax.net.ssl.SSLException;

/** Only an allowlisted category leaves the transport; provider text and causes stay private. */
final class MailConnectionFailure extends RuntimeException {
    enum Code { AUTHENTICATION_FAILED, DNS_FAILED, CONNECTION_TIMEOUT, CONNECTION_FAILED, TLS_FAILED, DESTINATION_REJECTED, UNKNOWN }
    private final Code code;
    MailConnectionFailure(Code code) { super(code.name()); this.code=code; }
    Code code() { return code; }

    static MailConnectionFailure classify(Exception failure) {
        var seen=Collections.newSetFromMap(new IdentityHashMap<Throwable,Boolean>());
        var pending=new ArrayDeque<Throwable>();pending.add(failure);
        boolean authentication=false;
        while(!pending.isEmpty()&&seen.size()<32) {
            var next=pending.removeFirst();if(!seen.add(next))continue;
            if(next instanceof PublicMailSocketFactory.DestinationRejected)return new MailConnectionFailure(Code.DESTINATION_REJECTED);
            if(next instanceof UnknownHostException)return new MailConnectionFailure(Code.DNS_FAILED);
            if(next instanceof SSLException||next instanceof CertificateException)return new MailConnectionFailure(Code.TLS_FAILED);
            if(next instanceof SocketTimeoutException)return new MailConnectionFailure(Code.CONNECTION_TIMEOUT);
            if(next instanceof ConnectException||next instanceof NoRouteToHostException)return new MailConnectionFailure(Code.CONNECTION_FAILED);
            if(next instanceof AuthenticationFailedException)authentication=true;
            if(next.getCause()!=null)pending.add(next.getCause());
            if(next instanceof MessagingException mail&&mail.getNextException()!=null)pending.add(mail.getNextException());
        }
        return new MailConnectionFailure(authentication?Code.AUTHENTICATION_FAILED:Code.UNKNOWN);
    }
}
