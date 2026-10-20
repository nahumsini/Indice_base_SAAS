package com.indice.erp.email.mailbox;

import jakarta.mail.*;
import java.net.*;
import java.util.*;
import javax.net.ssl.SSLException;
import org.eclipse.angus.mail.smtp.*;

/** A definite non-delivery. Never carries provider text, addresses, credentials or causes. */
final class MailSendRejection extends RuntimeException {
    private final String code;
    MailSendRejection(String code) { super(code, null, false, false); this.code = code; }
    String code() { return code; }

    static MailSendRejection classify(Exception error, boolean submissionStarted) {
        var seen = Collections.newSetFromMap(new IdentityHashMap<Throwable, Boolean>());
        var pending = new ArrayDeque<Throwable>(); pending.add(error);
        String code = null;
        while (!pending.isEmpty() && seen.size() < 32) {
            var next = pending.removeFirst(); if (!seen.add(next)) continue;
            // Any partial delivery takes precedence over a rejection of another recipient.
            if (next instanceof SendFailedException send && send.getValidSentAddresses() != null && send.getValidSentAddresses().length > 0) return null;
            if (next instanceof SMTPSendFailedException smtp && rejected(smtp.getReturnCode())) code = response(smtp.getReturnCode(), smtp.getCommand());
            if (next instanceof SMTPSenderFailedException smtp && rejected(smtp.getReturnCode())) code = "email_send_sender_rejected";
            if (next instanceof SMTPAddressFailedException smtp && rejected(smtp.getReturnCode())) code = "email_send_recipient_rejected";
            if (!submissionStarted) {
                if (next instanceof AuthenticationFailedException) code = "email_send_authentication_failed";
                else if (next instanceof UnknownHostException) code = "email_send_dns_failed";
                else if (next instanceof SSLException) code = "email_send_tls_failed";
                else if (next instanceof SocketTimeoutException || next instanceof ConnectException) code = "email_send_connection_failed";
            }
            if (next.getCause() != null) pending.add(next.getCause());
            if (next instanceof MessagingException mail && mail.getNextException() != null) pending.add(mail.getNextException());
        }
        return code != null ? new MailSendRejection(code) : submissionStarted ? null : new MailSendRejection("email_send_failed");
    }
    private static boolean rejected(int code) { return code >= 400 && code <= 599; }
    private static String response(int code, String command) {
        if (code == 552) return "email_send_size_rejected";
        if (code < 500) return "email_send_temporarily_rejected";
        if (command != null && command.startsWith("MAIL")) return "email_send_sender_rejected";
        if (command != null && command.startsWith("RCPT")) return "email_send_recipient_rejected";
        return "email_send_content_rejected";
    }
}
