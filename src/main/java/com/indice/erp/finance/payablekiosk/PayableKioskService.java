package com.indice.erp.finance.payablekiosk;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.expenses.attachments.ExpenseAttachmentService;
import com.indice.erp.finance.expenses.attachments.dto.ExpenseAttachmentUploadRequest;
import com.indice.erp.finance.expenses.attachments.dto.RegisterExpenseAttachmentRequest;
import com.indice.erp.finance.payablekiosk.dto.PayableKioskPinRequest;
import com.indice.erp.finance.payablekiosk.dto.PayableKioskRequest;
import com.indice.erp.finance.payablekiosk.dto.PublicPayableRequest;
import com.indice.erp.finance.payablekiosk.dto.PublicProviderRegistrationRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.security.SecureRandom;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PayableKioskService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final PayableKioskRepository repository;
    private final PayableKioskPublicRepository publicRepository;
    private final ObjectMapper objectMapper;
    private final BCryptPasswordEncoder passwordEncoder;
    private final FinanceAccessService accessService;
    private final ExpenseAttachmentService attachmentService;

    public PayableKioskService(
            PayableKioskRepository repository,
            PayableKioskPublicRepository publicRepository,
            ObjectMapper objectMapper,
            BCryptPasswordEncoder passwordEncoder,
            FinanceAccessService accessService,
            ExpenseAttachmentService attachmentService) {
        this.repository = repository;
        this.publicRepository = publicRepository;
        this.objectMapper = objectMapper;
        this.passwordEncoder = passwordEncoder;
        this.accessService = accessService;
        this.attachmentService = attachmentService;
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
        var body = PayableKioskMapper.toMap(repository.getByToken(token));
        body.put("pin", pin);
        return Map.of("kiosk", body);
    }

    @Transactional
    public Map<String, Object> update(FinanceContext context, long kioskId, PayableKioskRequest request) {
        var existing = repository.getById(context.companyId(), kioskId);
        var normalizedRequest = withResolvedCode(context.companyId(), request, kioskId);
        validateScope(context, normalizedRequest.unitId(), normalizedRequest.businessId());
        repository.update(existing, context.userId(), normalizedRequest);
        return Map.of("kiosk", PayableKioskMapper.toMap(repository.getById(context.companyId(), kioskId)));
    }

    @Transactional
    public Map<String, Object> rotatePin(FinanceContext context, long kioskId) {
        repository.getById(context.companyId(), kioskId);
        var pin = newPin();
        repository.updatePin(context.companyId(), context.userId(), kioskId, passwordEncoder.encode(pin));
        var body = PayableKioskMapper.toMap(repository.getById(context.companyId(), kioskId));
        body.put("pin", pin);
        return Map.of("kiosk", body);
    }

    @Transactional
    public Map<String, Object> delete(FinanceContext context, long kioskId) {
        repository.getById(context.companyId(), kioskId);
        repository.softDelete(context.companyId(), context.userId(), kioskId);
        return Map.of("success", true);
    }

    public Map<String, Object> publicBootstrap(String token) {
        var kiosk = activeByToken(token);
        return Map.of("kiosk", PayableKioskMapper.toPublicMap(kiosk), "providers", publicRepository.publicProviders(kiosk), "csrfReady", true);
    }

    public Map<String, Object> publicAuthenticate(String token, PayableKioskPinRequest request) {
        var kiosk = activeByToken(token);
        if (!passwordEncoder.matches(request.pin().trim(), kiosk.pinHash())) {
            throw FinanceApiException.unauthorized("Invalid payable kiosk PIN.");
        }
        return Map.of("authorized", true, "kiosk", PayableKioskMapper.toPublicMap(kiosk), "providers", publicRepository.publicProviders(kiosk));
    }

    @Transactional
    public Map<String, Object> registerProvider(String token, PublicProviderRegistrationRequest request) {
        var kiosk = activeByToken(token);
        if (!kiosk.allowProviderRegistration()) {
            throw FinanceApiException.forbidden("Provider registration is disabled for this kiosk.");
        }
        var providerId = publicRepository.insertProvider(kiosk, request, toJson(Map.of("source", "payable-kiosk-registration", "kioskId", kiosk.id())));
        return Map.of("providerId", providerId, "status", "INACTIVE", "message", "Provider registration submitted.");
    }

    @Transactional
    public Map<String, Object> createPayable(String token, PublicPayableRequest request) {
        var kiosk = activeByToken(token);
        var providerId = request.providerId() == null ? kiosk.providerId() : request.providerId();
        validateProvider(kiosk, providerId);
        var expenseId = publicRepository.insertPayable(kiosk, providerId, request, payableCustomJson(request), payableMetadataJson(kiosk));
        return Map.of("expenseId", expenseId, "status", "PENDING_PAYMENT");
    }

    @Transactional
    public Object presignPayableAttachment(String token, long expenseId, ExpenseAttachmentUploadRequest request) {
        var kiosk = activeByToken(token);
        requireKioskPayable(kiosk, expenseId);
        return attachmentService.presignUpload(contextFor(kiosk), expenseId, request);
    }

    @Transactional
    public Object registerPayableAttachment(String token, long expenseId, RegisterExpenseAttachmentRequest request) {
        var kiosk = activeByToken(token);
        requireKioskPayable(kiosk, expenseId);
        return attachmentService.register(contextFor(kiosk), expenseId, request);
    }

    private PayableKioskRow activeByToken(String token) {
        var kiosk = repository.getByToken(token);
        if (!"ACTIVE".equals(kiosk.status())) {
            throw FinanceApiException.forbidden("Payable kiosk is inactive.");
        }
        return kiosk;
    }

    private void validateProvider(PayableKioskRow kiosk, Long providerId) {
        if (providerId != null && !publicRepository.providerAvailable(kiosk, providerId)) {
            throw new NoSuchElementException("Provider not available for this kiosk.");
        }
    }

    private void requireKioskPayable(PayableKioskRow kiosk, long expenseId) {
        if (!publicRepository.payableBelongsToKiosk(kiosk, expenseId)) {
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
        return new PayableKioskRequest(
                request.unitId(),
                request.businessId(),
                request.providerId(),
                code,
                request.name(),
                request.status(),
                request.accessType(),
                request.currencyCode(),
                request.allowProviderRegistration());
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

    private String toJson(Map<String, ?> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return "{}";
        }
    }
}
