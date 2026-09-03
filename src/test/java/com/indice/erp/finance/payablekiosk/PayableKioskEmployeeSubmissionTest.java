package com.indice.erp.finance.payablekiosk;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.expenses.attachments.ExpenseAttachmentService;
import com.indice.erp.finance.payablekiosk.dto.PublicPayableRequest;
import com.indice.erp.kiosk.engine.KioskGrantService;
import com.indice.erp.kiosk.engine.KioskIdentityCredentialService;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

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

    private PayableKioskService service;
    private PayableKioskRow kiosk;

    @BeforeEach
    void setUp() {
        service = new PayableKioskService(
            repository, publicRepository, new ObjectMapper(), new BCryptPasswordEncoder(),
            accessService, attachmentService, providerAccessRepository, publicSession,
            kioskRegistry, kioskGrants, kioskCredentials, 300, 28_800);
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
        given(publicRepository.activeEmployeeForUser(kiosk, 9L)).willReturn(Optional.of(employee));
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
}
