package com.indice.erp.pos.customerdisplay;

import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.DependsOn;
import org.springframework.stereotype.Component;

/** Seals legacy display secrets before the HTTP server lifecycle can start. */
@Component
@ConditionalOnProperty(
    name = "app.kiosk.secret-protection.enabled",
    havingValue = "true",
    matchIfMissing = true)
@DependsOn("kioskProtectionKeySentinel")
public class CustomerDisplaySecretProtectionStartup implements SmartInitializingSingleton {

    private static final int BATCH_SIZE = 500;

    private final CustomerDisplaySecretProtectionJob protectionJob;

    public CustomerDisplaySecretProtectionStartup(
            CustomerDisplaySecretProtectionJob protectionJob) {
        this.protectionJob = protectionJob;
    }

    @Override
    public void afterSingletonsInstantiated() {
        int processed;
        do {
            processed = protectionJob.protectLegacySecrets();
        } while (processed >= BATCH_SIZE);
    }
}
