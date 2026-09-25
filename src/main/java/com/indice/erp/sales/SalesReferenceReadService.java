package com.indice.erp.sales;

import com.indice.erp.hr.HrOperationalScope;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only owner contract shared by the customer and warehouse MCP resolvers. */
@Service
public class SalesReferenceReadService {
    private final SalesReferenceRepository repository;

    public SalesReferenceReadService(SalesReferenceRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public Page<Customer> customers(long companyId, HrOperationalScope scope, String query, int offset, int limit) {
        validate(offset, limit);
        return repository.customers(companyId, scope, query, offset, limit);
    }

    @Transactional(readOnly = true)
    public Page<Warehouse> warehouses(long companyId, HrOperationalScope scope, String query, int offset, int limit) {
        validate(offset, limit);
        return repository.warehouses(companyId, scope, query, offset, limit);
    }

    private void validate(int offset, int limit) {
        if (offset < 0 || limit < 1 || limit > 50) throw new IllegalArgumentException("Invalid reference page.");
    }

    public record Page<T>(List<T> items, int totalCount) { }
    public record Customer(long id, String code, String name, String status, Long unitId, Long businessId) { }
    public record Warehouse(long id, String code, String name, String type, String status, Long unitId, Long businessId) { }
}
