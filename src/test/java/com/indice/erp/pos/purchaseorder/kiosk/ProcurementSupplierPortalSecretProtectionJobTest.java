package com.indice.erp.pos.purchaseorder.kiosk;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.pos.customerdisplay.CustomerDisplaySecretCodec;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository.SupplierPortalSecretRecord;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProcurementSupplierPortalSecretProtectionJobTest {

    @Mock PurchaseOrderRepository repository;
    @Mock CustomerDisplaySecretCodec secrets;

    @Test
    void encryptsEveryPlaintextPortalCodeWithCompareAndSetPersistence() {
        when(repository.findUnprotectedSupplierPortalSecrets(500)).thenReturn(List.of(
            new SupplierPortalSecretRecord(18L, "PORTAL-ABC"),
            new SupplierPortalSecretRecord(19L, "PORTAL-XYZ")));
        when(secrets.protect("PORTAL-ABC")).thenReturn("enc.v1.abc");
        when(secrets.protect("PORTAL-XYZ")).thenReturn("enc.v1.xyz");

        assertThat(job().protectLegacySecrets()).isEqualTo(2);

        verify(repository).protectSupplierPortalSecret(18L, "PORTAL-ABC", "enc.v1.abc");
        verify(repository).protectSupplierPortalSecret(19L, "PORTAL-XYZ", "enc.v1.xyz");
    }

    @Test
    void emptyBatchPerformsNoEncryptionOrWrite() {
        when(repository.findUnprotectedSupplierPortalSecrets(500)).thenReturn(List.of());

        assertThat(job().protectLegacySecrets()).isZero();

        verify(secrets, never()).protect(org.mockito.ArgumentMatchers.anyString());
        verify(repository, never()).protectSupplierPortalSecret(
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyString(),
            org.mockito.ArgumentMatchers.anyString());
    }

    private ProcurementSupplierPortalSecretProtectionJob job() {
        return new ProcurementSupplierPortalSecretProtectionJob(repository, secrets);
    }
}
