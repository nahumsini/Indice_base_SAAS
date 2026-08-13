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
    long complementaryAmountCents,
    String baseExternalPriceId,
    String extraSeatExternalPriceId,
    List<Product> products
) {
    public CommercialOfferSelection(
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
        this(
            catalogVersionId,
            catalogVersion,
            offerCode,
            billingInterval,
            currency,
            includedSeats,
            extraSeats,
            estimatedAmountCents,
            baseAmountCents,
            extraSeatUnitAmountCents,
            0,
            null,
            null,
            products
        );
    }

    public record Product(
        long id,
        String code,
        String displayName,
        String productType,
        Long unitAmountCents,
        String externalPriceId
    ) {
        public Product(long id, String code, String displayName) {
            this(id, code, displayName, "BASIC", null, null);
        }

        public boolean complementary() {
            return "ADDON".equalsIgnoreCase(productType);
        }
    }
}
