package com.indice.erp.config;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.web")
public class AppWebProperties {

    private List<String> allowedOrigins = new ArrayList<>(List.of(
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ));
    private String publicUrl = "";
    private String invitationBaseUrl = "";
    private String passwordResetBaseUrl = "";

    public List<String> getAllowedOrigins() {
        return allowedOrigins;
    }

    public void setAllowedOrigins(List<String> allowedOrigins) {
        if (allowedOrigins == null) {
            this.allowedOrigins = new ArrayList<>();
            return;
        }

        this.allowedOrigins = allowedOrigins.stream()
            .map(value -> value == null ? "" : value.trim())
            .filter(value -> !value.isBlank())
            .collect(Collectors.toCollection(ArrayList::new));
    }

    public String getPublicUrl() {
        return publicUrl;
    }

    public void setPublicUrl(String publicUrl) {
        this.publicUrl = normalizeBaseUrl(publicUrl);
    }

    public String getInvitationBaseUrl() {
        return invitationBaseUrl;
    }

    public void setInvitationBaseUrl(String invitationBaseUrl) {
        this.invitationBaseUrl = normalizeBaseUrl(invitationBaseUrl);
    }

    public String resolveInvitationBaseUrl() {
        return invitationBaseUrl.isBlank() ? publicUrl : invitationBaseUrl;
    }

    public String getPasswordResetBaseUrl() {
        return passwordResetBaseUrl;
    }

    public void setPasswordResetBaseUrl(String passwordResetBaseUrl) {
        this.passwordResetBaseUrl = normalizeBaseUrl(passwordResetBaseUrl);
    }

    public String resolvePasswordResetBaseUrl() {
        return passwordResetBaseUrl.isBlank() ? publicUrl : passwordResetBaseUrl;
    }

    private String normalizeBaseUrl(String value) {
        if (value == null) {
            return "";
        }

        return value.trim().replaceAll("/+$", "");
    }
}
