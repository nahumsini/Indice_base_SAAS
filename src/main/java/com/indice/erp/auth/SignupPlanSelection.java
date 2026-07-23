package com.indice.erp.auth;

import java.util.List;

public record SignupPlanSelection(
    String planId,
    int moduleCount,
    int includedCollaborators,
    int extraCollaborators,
    int monthlyAmountCents,
    String currency,
    List<String> selectedModuleSlugs
) {
    public SignupPlanSelection {
        selectedModuleSlugs = selectedModuleSlugs == null ? List.of() : List.copyOf(selectedModuleSlugs);
    }

    public SignupPlanSelection withSelectedModuleSlugs(List<String> modules) {
        return new SignupPlanSelection(
            planId,
            moduleCount,
            includedCollaborators,
            extraCollaborators,
            monthlyAmountCents,
            currency,
            modules
        );
    }
}
