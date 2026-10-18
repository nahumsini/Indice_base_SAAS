package com.indice.erp.email.accounts;

/** Technical owner port: authenticates only; never sends or reads a message. */
public interface MailConnectionProbe {
    boolean verify(String protocol,String host,int port,String security,String username,String password);
}
