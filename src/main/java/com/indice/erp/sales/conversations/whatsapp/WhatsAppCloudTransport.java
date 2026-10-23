package com.indice.erp.sales.conversations.whatsapp;

/** A provider call outcome is independent of the caller's lease/access after submission. */
public interface WhatsAppCloudTransport {
    record Media(String fileName,String contentType,byte[] bytes){@Override public String toString(){return "Media[redacted]";}}
    record Submission(String phoneId,String recipient,String body,String token,String attemptId,Media media) {
        public Submission(String phoneId,String recipient,String body,String token,String attemptId){this(phoneId,recipient,body,token,attemptId,null);}
        @Override public String toString(){return "Submission[redacted]";}
    }
    record Outcome(String state,String providerMessageId,String errorCode,String providerMediaId) {
        public Outcome(String state,String providerMessageId,String errorCode){this(state,providerMessageId,errorCode,null);}
    }
    Outcome send(Submission submission);
}
