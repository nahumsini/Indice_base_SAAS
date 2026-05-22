package com.indice.erp.auth.passwordreset;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.indice.erp.config.AppWebProperties;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/v1/auth/password-reset")
public class PasswordResetApiController {

    private final PasswordResetService passwordResetService;
    private final AppWebProperties appWebProperties;

    public PasswordResetApiController(
        PasswordResetService passwordResetService,
        AppWebProperties appWebProperties
    ) {
        this.passwordResetService = passwordResetService;
        this.appWebProperties = appWebProperties;
    }

    @PostMapping("/request")
    public ResponseEntity<?> requestReset(
        @RequestBody(required = false) PasswordResetRequest requestBody,
        HttpServletRequest request
    ) {
        var email = requestBody == null ? "" : requestBody.email();
        var result = passwordResetService.requestReset(
            email,
            resetBaseUrl(request),
            clientIp(request),
            request == null ? "" : request.getHeader("User-Agent")
        );

        return ResponseEntity.ok(messageBody(result.message()));
    }

    @GetMapping("/{token}")
    public ResponseEntity<?> validateResetToken(@PathVariable String token) {
        if (!passwordResetService.isTokenValid(token)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(messageBody(PasswordResetService.INVALID_RESET_LINK_MESSAGE));
        }

        return ResponseEntity.ok(Map.of("valid", true));
    }

    @PostMapping("/{token}/complete")
    public ResponseEntity<?> completeReset(
        @PathVariable String token,
        @RequestBody PasswordResetCompleteRequest request
    ) {
        try {
            passwordResetService.completeReset(
                token,
                request == null ? "" : request.password(),
                request == null ? "" : request.confirmPassword()
            );
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Password has been reset."
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(messageBody(ex.getMessage()));
        }
    }

    private String resetBaseUrl(HttpServletRequest request) {
        var configuredBaseUrl = appWebProperties.resolvePasswordResetBaseUrl();
        if (!configuredBaseUrl.isBlank()) {
            return configuredBaseUrl;
        }

        var browserBaseUrl = browserBaseUrl(request);
        if (!browserBaseUrl.isBlank()) {
            return browserBaseUrl;
        }

        return ServletUriComponentsBuilder.fromCurrentContextPath().toUriString();
    }

    private String browserBaseUrl(HttpServletRequest request) {
        if (request == null) {
            return "";
        }

        var origin = originFromHeader(request.getHeader("Origin"));
        if (!origin.isBlank() && isAllowedOrigin(origin)) {
            return origin;
        }

        var refererOrigin = originFromHeader(request.getHeader("Referer"));
        if (!refererOrigin.isBlank() && isAllowedOrigin(refererOrigin)) {
            return refererOrigin;
        }

        return "";
    }

    private String originFromHeader(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        try {
            var uri = URI.create(value.trim());
            if (uri.getScheme() == null || uri.getHost() == null) {
                return "";
            }

            var origin = uri.getScheme() + "://" + uri.getHost();
            if (uri.getPort() >= 0) {
                origin += ":" + uri.getPort();
            }
            return origin;
        } catch (IllegalArgumentException ex) {
            return "";
        }
    }

    private boolean isAllowedOrigin(String origin) {
        return appWebProperties.getAllowedOrigins().stream()
            .anyMatch(allowedOrigin -> allowedOrigin.equalsIgnoreCase(origin));
    }

    private String clientIp(HttpServletRequest request) {
        if (request == null) {
            return "";
        }

        var forwardedFor = firstForwardedIp(request.getHeader("X-Forwarded-For"));
        if (!forwardedFor.isBlank()) {
            return forwardedFor;
        }

        var realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        return request.getRemoteAddr() == null ? "" : request.getRemoteAddr();
    }

    private String firstForwardedIp(String forwardedFor) {
        if (forwardedFor == null || forwardedFor.isBlank()) {
            return "";
        }

        var commaIndex = forwardedFor.indexOf(',');
        var firstIp = commaIndex >= 0 ? forwardedFor.substring(0, commaIndex) : forwardedFor;
        return firstIp.trim();
    }

    private Map<String, Object> messageBody(String message) {
        var body = new LinkedHashMap<String, Object>();
        body.put("message", message);
        return body;
    }

    public record PasswordResetRequest(String email) {
    }

    public record PasswordResetCompleteRequest(
        String password,
        @JsonProperty("confirm_password") String confirmPassword
    ) {
    }
}
