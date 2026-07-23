package com.indice.erp.auth;

public record SignupProfile(
    String fullName,
    String email,
    String passwordHash,
    String companyName,
    String industry,
    String companySize,
    String country,
    String phone
) {
}
