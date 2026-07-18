package com.indice.erp.pos.customerdisplay;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Lazily seals plaintext rows backfilled from the legacy customer display table. */
@Component
@ConditionalOnProperty(
    name = "app.kiosk.secret-protection.enabled",
    havingValue = "true",
    matchIfMissing = true)
public class CustomerDisplaySecretProtectionJob {

    private final CustomerDisplayRepository repository;
    private final CustomerDisplaySecretCodec secrets;

    public CustomerDisplaySecretProtectionJob(
            CustomerDisplayRepository repository,
            CustomerDisplaySecretCodec secrets) {
        this.repository = repository;
        this.secrets = secrets;
    }

    @Scheduled(
        fixedDelayString = "${app.pos.customer-display.secret-protection-delay-ms:3600000}",
        initialDelayString = "${app.pos.customer-display.secret-protection-initial-delay-ms:5000}")
    @Transactional
    public int protectLegacySecrets() {
        var rows = repository.findUnprotectedSecrets(500);
        for (var device : rows) {
            var rawDeviceToken = secrets.reveal(device.deviceToken());
            var storedPairingCode = device.pairingCode();
            var rawPairingCode = storedPairingCode == null
                ? null : secrets.reveal(storedPairingCode);
            repository.protectSecrets(
                device.id(),
                device.deviceToken(),
                secrets.protect(rawDeviceToken),
                storedPairingCode,
                rawPairingCode == null ? null : secrets.protect(rawPairingCode),
                rawPairingCode == null ? null : secrets.pairingHash(rawPairingCode)
            );
        }
        return rows.size();
    }
}
