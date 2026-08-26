package com.indice.erp.sales.publiccatalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.indice.erp.sales.SalesProductAvailabilityLinkCodec;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.AvailabilityRequest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SalesPublicCatalogAvailabilityServiceTest {

    @Mock SalesPublicCatalogRepository repository;
    @Mock SalesProductAvailabilityLinkCodec linkCodec;
    @Mock IcalAvailabilityClient client;

    @Test
    void returnsOnlyPerDayAvailabilityForTheRequestedCatalogProduct() {
        var catalog = catalog();
        when(repository.reservableProductSource(catalog, 91L))
            .thenReturn(java.util.Optional.of(
                new SalesPublicCatalogRepository.ReservableProductSource(91L, "protected")));
        when(linkCodec.reveal("protected")).thenReturn("https://calendar.example.com/private.ics");
        when(client.load(7L, 91L, "https://calendar.example.com/private.ics"))
            .thenReturn(new IcalAvailabilityClient.FeedResult(
                Set.of(LocalDate.of(2026, 8, 12), LocalDate.of(2026, 8, 13)), false));
        var service = new SalesPublicCatalogAvailabilityService(repository, linkCodec, client);

        var response = service.availability(catalog, new AvailabilityRequest(91L, "2026-08"));

        assertThat(response.sourceStatus()).isEqualTo("ready");
        assertThat(response.days()).hasSize(31);
        assertThat(response.days()).filteredOn(day -> day.status().equals("occupied"))
            .extracting(day -> day.date())
            .containsExactly("2026-08-12", "2026-08-13");
        assertThat(response.toString()).doesNotContain("calendar.example.com", "private.ics");
    }

    private SalesPublicCatalogRepository.CatalogRecord catalog() {
        var now = Instant.parse("2026-08-26T12:00:00Z");
        return new SalesPublicCatalogRepository.CatalogRecord(
            17L, 7L, "Company", 11L, "Unit", 12L, "Business", "CAT-1", "Catalog",
            "Public catalog", null, null, "Contact", "email", "sales@example.com",
            "ACTIVE", null, "tokenhint", null, true, true, true, true, true, true, true,
            false, 1L, now, now);
    }
}
