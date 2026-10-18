package com.indice.erp.email.accounts;

import org.springframework.stereotype.Component;

@Component
public class JakartaMailConnectionProbe implements MailConnectionProbe {
    @Override public boolean verify(String protocol,String host,int port,String security,String username,String password) {
        try {
            String provider=switch(protocol){case "SMTP"->"smtp";case "IMAP"->"imap";case "POP3"->"pop3";default->throw new IllegalArgumentException();};
            var session=EmailConnectionFactory.session(protocol,host,port,security);
            if("SMTP".equals(protocol)) {
                try(var transport=session.getTransport(provider)) {transport.connect(host,port,username,password);}
            } else {
                try(var store=session.getStore(provider)) {store.connect(host,port,username,password);}
            }
            return true;
        } catch(Exception rejected) {
            // Provider errors may contain credentials, addresses or server internals. Never expose/log them.
            return false;
        }
    }
}
