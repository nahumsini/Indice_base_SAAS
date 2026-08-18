package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.cashregister.dto.CashRegisterCreateRequest;
import com.indice.erp.pos.cashregister.dto.CashRegisterResponse;
import com.indice.erp.pos.cashregister.dto.CashRegisterUpdateRequest;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.status.CashRegisterStatus;
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

    public CashRegisterService(
            CashRegisterRepository repository,
            ShiftRepository shiftRepository,
            CashRegisterMapper mapper,
            CashRegisterValidator validator) {
        this.repository = repository;
        this.shiftRepository = shiftRepository;
        this.mapper = mapper;
        this.validator = validator;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(PosContext context) {
        var items = repository.findAll(context).stream().map(mapper::toResponse).toList();
        return Map.of("items", items, "count", items.size());
    }

    @Transactional(readOnly = true)
    public CashRegisterResponse get(PosContext context, long registerId) {
        return mapper.toResponse(requireRegister(context, registerId));
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
            .map(mapper::toResponse)
            .toList();
    }

    @Transactional
    public CashRegisterResponse create(PosContext context, CashRegisterCreateRequest request) {
        var warehouse = repository.findWarehouse(context, request.warehouseId())
            .orElseThrow(() -> new NoSuchElementException("Warehouse not found."));
        validator.requireWarehouseScope(warehouse);
        var command = mapper.toCreateCommand(context, request, warehouse);
        validator.requireCodeAvailable(repository, context, command.code(), null);
        return mapper.toResponse(repository.insert(context, command));
    }

    @Transactional
    public CashRegisterResponse ensureForWarehouse(PosContext context, long warehouseId) {
        var warehouse = repository.findWarehouse(context, warehouseId)
            .orElseThrow(() -> new NoSuchElementException("Warehouse not found."));
        validator.requireWarehouseScope(warehouse);
        var existing = repository.findFirstActiveByWarehouse(context, warehouseId);
        if (existing.isPresent()) {
            return mapper.toResponse(reconcileWarehouseScope(context, existing.get(), warehouse));
        }

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
        var request = new CashRegisterCreateRequest(
            warehouseId, code, "Caja " + warehouse.name(), CashRegisterStatus.ACTIVE, true,
            "Caja aprovisionada automáticamente desde el almacén.", null, null);
        return mapper.toResponse(repository.insert(context, mapper.toCreateCommand(context, request, warehouse)));
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
        requireRegister(context, registerId);
        var warehouse = repository.findWarehouse(context, request.warehouseId())
            .orElseThrow(() -> new NoSuchElementException("Warehouse not found."));
        validator.requireWarehouseScope(warehouse);
        var command = mapper.toUpdateCommand(context, request, warehouse);
        validator.requireCodeAvailable(repository, context, command.code(), registerId);
        if (!repository.update(context, registerId, command)) {
            throw new NoSuchElementException("Cash register not found.");
        }
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
}
