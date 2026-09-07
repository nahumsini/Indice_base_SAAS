package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.cashregister.dto.CashRegisterCreateRequest;
import com.indice.erp.pos.cashregister.dto.CashRegisterResponse;
import com.indice.erp.pos.cashregister.dto.CashRegisterUpdateRequest;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.status.CashRegisterStatus;
import com.indice.erp.pos.settlement.SettlementPolicyService;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CashRegisterService {

    private final CashRegisterRepository repository;
    private final ShiftRepository shiftRepository;
    private final CashRegisterMapper mapper;
    private final CashRegisterValidator validator;
    private final SettlementPolicyService settlementPolicyService;

    public CashRegisterService(
            CashRegisterRepository repository,
            ShiftRepository shiftRepository,
            CashRegisterMapper mapper,
            CashRegisterValidator validator,
            SettlementPolicyService settlementPolicyService) {
        this.repository = repository;
        this.shiftRepository = shiftRepository;
        this.mapper = mapper;
        this.validator = validator;
        this.settlementPolicyService = settlementPolicyService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(PosContext context) {
        var items = repository.findAll(context).stream()
            .map(register -> mapper.toResponse(register, settlementPolicyService.list(context, register.id())))
            .toList();
        return Map.of("items", items, "count", items.size());
    }

    @Transactional(readOnly = true)
    public CashRegisterResponse get(PosContext context, long registerId) {
        var register = requireRegister(context, registerId);
        return mapper.toResponse(register, settlementPolicyService.list(context, registerId));
    }

    @Transactional(readOnly = true)
    public List<CashRegisterResponse> activeRegisters(PosContext context) {
        return repository.findAll(context).stream()
            .filter(register -> register.active() && register.status() == CashRegisterStatus.ACTIVE)
            .filter(register -> repository.findWarehouse(context, register.warehouseId())
                .filter(warehouse -> register.warehouseId().equals(warehouse.id())
                    && java.util.Objects.equals(register.unitId(), warehouse.unitId())
                    && java.util.Objects.equals(register.businessId(), warehouse.businessId()))
                .isPresent())
            .map(register -> mapper.toResponse(register, settlementPolicyService.list(context, register.id())))
            .toList();
    }

    @Transactional
    public CashRegisterResponse create(PosContext context, CashRegisterCreateRequest request) {
        var warehouse = repository.findWarehouseForMutation(context, request.warehouseId())
            .orElseThrow(() -> new NoSuchElementException("Warehouse not found."));
        validator.requireWarehouseScope(warehouse);
        var requestedCode = request.code() == null ? "" : request.code().trim();
        if (requestedCode.isBlank()) {
            repository.lockCodeAllocation(context.companyId());
            requestedCode = nextAvailableCode(context, warehouse);
        }
        var effectiveRequest = new CashRegisterCreateRequest(
            request.warehouseId(), requestedCode, request.name(), request.status(), request.active(),
            request.notes(), request.retainedCashAmount(), request.settlementCurrencyCode(), request.settlementRules(),
            request.customFields(), request.metadata());
        var command = mapper.toCreateCommand(context, effectiveRequest, warehouse);
        validator.requireCodeAvailable(repository, context, command.code(), null);
        var created = repository.insert(context, command);
        saveRequestedPolicy(context, created, request.settlementCurrencyCode(), request.settlementRules());
        return mapper.toResponse(created, settlementPolicyService.list(context, created.id()));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> nextCode(PosContext context, long warehouseId) {
        var warehouse = repository.findWarehouse(context, warehouseId)
            .orElseThrow(() -> new NoSuchElementException("Warehouse not found."));
        validator.requireWarehouseScope(warehouse);
        return Map.of("code", nextAvailableCode(context, warehouse));
    }

    @Transactional
    public CashRegisterResponse ensureForWarehouse(PosContext context, long warehouseId) {
        var warehouse = repository.findWarehouseForMutation(context, warehouseId)
            .orElseThrow(() -> new NoSuchElementException("Warehouse not found."));
        validator.requireWarehouseScope(warehouse);
        repository.lockCodeAllocation(context.companyId());
        var existing = repository.findFirstActiveByWarehouse(context, warehouseId);
        if (existing.isPresent()) {
            return mapper.toResponse(reconcileWarehouseScope(context, existing.get(), warehouse));
        }

        var code = nextAvailableCode(context, warehouse);
        var request = new CashRegisterCreateRequest(
            warehouseId, code, "Caja " + warehouse.name(), CashRegisterStatus.ACTIVE, true,
            "Caja aprovisionada automáticamente desde el almacén.", java.math.BigDecimal.ZERO,
            null, null, null, null);
        return mapper.toResponse(repository.insert(context, mapper.toCreateCommand(context, request, warehouse)));
    }

    private String nextAvailableCode(
            PosContext context,
            com.indice.erp.pos.context.dto.WarehouseSummary warehouse) {
        var base = ((warehouse.warehouseCode() == null || warehouse.warehouseCode().isBlank())
            ? warehouse.name() : warehouse.warehouseCode())
            .replaceAll("[^A-Za-z0-9]", "")
            .toUpperCase(Locale.ROOT);
        if (base.isBlank()) {
            base = "POS";
        }
        base = base.substring(0, Math.min(base.length(), 48));
        var sequence = 1;
        var code = base + "-" + String.format("%02d", sequence);
        while (repository.existsByCode(context, code, null)) {
            sequence++;
            code = base + "-" + String.format("%02d", sequence);
        }
        return code;
    }

    private CashRegisterRecord reconcileWarehouseScope(
            PosContext context,
            CashRegisterRecord register,
            com.indice.erp.pos.context.dto.WarehouseSummary warehouse) {
        if (java.util.Objects.equals(register.unitId(), warehouse.unitId())
                && java.util.Objects.equals(register.businessId(), warehouse.businessId())) {
            return register;
        }
        if (!repository.synchronizeScopeFromWarehouse(context, register.id(), warehouse)) {
            throw new NoSuchElementException("Cash register not found.");
        }
        return repository.findFirstActiveByWarehouse(context, warehouse.id())
            .orElseThrow(() -> new NoSuchElementException("Cash register not found."));
    }

    @Transactional
    public CashRegisterResponse update(PosContext context, long registerId, CashRegisterUpdateRequest request) {
        var existing = requireRegister(context, registerId);
        var retainedCashAmount = request.retainedCashAmount() == null
            ? existing.retainedCashAmount()
            : request.retainedCashAmount();
        var changesSettlementPolicy = request.settlementRules() != null
            || (request.settlementCurrencyCode() != null && !request.settlementCurrencyCode().isBlank())
            || retainedCashAmount.compareTo(existing.retainedCashAmount()) != 0;
        if (changesSettlementPolicy && shiftRepository.hasBlockingShiftForRegister(context, registerId)) {
            throw PosApiException.conflict(
                "Cash register settlement settings cannot change while a shift is open. Close the shift first."
            );
        }
        var warehouse = repository.findWarehouseForMutation(context, request.warehouseId())
            .orElseThrow(() -> new NoSuchElementException("Warehouse not found."));
        validator.requireWarehouseScope(warehouse);
        var effectiveRequest = new CashRegisterUpdateRequest(
            request.warehouseId(), request.code(), request.name(), request.status(), request.active(),
            request.notes(), retainedCashAmount, request.settlementCurrencyCode(), request.settlementRules(),
            request.customFields(), request.metadata());
        var command = mapper.toUpdateCommand(context, effectiveRequest, warehouse);
        validator.requireCodeAvailable(repository, context, command.code(), registerId);
        if (!repository.update(context, registerId, command)) {
            throw new NoSuchElementException("Cash register not found.");
        }
        var saved = requireRegister(context, registerId);
        saveRequestedPolicy(context, saved, request.settlementCurrencyCode(), request.settlementRules());
        return get(context, registerId);
    }

    @Transactional
    public Map<String, Object> delete(PosContext context, long registerId) {
        requireRegister(context, registerId);
        validator.requireDeletable(shiftRepository.hasBlockingShiftForRegister(context, registerId));
        if (!repository.softDelete(context, registerId)) {
            throw new NoSuchElementException("Cash register not found.");
        }
        return Map.of("success", true);
    }

    public CashRegisterRecord requireRegister(PosContext context, long registerId) {
        return repository.findById(context, registerId)
            .orElseThrow(() -> new NoSuchElementException("Cash register not found."));
    }

    public CashRegisterRecord requireOperationalRegister(PosContext context, long registerId) {
        var register = requireRegister(context, registerId);
        validator.requireOperable(register);
        var warehouse = repository.findWarehouse(context, register.warehouseId())
            .orElseThrow(() -> PosApiException.conflict(
                "Cash register warehouse is inactive, unavailable, or missing its business assignment."
            ));
        validator.requireWarehouseMatch(register, warehouse);
        return register;
    }

    @Transactional
    public java.util.List<com.indice.erp.finance.treasury.TreasuryAccount> settlementAccounts(
            PosContext context,
            long registerId,
            String currencyCode) {
        var register = requireRegister(context, registerId);
        return settlementPolicyService.eligibleAccounts(context, register, currencyCode);
    }

    @Transactional
    public java.util.List<com.indice.erp.finance.treasury.TreasuryAccount> settlementAccountsForWarehouse(
            PosContext context,
            long warehouseId,
            String currencyCode) {
        var warehouse = repository.findWarehouse(context, warehouseId)
            .orElseThrow(() -> new NoSuchElementException("Warehouse not found."));
        validator.requireWarehouseScope(warehouse);
        return settlementPolicyService.eligibleAccountsForScope(
            context, warehouse.unitId(), warehouse.businessId(), currencyCode
        );
    }

    @Transactional
    public java.util.List<com.indice.erp.pos.settlement.SettlementRuleResponse> settlementPolicy(
            PosContext context,
            long registerId,
            String currencyCode) {
        var register = requireRegister(context, registerId);
        return settlementPolicyService.ensureCompatibilityPolicy(context, register, currencyCode);
    }

    private void saveRequestedPolicy(
            PosContext context,
            CashRegisterRecord register,
            String currencyCode,
            java.util.List<com.indice.erp.pos.settlement.SettlementRuleRequest> rules) {
        if (currencyCode == null || currencyCode.isBlank()) {
            if (rules != null && !rules.isEmpty()) {
                throw PosApiException.badRequest("settlementCurrencyCode is required when settlementRules are provided.");
            }
            return;
        }
        settlementPolicyService.savePolicy(context, register, currencyCode, rules);
    }
}
