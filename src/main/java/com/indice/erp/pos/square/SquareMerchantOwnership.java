package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class SquareMerchantOwnership {
    private final JdbcTemplate jdbc;
    SquareMerchantOwnership(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    Long company(String environment, String merchantId) {
        if (merchantId == null || merchantId.isBlank()) return null;
        var companies = jdbc.queryForList("SELECT company_id FROM pos_square_connections "
            + "WHERE environment = ? AND merchant_id = ? AND status = 'CONNECTED'", Long.class, environment, merchantId);
        if (companies.size() > 1) throw com.indice.erp.pos.PosApiException.conflict("Square merchant ownership is ambiguous.");
        return companies.isEmpty() ? null : companies.getFirst();
    }
    void requireAvailable(String environment, String merchantId, long companyId) {
        var owner = company(environment, merchantId);
        if (owner != null && owner != companyId) {
            throw PosApiException.conflict("Square merchant is already connected to another company.");
        }
    }
}
