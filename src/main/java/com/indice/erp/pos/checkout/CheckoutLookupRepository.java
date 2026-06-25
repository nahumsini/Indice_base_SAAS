package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosContext;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CheckoutLookupRepository {

    private final JdbcTemplate jdbcTemplate;

    public CheckoutLookupRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<CustomerSnapshot> findCustomer(PosContext context, long customerId) {
        return jdbcTemplate.query("""
            SELECT id,
                   COALESCE(NULLIF(fiscal_legal_name, ''), NULLIF(company_name, ''), contact_person) AS snapshot_name,
                   fiscal_tax_id
            FROM sales_contacts
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """, (rs, rowNum) -> new CustomerSnapshot(
            rs.getLong("id"), rs.getString("snapshot_name"), rs.getString("fiscal_tax_id")
        ), context.companyId(), customerId).stream().findFirst();
    }

    public Optional<ProductSnapshot> findProduct(PosContext context, long productId) {
        return jdbcTemplate.query("""
            SELECT id, sku, name, type, inventory_ready
            FROM sales_products
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """, (rs, rowNum) -> new ProductSnapshot(
            rs.getLong("id"), rs.getString("sku"), rs.getString("name"), rs.getString("type"),
            rs.getBoolean("inventory_ready")
        ), context.companyId(), productId).stream().findFirst();
    }
}
