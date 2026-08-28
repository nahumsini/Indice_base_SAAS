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
    List<Product> products,
    List<LineItem> lineItems,
    List<String> moduleSlugs,
    Long subtotalAmountCents,
    long discountAmountCents,
    String promotionCode,
    String externalPromotionCodeId
) {
    public CommercialOfferSelection {
        products = products == null ? List.of() : List.copyOf(products);
        lineItems = lineItems == null ? List.of() : List.copyOf(lineItems);
        moduleSlugs = moduleSlugs == null ? List.of() : List.copyOf(moduleSlugs);
    }

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
        long complementaryAmountCents,
        String baseExternalPriceId,
        String extraSeatExternalPriceId,
        List<Product> products
    ) {
        this(
            catalogVersionId, catalogVersion, offerCode, billingInterval, currency,
            includedSeats, extraSeats, estimatedAmountCents, baseAmountCents,
            extraSeatUnitAmountCents, complementaryAmountCents, baseExternalPriceId,
            extraSeatExternalPriceId, products, legacyLineItems(
                offerCode, billingInterval, extraSeats, baseAmountCents,
                baseExternalPriceId, extraSeatUnitAmountCents, extraSeatExternalPriceId, products
            ), List.of(), estimatedAmountCents, 0, null, null
        );
    }

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

    private static List<LineItem> legacyLineItems(
        String offerCode,
        BillingInterval interval,
        int extraSeats,
        Long baseAmountCents,
        String baseExternalPriceId,
        long extraSeatUnitAmountCents,
        String extraSeatExternalPriceId,
        List<Product> products
    ) {
        var lines = new java.util.ArrayList<LineItem>();
        lines.add(new LineItem(null, offerCode, "BASE", 1, baseAmountCents, baseExternalPriceId));
        if (extraSeats > 0) {
            lines.add(new LineItem(null, "extra_seat", "SEAT", extraSeats, extraSeatUnitAmountCents, extraSeatExternalPriceId));
        }
        if (products != null) {
            products.stream().filter(Product::complementary).forEach(product -> lines.add(
                new LineItem(product.id(), product.code(), "PRODUCT", 1, product.unitAmountCents(), product.externalPriceId())
            ));
        }
        return List.copyOf(lines);
    }

    public record Product(
        long id,
        String code,
        String displayName,
        String productType,
        String commercialKind,
        Long unitAmountCents,
        String externalPriceId,
        String description,
        List<String> includedProductCodes,
        List<String> capabilities
    ) {
        public Product {
            commercialKind = commercialKind == null || commercialKind.isBlank()
                ? ("CORE".equalsIgnoreCase(productType) ? "CORE" : "MODULE")
                : commercialKind;
            includedProductCodes = includedProductCodes == null ? List.of() : List.copyOf(includedProductCodes);
            capabilities = capabilities == null ? List.of() : List.copyOf(capabilities);
        }

        public Product(long id, String code, String displayName, String productType, Long unitAmountCents, String externalPriceId) {
            this(id, code, displayName, productType, null, unitAmountCents, externalPriceId, null, List.of(), List.of());
        }

        public Product(long id, String code, String displayName) {
            this(id, code, displayName, "BASIC", null, null);
        }

        public boolean complementary() {
            return "ADDON".equalsIgnoreCase(productType);
        }

        public boolean packageOffer() {
            return "PACKAGE".equalsIgnoreCase(commercialKind);
        }
    }

    public record LineItem(
        Long productId,
        String billableCode,
        String itemType,
        int quantity,
        Long unitAmountCents,
        String externalPriceId
    ) {
        public Long totalAmountCents() {
            return unitAmountCents == null ? null : Math.multiplyExact(unitAmountCents, (long) quantity);
        }
    }
}
