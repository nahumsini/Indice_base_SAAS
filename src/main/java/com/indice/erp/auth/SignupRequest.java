package com.indice.erp.auth;

public record SignupRequest(
    String fullName,
    String email,
    String password,
    String companyName,
    String industry,
    String companySize,
    String country,
    String phone
) {
}
