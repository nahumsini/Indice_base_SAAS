package com.indice.erp.auth;

import org.springframework.stereotype.Component;

@Component
public class SignupPlanCalculator {

    private static final int INCLUDED_COLLABORATORS = 5;
    private static final int ONE_MODULE_CENTS = 5_900;
    private static final int TWO_MODULES_CENTS = 9_900;
    private static final int ADDITIONAL_MODULE_CENTS = 4_900;
    private static final int ALL_BASIC_MODULES_CENTS = 19_900;
    private static final int EXTRA_COLLABORATOR_CENTS = 1_000;

    public SignupPlanSelection calculate(SignupCheckoutRequest request) {
        var planId = normalizePlanId(request == null ? null : request.planId());
        var selectedModules = selectedModules(planId, request == null ? null : request.selectedModuleSlugs());
        var moduleCount = selectedModules.size();
        var requestedExtraSeats = request == null || request.extraCollaborators() == null
            ? 0
            : request.extraCollaborators();
        var extraCollaborators = Math.max(0, Math.min(500, requestedExtraSeats));
        var baseAmount = baseAmountCents(planId, moduleCount);
        var monthlyAmount = baseAmount + extraCollaborators * EXTRA_COLLABORATOR_CENTS;
        return new SignupPlanSelection(
            planId,
            moduleCount,
            INCLUDED_COLLABORATORS,
            extraCollaborators,
            monthlyAmount,
            "usd",
            selectedModules
        );
    }

    private int baseAmountCents(String planId, int moduleCount) {
        return switch (planId) {
            case "one-module" -> ONE_MODULE_CENTS;
            case "two-modules" -> TWO_MODULES_CENTS;
            case "custom-modules" -> TWO_MODULES_CENTS + (moduleCount - 2) * ADDITIONAL_MODULE_CENTS;
            case "all-modules" -> ALL_BASIC_MODULES_CENTS;
            default -> throw new IllegalArgumentException("Choose a valid plan.");
        };
    }

    private String normalizePlanId(String value) {
        var planId = safe(value);
        if (planId.isBlank()) {
            return "one-module";
        }
        return switch (planId) {
            case "one-module", "two-modules", "custom-modules", "all-modules" -> planId;
            default -> throw new IllegalArgumentException("Choose a valid plan.");
        };
    }

    private java.util.List<String> selectedModules(String planId, java.util.List<String> rawModules) {
        if ("all-modules".equals(planId)) {
            return BasicModuleCatalog.selectableModules();
        }
        var selectedModules = BasicModuleCatalog.normalizeSelectedModules(rawModules);
        if ("one-module".equals(planId)) {
            requireCount(selectedModules.size(), 1, "Choose one module for this plan.");
            return selectedModules;
        }
        if ("two-modules".equals(planId)) {
            requireCount(selectedModules.size(), 2, "Choose two modules for this plan.");
            return selectedModules;
        }
        if (selectedModules.size() < 3) {
            throw new IllegalArgumentException("Choose at least three modules for this plan.");
        }
        return selectedModules;
    }

    private void requireCount(int actual, int expected, String message) {
        if (actual != expected) {
            throw new IllegalArgumentException(message);
        }
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}
