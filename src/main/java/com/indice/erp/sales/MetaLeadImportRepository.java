package com.indice.erp.sales;

import com.indice.erp.sales.MetaLeadImportDtos.ProviderLead;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class MetaLeadImportRepository {

    private final JdbcTemplate jdbcTemplate;

    MetaLeadImportRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    Set<String> findImportedLeadIds(long companyId, Set<String> leadIds) {
        if (leadIds.isEmpty()) {
            return Set.of();
        }
        var placeholders = String.join(", ", java.util.Collections.nCopies(leadIds.size(), "?"));
        var parameters = new ArrayList<Object>();
        parameters.add(companyId);
        parameters.addAll(leadIds);
        return new LinkedHashSet<>(jdbcTemplate.queryForList(
                "SELECT meta_lead_id FROM sales_meta_lead_imports WHERE company_id = ? AND meta_lead_id IN ("
                        + placeholders + ")",
                String.class,
                parameters.toArray()));
    }

    List<ContactIdentity> listContactIdentities(long companyId) {
        return jdbcTemplate.query(
                """
                SELECT id, email, phone
                FROM sales_contacts
                WHERE company_id = ? AND deleted_at IS NULL
                """,
                (resultSet, rowNumber) -> new ContactIdentity(
                        resultSet.getLong("id"),
                        resultSet.getString("email"),
                        resultSet.getString("phone")),
                companyId);
    }

    void recordImport(long companyId, long userId, long contactId, ProviderLead lead) {
        jdbcTemplate.update(
                """
                INSERT INTO sales_meta_lead_imports
                    (company_id, meta_page_id, meta_form_id, meta_lead_id, contact_id,
                     source_created_at, imported_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                companyId,
                lead.pageId(),
                lead.formId(),
                lead.id(),
                contactId,
                lead.sourceCreatedAt() == null ? null : Timestamp.from(lead.sourceCreatedAt()),
                userId);
    }

    record ContactIdentity(long id, String email, String phone) {
    }
}
