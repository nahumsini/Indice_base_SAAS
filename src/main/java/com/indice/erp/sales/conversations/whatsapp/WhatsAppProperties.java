package com.indice.erp.sales.conversations.whatsapp;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Separate opt-ins: no service, credential or provider activation from a UI visit. */
@Component
public record WhatsAppProperties(
    @Value("${app.sales-conversations.enabled:false}") boolean enabled,
    @Value("${app.sales-conversations.ingress-enabled:false}") boolean ingressEnabled,
    @Value("${app.sales-conversations.worker-enabled:false}") boolean workerEnabled,
    @Value("${app.sales-conversations.outbound-enabled:false}") boolean outboundEnabled,
    @Value("${app.sales-conversations.app-id:}") String appId,
    @Value("${app.sales-conversations.app-secret:}") String appSecret,
    @Value("${app.sales-conversations.verify-token:}") String verifyToken,
    @Value("${app.sales-conversations.graph-version:}") String graphVersion) {
    @Override public String toString(){return "WhatsAppProperties[redacted]";}
}
