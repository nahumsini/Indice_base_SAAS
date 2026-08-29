package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.sales.MetaLeadImportDtos.ImportRequest;
import com.indice.erp.sales.MetaLeadImportDtos.ImportResponse;
import com.indice.erp.sales.MetaLeadImportDtos.ProviderLead;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MetaLeadImportServiceTest {

    private static final AuthSessionUser ACTOR = new AuthSessionUser(5L, 7L, 9L, "Owner", "admin");

    @Mock MetaLeadGateway gateway;
    @Mock MetaLeadImportPersistenceService persistenceService;

    private MetaLeadImportService service;

    @BeforeEach
    void setUp() {
        service = new MetaLeadImportService(gateway, persistenceService);
    }

    @Test
    void downloadsBeforeDelegatingToTheTransactionalPersistenceUseCase() {
        var lead = lead("lead-1");
        var response = new ImportResponse(1, 1, 0, 0, 0, List.of());
        when(gateway.download("123456", "token-that-is-long-enough", 100)).thenReturn(List.of(lead));
        when(persistenceService.persist(ACTOR, List.of(lead))).thenReturn(response);

        service.importLeads(ACTOR, new ImportRequest("123456", "token-that-is-long-enough", null));

        verify(gateway).download("123456", "token-that-is-long-enough", 100);
        verify(persistenceService).persist(ACTOR, List.of(lead));
    }

    @Test
    void rejectsInvalidPageAndBulkBoundsBeforeContactingMeta() {
        assertThatThrownBy(() -> service.importLeads(
                ACTOR,
                new ImportRequest("not-a-page", "token-that-is-long-enough", 501)))
                .isInstanceOf(IllegalArgumentException.class);

        verifyNoInteractions(gateway, persistenceService);
    }

    private static ProviderLead lead(String id) {
        return new ProviderLead(id, "123456", "form-1", "Website", "", "", "", "", null, Map.of());
    }
}
