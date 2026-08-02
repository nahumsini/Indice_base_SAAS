package com.indice.erp.configcenter;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.billing.seats.SeatCapacityExceededException;
import com.indice.erp.config.AppWebProperties;
import com.indice.erp.configcenter.ConfigCenterAccessService.ConfigCenterTab;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.location.GoogleMapsCoordinateExtractor;
import com.indice.erp.storage.ObjectStorageDisabledException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/v1/config-center")
public class ConfigCenterApiController {

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService sessionCsrfService;
    private final ConfigCenterAccessService accessService;
    private final ConfigCenterService configCenterService;
    private final GoogleMapsCoordinateExtractor googleMapsCoordinateExtractor;
    private final InvitationEmailService invitationEmailService;
    private final AppWebProperties appWebProperties;
    private final InvitationSeatCoordinator invitationSeatCoordinator;
    private final ConfigCenterUserSeatCoordinator userSeatCoordinator;

    public ConfigCenterApiController(
        SessionAuthService sessionAuthService,
        SessionCsrfService sessionCsrfService,
        ConfigCenterAccessService accessService,
        ConfigCenterService configCenterService,
        GoogleMapsCoordinateExtractor googleMapsCoordinateExtractor,
        InvitationEmailService invitationEmailService,
        AppWebProperties appWebProperties,
        InvitationSeatCoordinator invitationSeatCoordinator,
        ConfigCenterUserSeatCoordinator userSeatCoordinator
    ) {
        this.sessionAuthService = sessionAuthService;
        this.sessionCsrfService = sessionCsrfService;
        this.accessService = accessService;
        this.configCenterService = configCenterService;
        this.googleMapsCoordinateExtractor = googleMapsCoordinateExtractor;
        this.invitationEmailService = invitationEmailService;
        this.appWebProperties = appWebProperties;
        this.invitationSeatCoordinator = invitationSeatCoordinator;
        this.userSeatCoordinator = userSeatCoordinator;
    }

    @GetMapping("/current-user")
    public ResponseEntity<?> getCurrentUser(HttpSession session) {
        var current = sessionAuthService.currentUser(session);
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(messageBody("Unauthorized"));
        }

        return ResponseEntity.ok(configCenterService.getCurrentUser(current.get().userId(), current.get().role()));
    }

    @PutMapping("/current-user")
    public ResponseEntity<?> saveCurrentUser(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody Map<String, Object> payload
    ) {
        var current = sessionAuthService.currentUser(session);
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(messageBody("Unauthorized"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            var savedUser = configCenterService.saveCurrentUser(
                current.get().companyId(),
                current.get().userId(),
                current.get().role(),
                payload
            );
            var displayName = displayName(savedUser);
            if (!displayName.isBlank()) {
                session.setAttribute(SessionAuthService.SESSION_USER_NAME, displayName);
            }
            return ResponseEntity.ok(savedUser);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(messageBody(ex.getMessage()));
        }
    }

    @PostMapping("/current-user/avatar/presign-upload")
    public ResponseEntity<?> createCurrentUserAvatarUpload(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody Map<String, Object> payload
    ) {
        var current = sessionAuthService.currentUser(session);
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(messageBody("Unauthorized"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            return ResponseEntity.ok(configCenterService.createCurrentUserAvatarUpload(
                current.get().companyId(),
                current.get().userId(),
                payload
            ));
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(messageBody(ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(messageBody(ex.getMessage()));
        }
    }

    @GetMapping("/users")
    public ResponseEntity<?> getUsers(HttpSession session) {
        var current = sessionAuthService.currentUser(session);
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(messageBody("Unauthorized"));
        }
        if (!accessService.canAccess(current.get(), ConfigCenterTab.USERS)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody("Forbidden"));
        }

        return ResponseEntity.ok(configCenterService.getUsers(current.get()));
    }

    @PutMapping("/users/{userId}")
    public ResponseEntity<?> updateUser(
        HttpSession session,
        @PathVariable long userId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody Map<String, Object> payload
    ) {
        var current = sessionAuthService.currentUser(session);
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(messageBody("Unauthorized"));
        }
        if (!accessService.canAccess(current.get(), ConfigCenterTab.USERS)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody("Forbidden"));
        }
        if (!canMutateUsers(current.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody("Forbidden"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            return ResponseEntity.ok(configCenterService.updateUser(
                current.get().companyId(),
                current.get().userId(),
                current.get().role(),
                userId,
                payload
            ));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(messageBody(ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(messageBody(ex.getMessage()));
        }
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(
        HttpSession session,
        @PathVariable long userId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        var current = sessionAuthService.currentUser(session);
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(messageBody("Unauthorized"));
        }
        if (!accessService.canAccess(current.get(), ConfigCenterTab.USERS)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody("Forbidden"));
        }
        if (!canMutateUsers(current.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody("Forbidden"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            return ResponseEntity.ok(configCenterService.deleteUser(
                current.get().companyId(),
                current.get().userId(),
                current.get().role(),
                userId
            ));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(messageBody(ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(messageBody(ex.getMessage()));
        }
    }

    @PostMapping("/users/{userId}/activate")
    public ResponseEntity<?> activateUser(
        HttpSession session,
        @PathVariable long userId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        var current = sessionAuthService.currentUser(session);
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(messageBody("Unauthorized"));
        }
        if (!accessService.canAccess(current.get(), ConfigCenterTab.USERS) || !canMutateUsers(current.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody("Forbidden"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            return ResponseEntity.ok(userSeatCoordinator.activate(
                current.get().companyId(),
                current.get().userId(),
                current.get().role(),
                userId
            ));
        } catch (SeatCapacityExceededException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(seatCapacityBody(ex));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(messageBody(ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(messageBody(ex.getMessage()));
        }
    }

    @PostMapping("/users/invite")
    public ResponseEntity<?> inviteUser(
        HttpSession session,
        HttpServletRequest request,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody Map<String, Object> payload
    ) {
        var current = sessionAuthService.currentUser(session);
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(messageBody("Unauthorized"));
        }
        if (!accessService.canAccess(current.get(), ConfigCenterTab.USERS)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody("Forbidden"));
        }
        if (!canMutateUsers(current.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody("Forbidden"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            var result = invitationSeatCoordinator.invite(
                current.get().companyId(),
                current.get().userId(),
                current.get().role(),
                payload
            );
            var inviteLink = buildInviteLink(request, String.valueOf(result.get("token")));
            var emailResult = invitationEmailService.sendInvitation(
                String.valueOf(result.get("email")),
                String.valueOf(result.get("full_name")),
                inviteLink
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(invitationResponse(result, inviteLink, emailResult));
        } catch (SeatCapacityExceededException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(seatCapacityBody(ex));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(messageBody(ex.getMessage()));
        }
    }

    @DeleteMapping("/users/invitations/{invitationId}")
    public ResponseEntity<?> deleteInvitation(
        HttpSession session,
        @PathVariable long invitationId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken
    ) {
        var current = sessionAuthService.currentUser(session);
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(messageBody("Unauthorized"));
        }
        if (!accessService.canAccess(current.get(), ConfigCenterTab.USERS)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody("Forbidden"));
        }
        if (!canMutateUsers(current.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody("Forbidden"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            return ResponseEntity.ok(invitationSeatCoordinator.delete(
                current.get().companyId(),
                current.get().userId(),
                current.get().role(),
                invitationId
            ));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(messageBody(ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(messageBody(ex.getMessage()));
        }
    }

    @PostMapping("/users/invitations/{invitationId}/resend")
    public ResponseEntity<?> resendInvitation(
        HttpSession session,
        HttpServletRequest request,
        @PathVariable long invitationId,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody(required = false) Map<String, Object> payload
    ) {
        var current = sessionAuthService.currentUser(session);
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(messageBody("Unauthorized"));
        }
        if (!accessService.canAccess(current.get(), ConfigCenterTab.USERS)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody("Forbidden"));
        }
        if (!canMutateUsers(current.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody("Forbidden"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            var requestPayload = payload == null ? java.util.Collections.<String, Object>emptyMap() : payload;
            var result = invitationSeatCoordinator.resend(
                current.get().companyId(),
                current.get().userId(),
                current.get().role(),
                invitationId,
                requestPayload
            );
            var inviteLink = buildInviteLink(request, String.valueOf(result.get("token")));
            var emailResult = invitationEmailService.sendInvitation(
                String.valueOf(result.get("email")),
                String.valueOf(result.get("full_name")),
                inviteLink
            );
            return ResponseEntity.ok(invitationResponse(result, inviteLink, emailResult));
        } catch (SeatCapacityExceededException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(seatCapacityBody(ex));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(messageBody(ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(messageBody(ex.getMessage()));
        }
    }

    @GetMapping("/company")
    public ResponseEntity<?> getEmpresa(HttpSession session) {
        var current = sessionAuthService.currentUser(session);
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(messageBody("Unauthorized"));
        }
        if (!accessService.canAccessAny(
            current.get(),
            ConfigCenterTab.BUSINESS_STRUCTURE,
            ConfigCenterTab.BUSINESS_PROFILE
        )) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody("Forbidden"));
        }

        return ResponseEntity.ok(configCenterService.getEmpresa(current.get()));
    }

    @GetMapping("/config")
    public ResponseEntity<?> getConfig(HttpSession session) {
        var current = sessionAuthService.currentUser(session);
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(messageBody("Unauthorized"));
        }
        if (!accessService.canAccess(current.get(), ConfigCenterTab.BUSINESS_STRUCTURE)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody("Forbidden"));
        }

        return ResponseEntity.ok(configCenterService.getConfig(current.get()));
    }

    @PutMapping("/business-structure")
    public ResponseEntity<?> saveConfig(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody Map<String, Object> payload
    ) {
        var current = sessionAuthService.currentUser(session);
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(messageBody("Unauthorized"));
        }
        if (!accessService.canAccess(current.get(), ConfigCenterTab.BUSINESS_STRUCTURE)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody("Forbidden"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            return ResponseEntity.ok(configCenterService.saveStructure(current.get(), payload));
        } catch (HrAccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody(ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(messageBody(ex.getMessage()));
        }
    }

    @PostMapping("/locations/extract-coordinates")
    public ResponseEntity<?> extractCoordinates(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody Map<String, Object> payload
    ) {
        var current = sessionAuthService.currentUser(session);
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(messageBody("Unauthorized"));
        }
        if (!accessService.canAccess(current.get(), ConfigCenterTab.BUSINESS_STRUCTURE)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody("Forbidden"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            return ResponseEntity.ok(googleMapsCoordinateExtractor.extractCoordinatesFromMapLink(payload));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(messageBody(ex.getMessage()));
        }
    }

    @PutMapping("/company")
    public ResponseEntity<?> saveEmpresa(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody Map<String, Object> payload
    ) {
        var current = sessionAuthService.currentUser(session);
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(messageBody("Unauthorized"));
        }
        if (!accessService.canAccessAny(
            current.get(),
            ConfigCenterTab.BUSINESS_STRUCTURE,
            ConfigCenterTab.BUSINESS_PROFILE
        )) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody("Forbidden"));
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            var result = new LinkedHashMap<String, Object>();
            result.put("logo", null);
            result.put("data", configCenterService.saveEmpresa(current.get().companyId(), current.get().userId(), payload));
            result.put("message", "Company data saved");
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(messageBody(ex.getMessage()));
        }
    }

    private String buildInviteLink(HttpServletRequest request, String token) {
        var configuredBaseUrl = appWebProperties.resolveInvitationBaseUrl();
        if (!configuredBaseUrl.isBlank()) {
            return configuredBaseUrl + "/invite/" + token;
        }

        var browserBaseUrl = browserBaseUrl(request);
        if (!browserBaseUrl.isBlank()) {
            return browserBaseUrl + "/invite/" + token;
        }

        return ServletUriComponentsBuilder.fromCurrentContextPath()
            .path("/invite/")
            .path(token)
            .toUriString();
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

            var scheme = uri.getScheme().toLowerCase();
            if (!scheme.equals("http") && !scheme.equals("https")) {
                return "";
            }

            var port = uri.getPort();
            return scheme + "://" + uri.getHost() + (port >= 0 ? ":" + port : "");
        } catch (IllegalArgumentException ex) {
            return "";
        }
    }

    private boolean isAllowedOrigin(String origin) {
        var allowedOrigins = appWebProperties.getAllowedOrigins();
        if (allowedOrigins == null || allowedOrigins.isEmpty()) {
            return true;
        }

        return allowedOrigins.stream()
            .map(value -> value == null ? "" : value.trim().replaceAll("/+$", ""))
            .anyMatch(origin::equals);
    }

    private Map<String, Object> invitationResponse(
        Map<String, Object> result,
        String inviteLink,
        InvitationEmailResult emailResult
    ) {
        var response = new LinkedHashMap<String, Object>();
        response.put("email", result.get("email"));
        response.put("invite_link", inviteLink);
        response.put("email_sent", emailResult.sent());
        response.put("email_status", emailResult.status());
        response.put("email_message", emailResult.message());
        return response;
    }

    private Map<String, Object> messageBody(String message) {
        var body = new LinkedHashMap<String, Object>();
        body.put("message", message);
        return body;
    }

    private Map<String, Object> seatCapacityBody(SeatCapacityExceededException exception) {
        var body = new LinkedHashMap<String, Object>();
        body.put("message", exception.getMessage());
        body.put("code", "SEAT_CAPACITY_EXCEEDED");
        body.put("seats", Map.of(
            "limit", exception.snapshot().limit(),
            "active", exception.snapshot().active(),
            "reserved", exception.snapshot().reserved(),
            "available", exception.snapshot().available()
        ));
        return body;
    }

    private ResponseEntity<?> requireCsrf(HttpSession session, String csrfToken) {
        try {
            sessionCsrfService.requireCsrf(session, csrfToken);
            return null;
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(messageBody(ex.getMessage()));
        }
    }

    private boolean canMutateUsers(com.indice.erp.auth.AuthSessionUser currentUser) {
        var role = text(currentUser.role()).toLowerCase(java.util.Locale.ROOT);
        return role.equals("root")
            || role.equals("superadmin")
            || role.equals("super admin")
            || role.equals("admin")
            || role.equals("owner")
            || role.equals("manager");
    }

    private String displayName(Map<String, Object> user) {
        return String.join(
            " ",
            text(user.get("primer_nombre")),
            text(user.get("apellido_paterno"))
        ).trim();
    }

    private String text(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }
}
