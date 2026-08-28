package com.indice.erp.billing.subscription;

import java.util.List;

public record BillingSelectionResponse(
    String source,
    String status,
    String catalog_version,
    String offer_code,
    String billing_interval,
    String currency,
    int included_seats,
    int extra_seats,
    int used_seats,
    int available_seats,
    Long base_amount_cents,
    long extra_seat_unit_amount_cents,
    long complementary_amount_cents,
    Long estimated_amount_cents,
    String trial_ends_at,
    String change_timing,
    boolean charged_now,
    boolean payment_method_required,
    boolean can_update,
    List<String> selected_product_codes,
    List<Product> available_products
) {
    public BillingSelectionResponse(
        String source,
        String status,
        String catalog_version,
        String offer_code,
        String billing_interval,
        String currency,
        int included_seats,
        int extra_seats,
        int used_seats,
        int available_seats,
        Long base_amount_cents,
        long extra_seat_unit_amount_cents,
        Long estimated_amount_cents,
        String trial_ends_at,
        String change_timing,
        boolean charged_now,
        boolean payment_method_required,
        boolean can_update,
        List<String> selected_product_codes,
        List<Product> available_products
    ) {
        this(
            source, status, catalog_version, offer_code, billing_interval, currency,
            included_seats, extra_seats, used_seats, available_seats,
            base_amount_cents, extra_seat_unit_amount_cents, 0, estimated_amount_cents,
            trial_ends_at, change_timing, charged_now, payment_method_required, can_update,
            selected_product_codes, available_products
        );
    }

    public record Product(
        long id,
        String product_code,
        String display_name,
        String product_type,
        String commercial_kind,
        Long unit_amount_cents,
        boolean stripe_ready,
        List<String> capabilities,
        List<String> included_product_codes
    ) {
        public Product(
            long id,
            String product_code,
            String display_name,
            String product_type,
            Long unit_amount_cents,
            boolean stripe_ready,
            List<String> capabilities
        ) {
            this(id, product_code, display_name, product_type, "MODULE", unit_amount_cents, stripe_ready, capabilities, List.of());
        }

        public Product(long id, String product_code, String display_name, List<String> capabilities) {
            this(id, product_code, display_name, "BASIC", null, true, capabilities);
        }
    }
}
