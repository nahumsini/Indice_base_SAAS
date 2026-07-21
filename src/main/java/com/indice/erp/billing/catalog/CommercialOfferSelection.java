package com.indice.erp.billing.catalog;

import java.util.List;

public record CommercialOfferSelection(
    long catalogVersionId,
    String catalogVersion,
    String offerCode,
    BillingInterval billingInterval,
    String currency,
    int includedSeats,
    int extraSeats,
    Long estimatedAmountCents,
    Long baseAmountCents,
    long extraSeatUnitAmountCents,
    List<Product> products
) {
    public record Product(long id, String code, String displayName) {
    }
}
