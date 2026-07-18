package com.indice.erp.pos.purchaseorder.kiosk;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.kiosk.engine.KioskIdentityCredentialService;
import com.indice.erp.kiosk.engine.KioskIdentityCredentialService.PersonalPinCredential;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@ExtendWith(MockitoExtension.class)
class ProcurementSupplierPortalIdentityServiceTest {

    @Mock PurchaseOrderRepository repository;
    @Mock KioskIdentityCredentialService credentials;
    @Mock BCryptPasswordEncoder passwordEncoder;

    @Test
    void verifiesPersonalProviderPinAndReturnsOpaqueSessionMaterial() {
        var access = access("ACTIVE", Instant.now().plusSeconds(3600));
        when(repository.findSupplierPortalAccessByCode("PORTAL-ABC")).thenReturn(Optional.of(access));
        when(credentials.pinCredential(7L, "PROVIDER", 80L)).thenReturn(Optional.of(
            new PersonalPinCredential("personal-hash", "ACTIVE", "PERSONAL_ROTATION")));
        when(passwordEncoder.matches("4821", "personal-hash")).thenReturn(true);

        var response = service().verify("PORTAL-ABC", "4821");

        assertThat(response).containsKeys("engine_identity", "kiosk_session_token", "expires_at");
        assertThat(String.valueOf(response.get("kiosk_session_token"))).hasSizeGreaterThan(30);
        assertThat(response).doesNotContainKeys("pin", "pin_hash");
    }

    @Test
    void materializesExpiredLegacyAccessAndReturnsGenericFailure() {
        var access = access("ACTIVE", Instant.now().minusSeconds(1));
        when(repository.findSupplierPortalAccessByCode("PORTAL-ABC")).thenReturn(Optional.of(access));

        assertThatThrownBy(() -> service().verify("PORTAL-ABC", "4821"))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Supplier portal authentication failed.");
        verify(repository).markSupplierPortalExpired(18L);
    }

    @Test
    void centralPersonalPinIsAuthoritativeAfterMigration() {
        var access = access("ACTIVE", null);
        when(repository.findSupplierPortalAccessByCode("PORTAL-ABC")).thenReturn(Optional.of(access));
        when(credentials.pinCredential(7L, "PROVIDER", 80L)).thenReturn(Optional.of(
            new PersonalPinCredential("personal-hash", "ACTIVE", "PERSONAL_ROTATION")));
        when(passwordEncoder.matches("4821", "personal-hash")).thenReturn(false);

        assertThatThrownBy(() -> service().verify("PORTAL-ABC", "4821"))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Supplier portal authentication failed.");
        org.mockito.Mockito.verify(passwordEncoder, org.mockito.Mockito.never())
            .matches("4821", "legacy-hash");
    }

    @Test
    void supportsLegacyHashOnlyWhenThePersonalCredentialHasNotBeenMigrated() {
        var access = access("ACTIVE", null);
        when(repository.findSupplierPortalAccessByCode("PORTAL-ABC")).thenReturn(Optional.of(access));
        when(credentials.pinCredential(7L, "PROVIDER", 80L)).thenReturn(Optional.empty());
        when(passwordEncoder.matches("4821", "legacy-hash")).thenReturn(true);

        assertThat(service().verify("PORTAL-ABC", "4821")).containsKey("kiosk_session_token");
    }

    @Test
    void migrationDerivedCredentialPreservesEachLegacyLinkUntilExplicitRotation() {
        var access = access("ACTIVE", null);
        when(repository.findSupplierPortalAccessByCode("PORTAL-ABC")).thenReturn(Optional.of(access));
        when(credentials.pinCredential(7L, "PROVIDER", 80L)).thenReturn(Optional.of(
            new PersonalPinCredential("other-kiosk-hash", "ACTIVE", "LEGACY_MIGRATION")));
        when(passwordEncoder.matches("4821", "legacy-hash")).thenReturn(true);

        assertThat(service().verify("PORTAL-ABC", "4821")).containsKey("kiosk_session_token");
        org.mockito.Mockito.verify(passwordEncoder, org.mockito.Mockito.never())
            .matches("4821", "other-kiosk-hash");
    }

    @Test
    void revokedCentralCredentialNeverResurrectsLegacyPin() {
        var access = access("ACTIVE", null);
        when(repository.findSupplierPortalAccessByCode("PORTAL-ABC")).thenReturn(Optional.of(access));
        when(credentials.pinCredential(7L, "PROVIDER", 80L)).thenReturn(Optional.of(
            new PersonalPinCredential("revoked-hash", "REVOKED", "PERSONAL_ROTATION")));

        assertThatThrownBy(() -> service().verify("PORTAL-ABC", "4821"))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Supplier portal authentication failed.");
        org.mockito.Mockito.verify(passwordEncoder, org.mockito.Mockito.never())
            .matches(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
    }

    private ProcurementSupplierPortalIdentityService service() {
        return new ProcurementSupplierPortalIdentityService(repository, credentials, passwordEncoder);
    }

    private PurchaseOrderRepository.SupplierPortalAccessRecord access(String status, Instant expiresAt) {
        return new PurchaseOrderRepository.SupplierPortalAccessRecord(
            18L, 7L, "Indice", 80L, "Proveedor Norte", "proveedor@example.com",
            "PORTAL-ABC", "legacy-hash", status, expiresAt,
            "[\"procurement.catalog.read\"]", 3L, "Unidad Norte", 4L, "Negocio Norte"
        );
    }
}
