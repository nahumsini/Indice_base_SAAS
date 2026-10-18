package com.indice.erp.email.accounts;

import jakarta.mail.Session;
import java.io.IOException;
import java.util.Properties;

/** One TLS and destination policy for probes and real user-owned mailbox operations. */
public final class EmailConnectionFactory {
    private EmailConnectionFactory() { }
    public static Session session(String protocol,String host,int port,String security) throws IOException {
        String provider=protocol.toLowerCase(java.util.Locale.ROOT);
        if(!java.util.Set.of("smtp","imap","pop3").contains(provider))throw new IOException("Mail protocol rejected");
        var props=new Properties();String prefix="mail."+provider+".";
        props.setProperty("mail.debug","false");
        for(String timeout:java.util.List.of("connectiontimeout","timeout","writetimeout"))props.setProperty(prefix+timeout,"8000");
        props.setProperty(prefix+"auth","true");props.setProperty(prefix+"ssl.checkserveridentity","true");
        props.setProperty(prefix+"ssl.protocols","TLSv1.2 TLSv1.3");
        props.setProperty(prefix+"ssl.enable",Boolean.toString("TLS".equals(security)));
        props.setProperty(prefix+"starttls.enable",Boolean.toString("STARTTLS".equals(security)));
        props.setProperty(prefix+"starttls.required",Boolean.toString("STARTTLS".equals(security)));
        props.setProperty(prefix+"socketFactory.fallback","false");
        props.put(prefix+"socketFactory",new PublicMailSocketFactory(host,port));
        props.setProperty("mail.smtp.quitwait","false");props.setProperty("mail.smtp.sendpartial","false");
        props.setProperty("mail.imap.peek","true");props.setProperty("mail.imap.connectionpoolsize","1");
        return Session.getInstance(props);
    }
}
