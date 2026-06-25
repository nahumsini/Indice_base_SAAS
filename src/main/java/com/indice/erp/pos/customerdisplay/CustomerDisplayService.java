package com.indice.erp.pos.customerdisplay;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.cashregister.CashRegisterRepository;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayPairRequest;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayPairResponse;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayPairingCodeRequest;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayPairingCodeResponse;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayItemPayload;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayPaymentPayload;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplaySnapshotRequest;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayStateResponse;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.status.ShiftStatus;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerDisplayService {

    private static final String PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int PAIRING_CODE_LENGTH = 6;
    private static final Set<String> SNAPSHOT_STATUSES = Set.of("IDLE", "ACTIVE", "READY_TO_PAY", "PAID", "CLOSED");
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final CustomerDisplayRepository repository;
    private final CashRegisterRepository cashRegisterRepository;
    private final ShiftRepository shiftRepository;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Clock clock;

    @Autowired
    public CustomerDisplayService(
            CustomerDisplayRepository repository,
            CashRegisterRepository cashRegisterRepository,
            ShiftRepository shiftRepository) {
        this(repository, cashRegisterRepository, shiftRepository, Clock.systemUTC());
    }

    CustomerDisplayService(
            CustomerDisplayRepository repository,
            CashRegisterRepository cashRegisterRepository,
            ShiftRepository shiftRepository,
            Clock clock) {
        this.repository = repository;
        this.cashRegisterRepository = cashRegisterRepository;
        this.shiftRepository = shiftRepository;
        this.clock = clock;
    }

    @Transactional
    public CustomerDisplayPairingCodeResponse createPairingCode(PosContext context, CustomerDisplayPairingCodeRequest request) {
        var register = cashRegisterRepository.findById(context, request.cashRegisterId())
            .orElseThrow(() -> PosApiException.notFound("Cash register not found."));
        var pairingCode = generateUniquePairingCode();
        var expiresAt = clock.instant().plus(15, ChronoUnit.MINUTES);
        var name = displayName(request.deviceName(), register);
        var existing = repository.findLatestDeviceForRegister(context.companyId(), register.id());
        var device = existing
            .map(current -> repository.updatePairingCode(context.companyId(), current.id(), pairingCode, expiresAt, name, context.userId()))
            .orElseGet(() -> repository.insertDevice(
                context.companyId(),
                register.unitId(),
                register.businessId(),
                register.warehouseId(),
                register.id(),
                generateUniqueToken(),
                pairingCode,
                expiresAt,
                name,
                context.userId()
            ));
        return toPairingCodeResponse(device);
    }

    @Transactional
    public CustomerDisplayPairResponse pair(CustomerDisplayPairRequest request) {
        var code = normalizePairingCode(request.pairingCode());
        var device = repository.findPairableDeviceByCode(code)
            .orElseThrow(() -> PosApiException.notFound("Pairing code expired or not found."));
        var paired = repository.activatePairing(device, displayName(request.deviceName(), device));
        return new CustomerDisplayPairResponse(
            paired.deviceToken(),
            displayUrl(paired.deviceToken()),
            paired.cashRegisterId(),
            paired.cashRegisterCode(),
            paired.cashRegisterName()
        );
    }

    @Transactional
    public CustomerDisplayStateResponse publishSnapshot(PosContext context, CustomerDisplaySnapshotRequest request) {
        var register = cashRegisterRepository.findById(context, request.cashRegisterId())
            .orElseThrow(() -> PosApiException.notFound("Cash register not found."));
        var shift = shiftRepository.findById(context, request.shiftId())
            .orElseThrow(() -> PosApiException.notFound("Shift not found."));
        if (!shift.cashRegisterId().equals(register.id())) {
            throw PosApiException.badRequest("Shift does not belong to this cash register.");
        }
        if (shift.status() != ShiftStatus.OPEN && shift.status() != ShiftStatus.CLOSING) {
            throw PosApiException.badRequest("Customer display can only publish an open shift.");
        }
        var status = normalizeSnapshotStatus(request.status());
        List<CustomerDisplayItemPayload> items = request.items() == null ? List.of() : request.items();
        List<CustomerDisplayPaymentPayload> payments = request.payments() == null ? List.of() : request.payments();
        var snapshot = new CustomerDisplaySnapshotRecord(
            null,
            context.companyId(),
            shift.unitId(),
            shift.businessId(),
            shift.warehouseId(),
            register.id(),
            shift.id(),
            status,
            normalizeCurrency(request.currencyCode()),
            items.stream()
                .map(item -> positive(item.quantity()).intValue())
                .reduce(0, Integer::sum),
            positive(request.subtotalAmount()),
            positive(request.discountAmount()),
            positive(request.taxAmount()),
            positive(request.totalAmount()),
            positive(request.paidAmount()),
            positive(request.changeAmount()),
            positive(request.balanceAmount()),
            trimToNull(request.ticketNumber()),
            trimToNull(request.customerMessage()),
            PosJsonSupport.toJson(items),
            PosJsonSupport.toJson(payments),
            null,
            null
        );
        repository.upsertSnapshot(snapshot, context.userId());
        var latest = repository.findLatestSnapshot(context.companyId(), register.id()).orElse(snapshot);
        return toStateResponse(null, register.code(), register.name(), latest, true);
    }

    @Transactional
    public CustomerDisplayStateResponse publicState(String deviceToken) {
        var token = normalizeToken(deviceToken);
        var device = repository.findActiveDeviceByToken(token)
            .orElseThrow(() -> PosApiException.notFound("Customer display not found."));
        repository.touchDevice(device.id());
        return repository.findLatestSnapshot(device.companyId(), device.cashRegisterId())
            .map(snapshot -> toStateResponse(device, snapshot, true))
            .orElseGet(() -> emptyState(device));
    }

    private CustomerDisplayStateResponse emptyState(CustomerDisplayDeviceRecord device) {
        return new CustomerDisplayStateResponse(
            device.deviceToken(),
            device.cashRegisterId(),
            device.cashRegisterCode(),
            device.cashRegisterName(),
            "IDLE",
            "MXN",
            0,
            ZERO,
            ZERO,
            ZERO,
            ZERO,
            ZERO,
            ZERO,
            ZERO,
            null,
            "Caja lista",
            PosJsonSupport.toJsonNode("[]"),
            PosJsonSupport.toJsonNode("[]"),
            device.lastSeenAt(),
            true
        );
    }

    private CustomerDisplayStateResponse toStateResponse(
            CustomerDisplayDeviceRecord device,
            CustomerDisplaySnapshotRecord snapshot,
            boolean connected) {
        return new CustomerDisplayStateResponse(
            device.deviceToken(),
            device.cashRegisterId(),
            device.cashRegisterCode(),
            device.cashRegisterName(),
            snapshot.status(),
            snapshot.currencyCode(),
            snapshot.itemCount(),
            snapshot.subtotalAmount(),
            snapshot.discountAmount(),
            snapshot.taxAmount(),
            snapshot.totalAmount(),
            snapshot.paidAmount(),
            snapshot.changeAmount(),
            snapshot.balanceAmount(),
            snapshot.ticketNumber(),
            snapshot.customerMessage(),
            PosJsonSupport.toJsonNode(snapshot.itemsJson()),
            PosJsonSupport.toJsonNode(snapshot.paymentsJson()),
            snapshot.updatedAt(),
            connected
        );
    }

    private CustomerDisplayStateResponse toStateResponse(
            CustomerDisplayDeviceRecord device,
            String cashRegisterCode,
            String cashRegisterName,
            CustomerDisplaySnapshotRecord snapshot,
            boolean connected) {
        return new CustomerDisplayStateResponse(
            device == null ? null : device.deviceToken(),
            snapshot.cashRegisterId(),
            cashRegisterCode,
            cashRegisterName,
            snapshot.status(),
            snapshot.currencyCode(),
            snapshot.itemCount(),
            snapshot.subtotalAmount(),
            snapshot.discountAmount(),
            snapshot.taxAmount(),
            snapshot.totalAmount(),
            snapshot.paidAmount(),
            snapshot.changeAmount(),
            snapshot.balanceAmount(),
            snapshot.ticketNumber(),
            snapshot.customerMessage(),
            PosJsonSupport.toJsonNode(snapshot.itemsJson()),
            PosJsonSupport.toJsonNode(snapshot.paymentsJson()),
            snapshot.updatedAt(),
            connected
        );
    }

    private CustomerDisplayPairingCodeResponse toPairingCodeResponse(CustomerDisplayDeviceRecord device) {
        return new CustomerDisplayPairingCodeResponse(
            device.id(),
            device.cashRegisterId(),
            device.cashRegisterCode(),
            device.cashRegisterName(),
            device.pairingCode(),
            device.pairingCodeExpiresAt(),
            device.deviceToken(),
            displayUrl(device.deviceToken()),
            "/pos-display/pair?code=" + device.pairingCode()
        );
    }

    private String generateUniquePairingCode() {
        for (int attempt = 0; attempt < 20; attempt++) {
            var code = new StringBuilder(PAIRING_CODE_LENGTH);
            for (int index = 0; index < PAIRING_CODE_LENGTH; index++) {
                code.append(PAIRING_ALPHABET.charAt(secureRandom.nextInt(PAIRING_ALPHABET.length())));
            }
            var value = code.toString();
            if (!repository.existsActivePairingCode(value)) {
                return value;
            }
        }
        throw PosApiException.conflict("Could not generate a pairing code.");
    }

    private String generateUniqueToken() {
        for (int attempt = 0; attempt < 20; attempt++) {
            var token = "posd_" + UUID.randomUUID().toString().replace("-", "");
            if (!repository.existsDeviceToken(token)) {
                return token;
            }
        }
        throw PosApiException.conflict("Could not generate a display token.");
    }

    private String displayName(String requestedName, CashRegisterRecord register) {
        var value = trimToNull(requestedName);
        return value == null ? "Pantalla cliente - " + register.code() : value;
    }

    private String displayName(String requestedName, CustomerDisplayDeviceRecord device) {
        var value = trimToNull(requestedName);
        return value == null ? device.name() : value;
    }

    private String normalizePairingCode(String value) {
        var normalized = trimToNull(value);
        if (normalized == null) {
            throw PosApiException.badRequest("Pairing code is required.");
        }
        return normalized.toUpperCase(Locale.ROOT).replace("-", "").replace(" ", "");
    }

    private String normalizeSnapshotStatus(String value) {
        var normalized = trimToNull(value);
        if (normalized == null) {
            throw PosApiException.badRequest("Display status is required.");
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        if (!SNAPSHOT_STATUSES.contains(normalized)) {
            throw PosApiException.badRequest("Invalid display status.");
        }
        return normalized;
    }

    private String normalizeCurrency(String value) {
        var normalized = trimToNull(value);
        if (normalized == null || normalized.length() != 3) {
            throw PosApiException.badRequest("Currency code is required.");
        }
        return normalized.toUpperCase(Locale.ROOT);
    }

    private String normalizeToken(String value) {
        var normalized = trimToNull(value);
        if (normalized == null) {
            throw PosApiException.badRequest("Display token is required.");
        }
        return normalized;
    }

    private BigDecimal positive(BigDecimal value) {
        if (value == null || value.signum() < 0) {
            return ZERO;
        }
        return value;
    }

    private String displayUrl(String token) {
        return "/pos-display/" + token;
    }

    private String trimToNull(String value) {
        var trimmed = value == null ? null : value.trim();
        return trimmed == null || trimmed.isBlank() ? null : trimmed;
    }
}
