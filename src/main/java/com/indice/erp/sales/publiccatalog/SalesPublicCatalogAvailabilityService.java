package com.indice.erp.sales.publiccatalog;

import com.indice.erp.sales.SalesProductAvailabilityLinkCodec;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.AvailabilityDay;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.AvailabilityRequest;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.AvailabilityResponse;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;

@Service
class SalesPublicCatalogAvailabilityService {

    private final SalesPublicCatalogRepository repository;
    private final SalesProductAvailabilityLinkCodec linkCodec;
    private final IcalAvailabilityClient client;

    SalesPublicCatalogAvailabilityService(
            SalesPublicCatalogRepository repository,
            SalesProductAvailabilityLinkCodec linkCodec,
            IcalAvailabilityClient client) {
        this.repository = repository;
        this.linkCodec = linkCodec;
        this.client = client;
    }

    AvailabilityResponse availability(
            SalesPublicCatalogRepository.CatalogRecord catalog,
            AvailabilityRequest request) {
        final YearMonth month;
        try {
            month = YearMonth.parse(request.month());
        } catch (DateTimeParseException invalid) {
            throw new IllegalArgumentException("month must use YYYY-MM format.");
        }
        if (month.getYear() < 2000 || month.getYear() > 2100) {
            throw new IllegalArgumentException("Requested availability month is outside the supported range.");
        }
        var source = repository.reservableProductSource(catalog, request.productId())
            .orElseThrow(() -> new NoSuchElementException("Reservable product not found."));
        try {
            var result = client.load(catalog.companyId(), source.productId(),
                linkCodec.reveal(source.protectedUrl()));
            var days = new ArrayList<AvailabilityDay>();
            for (int day = 1; day <= month.lengthOfMonth(); day++) {
                var date = month.atDay(day);
                days.add(new AvailabilityDay(date.toString(),
                    result.occupiedDates().contains(date) ? "occupied" : "available"));
            }
            return new AvailabilityResponse(
                source.productId(), month.toString(), "ready", result.stale(), List.copyOf(days));
        } catch (IcalAvailabilityClient.FeedUnavailableException | IllegalStateException unavailable) {
            return new AvailabilityResponse(
                source.productId(), month.toString(), "temporarilyUnavailable", false, List.of());
        }
    }
}
