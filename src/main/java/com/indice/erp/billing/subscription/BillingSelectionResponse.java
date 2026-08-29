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
    List<Product> available_products,
    String selection_state,
    String effective_at,
    List<String> current_product_codes,
    int current_included_seats,
    int current_extra_seats,
    boolean stripe_enabled,
    String stripe_mode,
    boolean stripe_catalog_ready,
    boolean activation_available,
    boolean payment_management_available,
    String access_change_timing,
    String change_reference,
    boolean access_allowed,
    String activation_block_reason
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
            selected_product_codes, available_products,
            "CURRENT", "", selected_product_codes, included_seats, extra_seats,
            false, "TEST", false, false, !payment_method_required,
            "IMMEDIATE", "", !"SUSPENDED".equalsIgnoreCase(status), "UNAVAILABLE"
        );
    }

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
        this(
            source, status, catalog_version, offer_code, billing_interval, currency,
            included_seats, extra_seats, used_seats, available_seats,
            base_amount_cents, extra_seat_unit_amount_cents, complementary_amount_cents,
            estimated_amount_cents, trial_ends_at, change_timing, charged_now,
            payment_method_required, can_update, selected_product_codes, available_products,
            "CURRENT", "", selected_product_codes, included_seats, extra_seats,
            false, "TEST", false, false, !payment_method_required,
            "IMMEDIATE", "", !"SUSPENDED".equalsIgnoreCase(status), "UNAVAILABLE"
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
