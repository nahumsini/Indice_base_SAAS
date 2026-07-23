package com.indice.erp.auth;

import java.util.List;

public record SignupCheckoutRequest(
    String fullName,
    String email,
    String password,
    String companyName,
    String industry,
    String companySize,
    String country,
    String phone,
    String planId,
    Integer moduleCount,
    Integer extraCollaborators,
    List<String> selectedModuleSlugs
) {
    public SignupRequest accountRequest() {
        return new SignupRequest(
            fullName,
            email,
            password,
            companyName,
            industry,
            companySize,
            country,
            phone
        );
    }
}
