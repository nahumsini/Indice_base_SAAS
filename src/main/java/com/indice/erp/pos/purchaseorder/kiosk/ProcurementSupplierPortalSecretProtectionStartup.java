package com.indice.erp.pos.purchaseorder.kiosk;

import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.DependsOn;
import org.springframework.stereotype.Component;

/** Seals legacy portal links before the web-server lifecycle is allowed to start. */
@Component
@ConditionalOnProperty(
    name = "app.kiosk.secret-protection.enabled",
    havingValue = "true",
    matchIfMissing = true)
@DependsOn("kioskProtectionKeySentinel")
public class ProcurementSupplierPortalSecretProtectionStartup
        implements SmartInitializingSingleton {

    private static final int BATCH_SIZE = 500;
    private final ProcurementSupplierPortalSecretProtectionJob protectionJob;

    public ProcurementSupplierPortalSecretProtectionStartup(
            ProcurementSupplierPortalSecretProtectionJob protectionJob) {
        this.protectionJob = protectionJob;
    }

    @Override
    public void afterSingletonsInstantiated() {
        int protectedRows;
        do {
            protectedRows = protectionJob.protectLegacySecrets();
        } while (protectedRows == BATCH_SIZE);
    }
}
