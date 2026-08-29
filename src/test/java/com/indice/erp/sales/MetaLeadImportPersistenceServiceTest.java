package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.sales.MetaLeadImportDtos.ProviderLead;
import com.indice.erp.sales.MetaLeadImportRepository.ContactIdentity;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MetaLeadImportPersistenceServiceTest {

    private static final AuthSessionUser ACTOR = new AuthSessionUser(5L, 7L, 9L, "Owner", "admin");

    @Mock MetaLeadImportRepository repository;
    @Mock SalesService salesService;

    private MetaLeadImportPersistenceService service;

    @BeforeEach
    void setUp() {
        service = new MetaLeadImportPersistenceService(repository, salesService);
    }

    @Test
    void importsNewContactsAndAuditsExistingIdentityDuplicatesIdempotently() {
        var fresh = lead("fresh", Map.of(
                "full_name", List.of("Ada Lovelace"),
                "email", List.of("ada@example.com"),
                "job_title", List.of("Director")));
        var duplicate = lead("duplicate", Map.of(
                "full_name", List.of("Existing"),
                "phone_number", List.of("+1 (416) 555-0100")));
        var previous = lead("previous", Map.of("email", List.of("old@example.com")));
        var invalid = lead("invalid", Map.of("custom_answer", List.of("No identity")));
        var leads = List.of(fresh, duplicate, previous, invalid);

        when(repository.findImportedLeadIds(7L, Set.of("fresh", "duplicate", "previous", "invalid")))
                .thenReturn(Set.of("previous"));
        when(repository.listContactIdentities(7L))
                .thenReturn(List.of(new ContactIdentity(77L, "", "+1 416 555 0100")));
        when(salesService.create(eq(7L), eq(5L), eq("contacts"), any()))
                .thenReturn(Map.of(
                        "id", 88L,
                        "contactCode", "CON-000088",
                        "contactPerson", "Ada Lovelace",
                        "email", "ada@example.com",
                        "phone", ""));

        var result = service.persist(ACTOR, leads);

        assertThat(result.downloaded()).isEqualTo(4);
        assertThat(result.imported()).isEqualTo(1);
        assertThat(result.skippedDuplicates()).isEqualTo(1);
        assertThat(result.skippedPreviouslyImported()).isEqualTo(1);
        assertThat(result.skippedInvalid()).isEqualTo(1);
        assertThat(result.contacts()).singleElement().satisfies(contact -> {
            assertThat(contact.id()).isEqualTo(88L);
            assertThat(contact.contactPerson()).isEqualTo("Ada Lovelace");
        });

        @SuppressWarnings("unchecked")
        var payload = ArgumentCaptor.forClass((Class<Map<String, Object>>) (Class<?>) Map.class);
        verify(salesService).create(eq(7L), eq(5L), eq("contacts"), payload.capture());
        assertThat(payload.getValue())
                .containsEntry("source", "social_media")
                .containsEntry("ownerUserCompanyId", 9L);
        var customFields = (Map<?, ?>) payload.getValue().get("customFields");
        assertThat(customFields.get("role")).isEqualTo("Director");
        assertThat(customFields.containsKey("metaLead")).isTrue();
        verify(repository, times(2)).recordImport(eq(7L), eq(5L), anyLong(), any(ProviderLead.class));
    }

    private static ProviderLead lead(String id, Map<String, List<String>> fields) {
        return new ProviderLead(
                id, "123456", "form-1", "Website", "ad-1", "Ad", "campaign-1", "Campaign", null, fields);
    }
}
