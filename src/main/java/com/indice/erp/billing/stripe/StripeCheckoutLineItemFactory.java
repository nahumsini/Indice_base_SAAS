package com.indice.erp.billing.stripe;

import com.indice.erp.auth.SignupPlanSelection;
import java.util.ArrayList;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
class StripeCheckoutLineItemFactory {

    private final StripeSignupProperties properties;

    StripeCheckoutLineItemFactory(StripeSignupProperties properties) {
        this.properties = properties;
    }

    ArrayList<Map<String, Object>> lineItems(SignupPlanSelection plan) {
        var items = new ArrayList<Map<String, Object>>();
        if ("custom-modules".equals(plan.planId())) {
            items.add(lineItem(properties.priceId(plan.planId()), "Two selected modules with 5 users included", 9_900, 1, plan.currency()));
            var additionalModules = Math.max(0, plan.moduleCount() - 2);
            if (additionalModules > 0) {
                items.add(lineItem(properties.getPriceAdditionalModule(), "Additional module", 4_900, additionalModules, plan.currency()));
            }
        } else {
            items.add(lineItem(properties.priceId(plan.planId()), planName(plan.planId()), baseAmount(plan), 1, plan.currency()));
        }
        if (plan.extraCollaborators() > 0) {
            items.add(lineItem(properties.getPriceExtraCollaborator(), "Extra user", 1_000, plan.extraCollaborators(), plan.currency()));
        }
        return items;
    }

    private Map<String, Object> lineItem(String priceId, String name, int amountCents, int quantity, String currency) {
        if (priceId != null && !priceId.isBlank()) {
            return Map.of("price", priceId, "quantity", quantity);
        }
        return Map.of(
            "price_data", Map.of(
                "currency", currency,
                "unit_amount", amountCents,
                "recurring", Map.of("interval", "month"),
                "tax_behavior", "exclusive",
                "product_data", Map.of("name", name)
            ),
            "quantity", quantity
        );
    }

    private int baseAmount(SignupPlanSelection plan) {
        return switch (plan.planId()) {
            case "one-module" -> 5_900;
            case "two-modules" -> 9_900;
            case "all-modules" -> 19_900;
            default -> 9_900;
        };
    }

    private String planName(String planId) {
        return switch (planId) {
            case "one-module" -> "One selected module with 5 users included";
            case "two-modules" -> "Two selected modules with 5 users included";
            case "all-modules" -> "All Basic modules launch offer with 5 users included";
            default -> "Selected modules with 5 users included";
        };
    }
}
