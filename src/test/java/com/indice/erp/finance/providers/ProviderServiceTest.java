package com.indice.erp.finance.providers;

import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProviderServiceTest {

    @Mock
    private ProviderRepository repository;

    @Mock
    private FinanceAccessService accessService;

    @Mock
    private ProviderReferenceValidator referenceValidator;

    @Test
    void getReturnsCompanyScopedProviderFromRepository() {
        var service = service();
        var context = ProviderTestData.context();
        when(repository.findById(context, 99L))
            .thenReturn(Optional.of(ProviderTestData.record(99L, "ACME", "RFC123", ProviderStatus.ACTIVE)));

        var response = service.get(context, 99L);

        assertEquals(99L, response.id());
        assertEquals(7L, response.companyId());
        assertEquals("ACME", response.name());
    }

    @Test
    void createDefaultsActiveStatusAndAuditActor() {
        var service = service();
        var context = ProviderTestData.context();
        var command = ArgumentCaptor.forClass(ProviderCommand.class);
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.insert(eq(context), command.capture()))
            .thenReturn(ProviderTestData.record(10L, "ACME", "RFC123", ProviderStatus.ACTIVE));

        var response = service.create(context, ProviderTestData.createRequest(" ACME ", " RFC123 "));

        assertEquals(10L, response.id());
        assertEquals(ProviderStatus.ACTIVE, command.getValue().status());
        assertEquals("ACME", command.getValue().name());
        assertEquals("RFC123", command.getValue().taxId());
        assertEquals(1L, command.getValue().createdByUserId());
    }

    @Test
    void createRejectsDuplicateNameBeforePersistence() {
        var service = service();
        var context = ProviderTestData.context();
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.existsByName(context, "ACME", null)).thenReturn(true);

        var error = assertThrows(
            FinanceApiException.class,
            () -> service.create(context, ProviderTestData.createRequest("ACME", "RFC123")));

        assertEquals(HttpStatus.CONFLICT, error.status());
        verify(repository, never()).insert(any(), any());
    }

    @Test
    void createRejectsDuplicateTaxIdBeforePersistence() {
        var service = service();
        var context = ProviderTestData.context();
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.existsByTaxId(context, "RFC123", null)).thenReturn(true);

        var error = assertThrows(
            FinanceApiException.class,
            () -> service.create(context, ProviderTestData.createRequest("ACME", "RFC123")));

        assertEquals(HttpStatus.CONFLICT, error.status());
        verify(repository, never()).insert(any(), any());
    }

    @Test
    void updateChecksDuplicatesAgainstOtherProvidersAndPersists() {
        var service = service();
        var context = ProviderTestData.context();
        var updated = ProviderTestData.record(11L, "ACME Updated", "RFC123", ProviderStatus.BLOCKED);
        when(repository.findById(context, 11L))
            .thenReturn(Optional.of(ProviderTestData.record(11L, "ACME", "RFC123", ProviderStatus.ACTIVE)),
                Optional.of(updated));
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.update(eq(context), eq(11L), any())).thenReturn(true);

        var response = service.update(context, 11L,
            ProviderTestData.updateRequest("ACME Updated", "RFC123", ProviderStatus.BLOCKED));

        assertEquals("ACME Updated", response.name());
        assertEquals(ProviderStatus.BLOCKED, response.status());
        verify(repository).existsByName(context, "ACME Updated", 11L);
        verify(repository).existsByTaxId(context, "RFC123", 11L);
    }

    @Test
    void deleteSoftDeletesExistingProvider() {
        var service = service();
        var context = ProviderTestData.context();
        when(repository.findById(context, 12L))
            .thenReturn(Optional.of(ProviderTestData.record(12L, "ACME", "RFC123", ProviderStatus.ACTIVE)));
        when(repository.softDelete(context, 12L)).thenReturn(true);

        assertTrue(service.delete(context, 12L).success());
        verify(repository).softDelete(context, 12L);
    }

    @Test
    void createRejectsOutOfScopeBusinessBeforePersistence() {
        var service = service();
        var context = new FinanceContext(1L, 7L, "Scoped User", "user", true, FinanceScope.businessOffice(5L, 9L));
        var request = new com.indice.erp.finance.providers.dto.CreateProviderRequest(
            5L, 10L, "ACME", null, "RFC123", null, null, null, null, null, null, null, null);

        var error = assertThrows(FinanceApiException.class, () -> service.create(context, request));

        assertEquals(HttpStatus.FORBIDDEN, error.status());
        verifyNoInteractions(referenceValidator);
        verify(repository, never()).insert(any(), any());
    }

    private ProviderService service() {
        return new ProviderService(
            repository,
            new ProviderMapper(),
            new ProviderValidator(accessService),
            referenceValidator
        );
    }
}
