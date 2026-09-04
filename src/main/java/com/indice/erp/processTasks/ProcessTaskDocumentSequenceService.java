package com.indice.erp.processTasks;

import java.time.Year;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProcessTaskDocumentSequenceService {

    private final JdbcTemplate jdbcTemplate;

    public ProcessTaskDocumentSequenceService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public String nextProcessFolio(long companyId) {
        var currentYear = Year.now().getValue();
        jdbcTemplate.update(
                """
                    INSERT INTO process_task_document_sequences
                        (company_id, document_type, sequence_year, current_value)
                    SELECT ?, 'process', ?,
                           COALESCE(MAX(CAST(SUBSTRING(folio, 9) AS UNSIGNED)), 0) + 1
                    FROM processes
                    WHERE company_id = ?
                      AND folio LIKE ?
                      AND folio LIKE 'PR-%'
                    ON DUPLICATE KEY UPDATE current_value = process_task_document_sequences.current_value + 1
                    """,
                companyId,
                currentYear,
                companyId,
                "PR-" + currentYear + "-%");
        return "PR-" + currentYear + "-" + String.format("%03d", currentValue(companyId, "process", currentYear));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public String nextTaskFolio(long companyId) {
        var currentYear = Year.now().getValue();
        jdbcTemplate.update(
                """
                    INSERT INTO process_task_document_sequences
                        (company_id, document_type, sequence_year, current_value)
                    SELECT ?, 'task', ?,
                           COALESCE(MAX(CAST(SUBSTRING(folio, 8) AS UNSIGNED)), 0) + 1
                    FROM process_tasks
                    WHERE company_id = ?
                      AND folio LIKE ?
                      AND folio LIKE 'T-%'
                    ON DUPLICATE KEY UPDATE current_value = process_task_document_sequences.current_value + 1
                    """,
                companyId,
                currentYear,
                companyId,
                "T-" + currentYear + "-%");
        return "T-" + currentYear + "-" + String.format("%03d", currentValue(companyId, "task", currentYear));
    }

    private int currentValue(long companyId, String documentType, int sequenceYear) {
        var value = jdbcTemplate.queryForObject(
                """
                    SELECT current_value
                    FROM process_task_document_sequences
                    WHERE company_id = ? AND document_type = ? AND sequence_year = ?
                    """,
                Integer.class,
                companyId,
                documentType,
                sequenceYear);
        if (value == null || value <= 0) {
            throw new IllegalStateException("Document sequence could not be allocated.");
        }
        return value;
    }
}
