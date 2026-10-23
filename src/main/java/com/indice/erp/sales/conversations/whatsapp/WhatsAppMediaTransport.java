package com.indice.erp.sales.conversations.whatsapp;
public interface WhatsAppMediaTransport {
    record Content(String mime,byte[] bytes){@Override public String toString(){return "Content[redacted]";}}
    Content download(String mediaId,String token,int maxBytes);
}
