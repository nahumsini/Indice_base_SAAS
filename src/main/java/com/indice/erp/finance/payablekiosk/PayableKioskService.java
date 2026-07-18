package com.indice.erp.finance.payablekiosk;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.expenses.attachments.ExpenseAttachmentService;
import com.indice.erp.finance.expenses.attachments.dto.ExpenseAttachmentUploadRequest;
import com.indice.erp.finance.expenses.attachments.dto.RegisterExpenseAttachmentRequest;
import com.indice.erp.finance.payablekiosk.dto.PayableKioskPinRequest;
import com.indice.erp.finance.payablekiosk.dto.PayableKioskRequest;
import com.indice.erp.finance.payablekiosk.dto.PayableKioskProviderAccessRequest;
import com.indice.erp.finance.payablekiosk.dto.PublicPayableRequest;
import com.indice.erp.finance.payablekiosk.dto.PublicProviderRegistrationRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskGrantService;
import com.indice.erp.kiosk.engine.KioskIdentityCredentialService;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import jakarta.servlet.http.HttpSession;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PayableKioskService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Set<String> SUPPORTED_CURRENCIES = Set.of("MXN", "CAD", "USD", "COP", "BRL");

    private final PayableKioskRepository repository;
    private final PayableKioskPublicRepository publicRepository;
    private final ObjectMapper objectMapper;
    private final BCryptPasswordEncoder passwordEncoder;
    private final FinanceAccessService accessService;
    private final ExpenseAttachmentService attachmentService;
    private final PayableKioskProviderAccessRepository providerAccessRepository;
    private final PublicPayableKioskSession publicSession;
    private final KioskRegistryService kioskRegistry;
    private final KioskGrantService kioskGrants;
    private final KioskIdentityCredentialService kioskCredentials;

    public PayableKioskService(
            PayableKioskRepository repository,
            PayableKioskPublicRepository publicRepository,
            ObjectMapper objectMapper,
            BCryptPasswordEncoder passwordEncoder,
            FinanceAccessService accessService,
            ExpenseAttachmentService attachmentService,
            PayableKioskProviderAccessRepository providerAccessRepository,
            PublicPayableKioskSession publicSession,
            KioskRegistryService kioskRegistry,
            KioskGrantService kioskGrants,
            KioskIdentityCredentialService kioskCredentials) {
        this.repository = repository;
        this.publicRepository = publicRepository;
        this.objectMapper = objectMapper;
        this.passwordEncoder = passwordEncoder;
        this.accessService = accessService;
        this.attachmentService = attachmentService;
        this.providerAccessRepository = providerAccessRepository;
        this.publicSession = publicSession;
        this.kioskRegistry = kioskRegistry;
        this.kioskGrants = kioskGrants;
        this.kioskCredentials = kioskCredentials;
    }

    public Map<String, Object> list(FinanceContext context) {
        return Map.of("items", repository.list(context.companyId()).stream().map(PayableKioskMapper::toMap).toList());
    }

    @Transactional
    public Map<String, Object> create(FinanceContext context, PayableKioskRequest request) {
        var normalizedRequest = withResolvedCode(context.companyId(), request, null);
        validateScope(context, normalizedRequest.unitId(), normalizedRequest.businessId());
        var token = uniqueToken();
        var pin = newPin();
        repository.insert(context.companyId(), context.userId(), normalizedRequest, token, passwordEncoder.encode(pin),
                toJson(Map.of("source", "finance-payable-kiosk")));
        var saved = repository.getByToken(token);
        synchronizeDefinition(saved, context.userId());
        var body = PayableKioskMapper.toMap(saved);
        return Map.of("kiosk", body);
    }

    @Transactional
    public Map<String, Object> update(FinanceContext context, long kioskId, PayableKioskRequest request) {
        var existing = repository.getById(context.companyId(), kioskId);
        var candidate = withResolvedCode(context.companyId(), request, kioskId);
        var normalizedRequest = new PayableKioskRequest(
            candidate.unitId(), candidate.businessId(), candidate.providerId(), candidate.code(),
            candidate.name(), existing.status(), candidate.accessType(), candidate.currencyCode(),
            candidate.allowProviderRegistration());
        validateScope(context, normalizedRequest.unitId(), normalizedRequest.businessId());
        repository.update(existing, context.userId(), normalizedRequest);
        var saved = repository.getById(context.companyId(), kioskId);
        synchronizeDefinition(saved, context.userId());
        return Map.of("kiosk", PayableKioskMapper.toMap(saved));
    }

    @Transactional
    public Map<String, Object> delete(FinanceContext context, long kioskId) {
        repository.getById(context.companyId(), kioskId);
        kioskRegistry.deleteDefinition(
            context.companyId(), PayableKioskCapabilities.OWNER_MODULE, kioskId,
            context.userId(), "Deleted from Expenses administration");
        repository.softDelete(context.companyId(), context.userId(), kioskId);
        return Map.of("success", true);
    }

    @Transactional
    public Map<String, Object> rotatePublicToken(FinanceContext context, long kioskId) {
        var kiosk = repository.getById(context.companyId(), kioskId);
        validateScope(context, kiosk.unitId(), kiosk.businessId());
        synchronizeDefinition(kiosk, context.userId());
        var token = uniqueToken();
        repository.updatePublicToken(context.companyId(), context.userId(), kioskId, token);
        kioskRegistry.replacePublicToken(
            context.companyId(), PayableKioskCapabilities.OWNER_MODULE,
            kioskId, token, context.userId());
        return Map.of("kiosk", PayableKioskMapper.toMap(
            repository.getById(context.companyId(), kioskId)));
    }

    @Transactional
    public Map<String, Object> transition(
            FinanceContext context,
            long kioskId,
            KioskDefinitionStatus target,
            String reason) {
        var kiosk = repository.getById(context.companyId(), kioskId);
        validateScope(context, kiosk.unitId(), kiosk.businessId());
        synchronizeDefinition(kiosk, context.userId());
        kioskRegistry.transition(
            context.companyId(), PayableKioskCapabilities.OWNER_MODULE, kioskId,
            target, context.userId(), reason);
        repository.updateStatus(
            context.companyId(), context.userId(), kioskId,
            target == KioskDefinitionStatus.ACTIVE ? "ACTIVE" : "INACTIVE");
        return Map.of("kiosk", PayableKioskMapper.toMap(
            repository.getById(context.companyId(), kioskId)), "engineStatus", target.name());
    }

    public Map<String, Object> publicBootstrap(String token) {
        var kiosk = activeByToken(token);
        return Map.of("kiosk", PayableKioskMapper.toPublicMap(kiosk), "csrfReady", true);
    }

    public Map<String, Object> publicAuthenticate(HttpSession session, String token, PayableKioskPinRequest request) {
        publicSession.requireAttemptAllowed(session);
        try {
            var verified = authenticateProvider(token, request.pin());
            publicSession.authorize(session, verified.access(), verified.sessionToken());
            return verified.response();
        } catch (FinanceApiException failure) {
            publicSession.registerFailure(session);
            throw failure;
        }
    }

    public Map<String, Object> publicAuthenticateCanonical(String token, Map<String, Object> payload) {
        var pin = stringValue(payload, "credential_payload", "pin", "credential");
        return authenticateProvider(token, pin).response();
    }

    void rememberLegacyAuthorization(
            HttpSession session, String token, Map<String, Object> authenticationResponse) {
        var kiosk = activeByToken(token);
        var providerValue = authenticationResponse.get("provider");
        var providerId = providerValue instanceof Map<?, ?> provider
            ? longValue(provider.get("id")) : 0L;
        var access = providerAccessRepository.activeForKiosk(kiosk.id()).stream()
            .filter(candidate -> candidate.providerId() == providerId)
            .findFirst()
            .orElseThrow(() -> FinanceApiException.unauthorized("Provider kiosk access is no longer active."));
        var sessionToken = stringValue(
            authenticationResponse, "kiosk_session_token", "identification_token");
        publicSession.authorize(session, access, sessionToken);
    }

    Map<String, Object> withLegacySession(
            HttpSession session, String token, Map<String, Object> payload) {
        var kiosk = activeByToken(token);
        var authorization = publicSession.require(session, kiosk.id());
        var result = new LinkedHashMap<String, Object>();
        if (payload != null) {
            result.putAll(payload);
        }
        result.put("identification_token", authorization.kioskSessionToken());
        return result;
    }

    @Transactional
    public Map<String, Object> registerProvider(String token, PublicProviderRegistrationRequest request) {
        var kiosk = activeByToken(token);
        if (!kiosk.allowProviderRegistration()) {
            throw FinanceApiException.forbidden("Provider registration is disabled for this kiosk.");
        }
        if (publicRepository.providerRegistrationExists(kiosk, request)) {
            throw FinanceApiException.conflict("A provider with this tax ID or email is already registered.");
        }
        var providerId = publicRepository.insertProvider(kiosk, request, toJson(Map.of("source", "payable-kiosk-registration", "kioskId", kiosk.id())));
        return Map.of("providerId", providerId, "status", "INACTIVE", "message", "Provider registration submitted.");
    }

    @Transactional
    public Map<String, Object> createPayable(HttpSession session, String token, PublicPayableRequest request) {
        var kiosk = activeByToken(token);
        var access = requireProviderAccess(session, kiosk);
        return createPayableForProvider(token, access.providerId(), request);
    }

    @Transactional
    public Map<String, Object> createPayableForProvider(
            String token, long providerId, PublicPayableRequest request) {
        var kiosk = activeByToken(token);
        requireActiveProviderGrant(kiosk, providerId);
        var expenseId = publicRepository.insertPayable(
            kiosk, providerId, request, payableCustomJson(request), payableMetadataJson(kiosk));
        return Map.of("expenseId", expenseId, "status", "DRAFT", "reviewRequired", true);
    }

    @Transactional
    public Object presignPayableAttachment(HttpSession session, String token, long expenseId, ExpenseAttachmentUploadRequest request) {
        var kiosk = activeByToken(token);
        var access = requireProviderAccess(session, kiosk);
        return presignPayableAttachmentForProvider(token, access.providerId(), expenseId, request);
    }

    public Object presignPayableAttachmentForProvider(
            String token, long providerId, long expenseId, ExpenseAttachmentUploadRequest request) {
        var kiosk = activeByToken(token);
        requireActiveProviderGrant(kiosk, providerId);
        requireProviderPayable(kiosk, providerId, expenseId);
        return attachmentService.presignUpload(contextFor(kiosk), expenseId, request);
    }

    @Transactional
    public Object registerPayableAttachment(HttpSession session, String token, long expenseId, RegisterExpenseAttachmentRequest request) {
        var kiosk = activeByToken(token);
        var access = requireProviderAccess(session, kiosk);
        return registerPayableAttachmentForProvider(token, access.providerId(), expenseId, request);
    }

    public Object registerPayableAttachmentForProvider(
            String token, long providerId, long expenseId, RegisterExpenseAttachmentRequest request) {
        var kiosk = activeByToken(token);
        requireActiveProviderGrant(kiosk, providerId);
        requireProviderPayable(kiosk, providerId, expenseId);
        return attachmentService.register(contextFor(kiosk), expenseId, request);
    }

    public Map<String, Object> listProviderAccesses(FinanceContext context) {
        var items = providerAccessRepository.list(context.companyId()).stream()
                .filter(access -> {
                    var kiosk = repository.getById(context.companyId(), access.kioskId());
                    return accessService.containsAssignment(context, kiosk.unitId(), kiosk.businessId());
                })
                .map(this::providerAccessMap)
                .toList();
        return Map.of("items", items);
    }

    @Transactional
    public Map<String, Object> issueProviderAccess(FinanceContext context, PayableKioskProviderAccessRequest request) {
        var kiosk = repository.getById(context.companyId(), request.kioskId());
        validateScope(context, kiosk.unitId(), kiosk.businessId());
        if (!"ACTIVE".equals(kiosk.status())) {
            throw FinanceApiException.badRequest("The selected kiosk is inactive.");
        }
        if (!providerAccessRepository.providerIsActive(context.companyId(), request.providerId())) {
            throw FinanceApiException.badRequest("Activate the provider before generating a PIN.");
        }
        if (!publicRepository.providerAvailable(kiosk, request.providerId())) {
            throw FinanceApiException.badRequest("The provider is outside the kiosk scope.");
        }
        var pin = newProviderPin(kiosk.id());
        var pinHash = passwordEncoder.encode(pin);
        var saved = providerAccessRepository.issue(
                context.companyId(), context.userId(), kiosk.id(), request.providerId(), pinHash);
        providerAccessRepository.synchronizePersonalPin(
            context.companyId(), request.providerId(), context.userId(), pinHash);
        kioskCredentials.rotatePersonalPin(context.companyId(), "PROVIDER", request.providerId(), pinHash);
        var definition = synchronizeDefinition(kiosk, context.userId());
        kioskGrants.grant(definition, "PROVIDER", request.providerId(), "*", context.userId());
        var body = providerAccessMap(saved);
        body.put("pin", pin);
        return Map.of("access", body);
    }

    @Transactional
    public Map<String, Object> rotateProviderPin(FinanceContext context, long accessId) {
        var existing = providerAccessRepository.get(context.companyId(), accessId);
        var kiosk = repository.getById(context.companyId(), existing.kioskId());
        validateScope(context, kiosk.unitId(), kiosk.businessId());
        var pin = newProviderPin(kiosk.id());
        var pinHash = passwordEncoder.encode(pin);
        providerAccessRepository.rotate(context.companyId(), context.userId(), accessId, pinHash);
        providerAccessRepository.synchronizePersonalPin(
            context.companyId(), existing.providerId(), context.userId(), pinHash);
        kioskCredentials.rotatePersonalPin(context.companyId(), "PROVIDER", existing.providerId(), pinHash);
        var body = providerAccessMap(providerAccessRepository.get(context.companyId(), accessId));
        body.put("pin", pin);
        return Map.of("access", body);
    }

    @Transactional
    public Map<String, Object> revokeProviderAccess(FinanceContext context, long accessId) {
        var existing = providerAccessRepository.get(context.companyId(), accessId);
        var kiosk = repository.getById(context.companyId(), existing.kioskId());
        validateScope(context, kiosk.unitId(), kiosk.businessId());
        providerAccessRepository.revoke(context.companyId(), context.userId(), accessId);
        var definition = synchronizeDefinition(kiosk, context.userId());
        kioskGrants.revokeIdentity(definition, "PROVIDER", existing.providerId(), context.userId());
        kioskCredentials.revokeIfUnreferenced(
            context.companyId(), "PROVIDER", existing.providerId(),
            providerAccessRepository.hasActiveAccess(context.companyId(), existing.providerId()));
        return Map.of("success", true);
    }

    private PayableKioskRow activeByToken(String token) {
        var kiosk = repository.getByToken(token);
        if (!"ACTIVE".equals(kiosk.status())) {
            throw FinanceApiException.forbidden("Payable kiosk is inactive.");
        }
        return kiosk;
    }

    private PayableKioskProviderAccessRow requireProviderAccess(HttpSession session, PayableKioskRow kiosk) {
        var authorization = publicSession.require(session, kiosk.id());
        return providerAccessRepository.activeById(authorization.accessId(), kiosk.id());
    }

    private void requireActiveProviderGrant(PayableKioskRow kiosk, long providerId) {
        var allowed = providerAccessRepository.activeForKiosk(kiosk.id()).stream()
            .anyMatch(access -> access.providerId() == providerId);
        if (!allowed) {
            throw FinanceApiException.unauthorized("Provider kiosk access is no longer active.");
        }
    }

    private VerifiedProvider authenticateProvider(String token, String rawPin) {
        var kiosk = activeByToken(token);
        var pin = rawPin == null ? "" : rawPin.trim();
        if (pin.isBlank()) {
            throw FinanceApiException.unauthorized("Invalid provider PIN.");
        }
        for (var access : providerAccessRepository.activeForKiosk(kiosk.id())) {
            var credential = kioskCredentials.pinCredential(
                kiosk.companyId(), "PROVIDER", access.providerId()).orElse(null);
            var matchesPersonal = credential != null
                && credential.secretHash() != null
                && passwordEncoder.matches(pin, credential.secretHash());
            var matchesLegacy = passwordEncoder.matches(pin, access.pinHash());
            if ((access.lockedUntil() == null || access.lockedUntil().isBefore(Instant.now()))
                    && acceptsCredential(credential, matchesPersonal, matchesLegacy)) {
                providerAccessRepository.markUsed(access.id());
                var sessionToken = UUID.randomUUID().toString().replace("-", "")
                    + Long.toHexString(Math.abs(SECURE_RANDOM.nextLong()));
                var expiresAt = Instant.now().plus(8, ChronoUnit.HOURS);
                var body = new LinkedHashMap<String, Object>();
                body.put("authorized", true);
                body.put("kiosk", PayableKioskMapper.toPublicMap(kiosk));
                body.put("provider", providerMap(access));
                body.put("identification_token", sessionToken);
                body.put("expires_at", expiresAt.toString());
                body.put("engine_identity", Map.of(
                    "type", "PROVIDER", "id", access.providerId(), "verified_factors", Set.of("PIN")));
                return new VerifiedProvider(access, sessionToken, body);
            }
        }
        throw FinanceApiException.unauthorized("Invalid provider PIN.");
    }

    static boolean acceptsCredential(
            KioskIdentityCredentialService.PersonalPinCredential credential,
            boolean matchesPersonal,
            boolean matchesLegacy) {
        if (credential == null) {
            return matchesLegacy;
        }
        if (!"ACTIVE".equalsIgnoreCase(credential.status())) {
            return false;
        }
        if ("LEGACY_MIGRATION".equalsIgnoreCase(credential.origin())) {
            // During migration each legacy link keeps its own BCrypt hash. Once an
            // administrator performs a personal rotation, only the central hash is valid.
            return matchesLegacy;
        }
        return matchesPersonal;
    }

    private com.indice.erp.kiosk.engine.KioskResolvedDefinition synchronizeDefinition(
            PayableKioskRow kiosk, long actorId) {
        var definition = kioskRegistry.registerLegacyDefinition(
            kiosk.companyId(), PayableKioskCapabilities.OWNER_MODULE,
            PayableKioskCapabilities.KIOSK_TYPE,
            kiosk.id(), kiosk.code(), kiosk.name(), kiosk.status(), kiosk.unitId(), kiosk.businessId(),
            null, kiosk.publicAccessToken(), true, KioskAccessLevel.CONTROLLED,
            "expenses", "es-MX", actorId);
        kioskRegistry.synchronizeCapabilities(definition, PayableKioskCapabilities.descriptors());
        return definition;
    }

    private void requireProviderPayable(PayableKioskRow kiosk, long providerId, long expenseId) {
        if (!publicRepository.payableBelongsToProvider(kiosk, providerId, expenseId)) {
            throw new NoSuchElementException("Payable not available for this kiosk.");
        }
    }

    private void validateScope(FinanceContext context, Long unitId, Long businessId) {
        if (!accessService.containsAssignment(context, unitId, businessId)) {
            throw FinanceApiException.forbidden("Selected payable kiosk scope is outside your assignment.");
        }
    }

    private PayableKioskRequest withResolvedCode(long companyId, PayableKioskRequest request, Long excludedId) {
        var baseCode = PayableKioskRules.normalizeCode(request.code());
        if (baseCode.isBlank()) {
            baseCode = PayableKioskRules.codeFromName(request.name());
        }
        var code = baseCode;
        var suffix = 2;
        while (repository.codeExists(companyId, code, excludedId)) {
            code = baseCode + "-" + suffix;
            suffix++;
        }
        var currencyCode = PayableKioskRules.normalizeCurrency(request.currencyCode());
        if (!SUPPORTED_CURRENCIES.contains(currencyCode)) {
            throw FinanceApiException.badRequest("Unsupported payable kiosk currency.");
        }
        return new PayableKioskRequest(
                request.unitId(),
                request.businessId(),
                null,
                code,
                request.name(),
                "ACTIVE",
                "PROVIDER",
                currencyCode,
                true);
    }

    private String uniqueToken() {
        String token;
        do {
            token = UUID.randomUUID().toString().replace("-", "") + Long.toHexString(Math.abs(SECURE_RANDOM.nextLong()));
        } while (repository.tokenExists(token));
        return token;
    }

    private String newPin() {
        return String.valueOf(100000 + SECURE_RANDOM.nextInt(900000));
    }

    private String newProviderPin(long kioskId) {
        var existing = providerAccessRepository.activeForKiosk(kioskId);
        for (var attempt = 0; attempt < 20; attempt++) {
            var candidate = newPin();
            var collision = existing.stream().anyMatch(access -> passwordEncoder.matches(candidate, access.pinHash()));
            if (!collision) {
                return candidate;
            }
        }
        throw FinanceApiException.conflict("A unique provider PIN could not be generated. Try again.");
    }

    private FinanceContext contextFor(PayableKioskRow kiosk) {
        return new FinanceContext(null, kiosk.companyId(), "Payable kiosk", "PUBLIC_KIOSK", true, scopeFor(kiosk));
    }

    private FinanceScope scopeFor(PayableKioskRow kiosk) {
        if (kiosk.businessId() != null) {
            return FinanceScope.businessOffice(kiosk.unitId(), kiosk.businessId());
        }
        return kiosk.unitId() == null ? FinanceScope.corporateOffice() : FinanceScope.unitHeadquarters(kiosk.unitId());
    }

    private String payableCustomJson(PublicPayableRequest request) {
        var fields = new LinkedHashMap<String, Object>();
        fields.put("entryType", "payable");
        fields.put("legacyStatus", "pending");
        fields.put("externalReference", PayableKioskRules.blankToNull(request.externalReference()));
        return toJson(fields);
    }

    private String payableMetadataJson(PayableKioskRow kiosk) {
        return toJson(Map.of("source", "payable-kiosk", "kioskId", kiosk.id()));
    }

    private Map<String, Object> providerMap(PayableKioskProviderAccessRow access) {
        var map = new LinkedHashMap<String, Object>();
        map.put("id", access.providerId());
        map.put("name", access.providerName());
        return map;
    }

    private LinkedHashMap<String, Object> providerAccessMap(PayableKioskProviderAccessRow access) {
        var map = new LinkedHashMap<String, Object>();
        map.put("id", access.id());
        map.put("kioskId", access.kioskId());
        map.put("kioskName", access.kioskName());
        map.put("providerId", access.providerId());
        map.put("providerName", access.providerName());
        map.put("publicAccessToken", access.publicAccessToken());
        map.put("status", access.status());
        return map;
    }

    private String toJson(Map<String, ?> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return "{}";
        }
    }

    private String stringValue(Map<String, Object> payload, String... keys) {
        if (payload != null) {
            for (var key : keys) {
                var value = payload.get(key);
                if (value != null && !String.valueOf(value).isBlank()) {
                    return String.valueOf(value).trim();
                }
            }
        }
        return "";
    }

    private long longValue(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return value == null ? 0L : Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return 0L;
        }
    }

    private record VerifiedProvider(
            PayableKioskProviderAccessRow access,
            String sessionToken,
            Map<String, Object> response) {
    }
}
