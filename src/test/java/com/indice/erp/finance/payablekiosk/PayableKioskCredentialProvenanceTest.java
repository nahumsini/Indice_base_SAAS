package com.indice.erp.finance.payablekiosk;

import com.indice.erp.kiosk.engine.KioskIdentityCredentialService.PersonalPinCredential;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PayableKioskCredentialProvenanceTest {

    @Test
    void personalRotationRejectsAnOldLegacyPin() {
        var rotated = new PersonalPinCredential("personal-hash", "ACTIVE", "PERSONAL_ROTATION");

        assertThat(PayableKioskService.acceptsCredential(rotated, false, true)).isFalse();
        assertThat(PayableKioskService.acceptsCredential(rotated, true, false)).isTrue();
    }

    @Test
    void migrationMayUseOnlyTheExactLegacyLinkPin() {
        var migrated = new PersonalPinCredential("selected-legacy-hash", "ACTIVE", "LEGACY_MIGRATION");

        assertThat(PayableKioskService.acceptsCredential(migrated, false, true)).isTrue();
        assertThat(PayableKioskService.acceptsCredential(migrated, true, false)).isFalse();
    }

    @Test
    void absentCredentialKeepsLegacyCompatibilityButRevokedCredentialDoesNot() {
        assertThat(PayableKioskService.acceptsCredential(null, false, true)).isTrue();

        var revoked = new PersonalPinCredential("hash", "REVOKED", "LEGACY_MIGRATION");
        assertThat(PayableKioskService.acceptsCredential(revoked, true, true)).isFalse();
    }
}
