package com.indice.erp.finance.payablekiosk;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.expenses.attachments.ExpenseAttachmentService;
import com.indice.erp.finance.payablekiosk.dto.PublicPayableRequest;
import com.indice.erp.kiosk.engine.KioskGrantService;
import com.indice.erp.kiosk.engine.KioskIdentityCredentialService;
import com.indice.erp.kiosk.engine.KioskPayloadProtectionService;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.ProviderCenterAccessPolicy;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class PayableKioskEmployeeSubmissionTest {

    @Mock private PayableKioskRepository repository;
    @Mock private PayableKioskPublicRepository publicRepository;
    @Mock private FinanceAccessService accessService;
    @Mock private ExpenseAttachmentService attachmentService;
    @Mock private PayableKioskProviderAccessRepository providerAccessRepository;
    @Mock private PublicPayableKioskSession publicSession;
    @Mock private KioskRegistryService kioskRegistry;
    @Mock private KioskGrantService kioskGrants;
    @Mock private KioskIdentityCredentialService kioskCredentials;
    @Mock private KioskPayloadProtectionService payloadProtection;
    @Mock private ProviderCenterAccessPolicy providerCenterAccess;

    private PayableKioskService service;
    private PayableKioskRow kiosk;

    @BeforeEach
    void setUp() {
        service = new PayableKioskService(
            repository, publicRepository, new ObjectMapper(), new BCryptPasswordEncoder(),
            accessService, attachmentService, providerAccessRepository, publicSession,
            kioskRegistry, kioskGrants, kioskCredentials, payloadProtection,
            providerCenterAccess, 300, 28_800);
        kiosk = new PayableKioskRow(
            2L, 7L, 3L, 4L, null, "PAYABLE-02", "Captura de proveedores",
            "ACTIVE", "EMPLOYEE", "token", "pin-hash", "MXN", false);
    }

    @Test
    void employeeSubmissionPersistsTheIndiceUserAsRequester() {
        var employee = new PayableKioskPublicRepository.EmployeeIdentity(
            44L, 9L, "Employee One");
        var request = new PublicPayableRequest(
            222L, "Servicio", "Evidence-backed expense",
            new BigDecimal("100.00"), new BigDecimal("16.00"),
            new BigDecimal("116.00"), "mxn", LocalDate.of(2026, 9, 15), "INV-100");
        given(repository.getByToken("token")).willReturn(kiosk);
        given(publicRepository.activeCompanyEmployeeForUser(7L, 9L)).willReturn(Optional.of(employee));
        given(publicRepository.providerAvailable(kiosk, 222L)).willReturn(true);
        given(publicRepository.insertPayable(
            eq(kiosk), eq(222L), eq(9L),
            org.mockito.ArgumentMatchers.any(PublicPayableRequest.class),
            anyString(), anyString())).willReturn(901L);

        var response = service.createPayableForEmployee("token", 7L, 9L, request);

        assertThat(response).containsEntry("expenseId", 901L);
        var normalizedRequest = ArgumentCaptor.forClass(PublicPayableRequest.class);
        then(publicRepository).should().insertPayable(
            eq(kiosk), eq(222L), eq(9L), normalizedRequest.capture(), anyString(), anyString());
        assertThat(normalizedRequest.getValue().totalAmount()).isEqualByComparingTo("116.00");
        assertThat(normalizedRequest.getValue().currencyCode()).isEqualTo("MXN");
    }

    @Test
    void providerBankingChangeStoresOnlyProtectedPayload() {
        allowProviderCenterAccess(222L);
        given(payloadProtection.protect(anyString())).willReturn("protected-bank-data");
        given(publicRepository.insertProviderChangeRequest(
            eq(7L), eq(222L), eq("BANKING"), eq("{}"),
            eq("protected-bank-data"), eq("Ana"), eq("ana@proveedor.mx"))).willReturn(71L);

        var response = service.submitProviderProfileChange(
            7L, 222L, "banking", Map.of(
                "bank_name", "Banco Uno",
                "account_number", "00123456789",
                "currency_code", "mxn"),
            "Ana", "ANA@PROVEEDOR.MX");

        assertThat(response).containsEntry("request_id", 71L).containsEntry("status", "SUBMITTED");
        var plaintext = ArgumentCaptor.forClass(String.class);
        then(payloadProtection).should().protect(plaintext.capture());
        assertThat(plaintext.getValue())
            .contains("Banco Uno", "00123456789", "MXN");
        then(publicRepository).should().insertProviderChangeRequest(
            7L, 222L, "BANKING", "{}", "protected-bank-data", "Ana", "ana@proveedor.mx");
    }

    @Test
    void providerCenterPayableUsesTheTransactionsOwnCurrency() {
        allowProviderCenterAccess(222L);
        var request = new PublicPayableRequest(
            999L, "Servicio internacional", "Cuenta sin orden",
            new BigDecimal("100.00"), new BigDecimal("0.00"),
            new BigDecimal("100.00"), "usd", LocalDate.of(2026, 10, 15), "INV-USD-1");
        given(publicRepository.insertPayable(
            org.mockito.ArgumentMatchers.any(PayableKioskRow.class), eq(222L),
            org.mockito.ArgumentMatchers.isNull(),
            org.mockito.ArgumentMatchers.any(PublicPayableRequest.class),
            anyString(), anyString())).willReturn(902L);

        var response = service.createProviderCenterPayable(
            7L, 222L, request, "Ana", "ana@proveedor.mx");

        assertThat(response).containsEntry("expense_id", 902L).containsEntry("lane", "WITHOUT_PURCHASE_ORDER");
        var transaction = ArgumentCaptor.forClass(PayableKioskRow.class);
        var normalized = ArgumentCaptor.forClass(PublicPayableRequest.class);
        then(publicRepository).should().insertPayable(
            transaction.capture(), eq(222L), org.mockito.ArgumentMatchers.isNull(),
            normalized.capture(), anyString(), anyString());
        assertThat(transaction.getValue().currencyCode()).isEqualTo("USD");
        assertThat(normalized.getValue().currencyCode()).isEqualTo("USD");
    }

    @Test
    void providerProfileChangeRejectsNestedOrOversizedValuesBeforePersistence() {
        allowProviderCenterAccess(222L);

        assertThatThrownBy(() -> service.submitProviderProfileChange(
            7L, 222L, "FISCAL", Map.of("fiscal_address", Map.of("hidden", "value")),
            "Ana", "ana@proveedor.mx"))
            .hasMessageContaining("simple values");
        assertThatThrownBy(() -> service.submitProviderProfileChange(
            7L, 222L, "FISCAL", Map.of("legal_name", "1".repeat(221)),
            "Ana", "ana@proveedor.mx"))
            .hasMessageContaining("too long");

        then(publicRepository).should(never()).insertProviderChangeRequest(
            eq(7L), eq(222L), anyString(), anyString(),
            org.mockito.ArgumentMatchers.nullable(String.class), anyString(), anyString());
    }

    @Test
    @SuppressWarnings("unchecked")
    void providerTrackingAddsPaymentEvidenceWithoutRejectingNullableFinanceFields() {
        var payable = new LinkedHashMap<String, Object>();
        payable.put("id", 901L);
        payable.put("document_reference", "INV-901");
        payable.put("due_date", null);
        var evidence = Map.<String, Object>of("attachment_id", 41L, "file_name", "payment.pdf");
        given(providerCenterAccess.hasAccess(7L, 222L)).willReturn(true);
        given(publicRepository.providerCenterPayables(7L, 222L)).willReturn(List.of(payable));
        given(publicRepository.providerCenterPurchaseOrderPayments(7L, 222L)).willReturn(List.of());
        given(attachmentService.providerPaymentEvidence(7L, 222L, 901L)).willReturn(List.of(evidence));

        var tracking = service.providerCenterTracking(7L, 222L);
        var payables = (List<Map<String, Object>>) tracking.get("payables_without_purchase_order");

        assertThat(payables).hasSize(1);
        assertThat(payables.getFirst()).containsEntry("due_date", null);
        assertThat(payables.getFirst().get("payment_evidence")).isEqualTo(List.of(evidence));
    }

    private void allowProviderCenterAccess(long providerId) {
        given(providerCenterAccess.requireAccess(7L, providerId)).willReturn(
            new ProviderCenterAccessPolicy.ProviderIdentity(
                providerId, 7L, "Proveedor", "proveedor@example.com", 3L, 4L));
    }
}
