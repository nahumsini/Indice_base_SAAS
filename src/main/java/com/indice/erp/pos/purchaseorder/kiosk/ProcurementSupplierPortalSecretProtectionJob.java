package com.indice.erp.pos.purchaseorder.kiosk;

import com.indice.erp.pos.customerdisplay.CustomerDisplaySecretCodec;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Encrypts recoverable legacy portal codes after V137 has installed hash-based lookup. */
@Component
@ConditionalOnProperty(
    name = "app.kiosk.secret-protection.enabled",
    havingValue = "true",
    matchIfMissing = true)
public class ProcurementSupplierPortalSecretProtectionJob {

    private final PurchaseOrderRepository repository;
    private final CustomerDisplaySecretCodec secrets;

    public ProcurementSupplierPortalSecretProtectionJob(
            PurchaseOrderRepository repository,
            CustomerDisplaySecretCodec secrets) {
        this.repository = repository;
        this.secrets = secrets;
    }

    @Scheduled(
        fixedDelayString = "${app.pos.supplier-portal.secret-protection-delay-ms:3600000}",
        initialDelayString = "${app.pos.supplier-portal.secret-protection-initial-delay-ms:5000}")
    @Transactional
    public int protectLegacySecrets() {
        var rows = repository.findUnprotectedSupplierPortalSecrets(500);
        for (var access : rows) {
            repository.protectSupplierPortalSecret(
                access.id(), access.portalCode(), secrets.protect(access.portalCode()));
        }
        return rows.size();
    }
}
