package com.indice.erp.face;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.hr.face")
public class FaceVerificationProperties {

    private boolean enabled;
    private String serviceBaseUrl = "http://127.0.0.1:8091";
    private int sessionExpirySeconds = 600;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getServiceBaseUrl() {
        return serviceBaseUrl;
    }

    public void setServiceBaseUrl(String serviceBaseUrl) {
        this.serviceBaseUrl = serviceBaseUrl;
    }

    public int getSessionExpirySeconds() {
        return sessionExpirySeconds;
    }

    public void setSessionExpirySeconds(int sessionExpirySeconds) {
        this.sessionExpirySeconds = sessionExpirySeconds;
    }
}
