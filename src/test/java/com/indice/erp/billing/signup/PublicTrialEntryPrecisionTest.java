package com.indice.erp.billing.signup;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.audit.BillingAuditService;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.platformadmin.leads.PlatformLeadService;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

class PublicTrialEntryPrecisionTest {
    @Test void firstReceiptAlreadyMatchesThePersistedMicrosecondPrecisionOnNanosecondClocks() {
        var entries = mock(PublicTrialEntryRepository.class);
        var leads = mock(PlatformLeadService.class);
        when(leads.captureSelfServiceInterest(anyString(), anyString(), any())).thenReturn(42L);
        var provisioning = mock(BillingTenantProvisioningService.class);
        when(provisioning.enabled()).thenReturn(true);
        var properties = new BillingSignupEmailVerificationProperties();
        properties.setEnabled(true);
        var transactions = mock(PlatformTransactionManager.class);
        when(transactions.getTransaction(any())).thenReturn(mock(TransactionStatus.class));
        var service = new PublicTrialEntryService(true, entries, leads,
            mock(CommercialOfferSelectionService.class), mock(BillingSignupIntentRepository.class), provisioning,
            mock(BillingSignupEmailVerificationService.class), properties, new BCryptPasswordEncoder(),
            mock(BillingAuditService.class), new ObjectMapper(),
            Clock.fixed(Instant.parse("2026-10-08T21:32:51.662241429Z"), ZoneOffset.UTC), transactions);
        var key = BillingHashing.randomReference();
        var receipt = service.start(new PublicTrialEntryContracts.Start("Test Owner", "Test Company",
            "synthetic@example.com", "synthetic@example.com", null, "CA", "Organize work", "CONTROLA",
            "test", "test", "test", true), key, "test-browser");
        var expected = Instant.parse("2026-10-09T21:32:51.662241Z");
        assertThat(receipt.expiresAt()).isEqualTo(expected);
        verify(entries).insert(eq(BillingHashing.sha256(key)), anyString(), anyString(), anyString(), eq(42L), eq("CA"), eq(expected));
    }
}
