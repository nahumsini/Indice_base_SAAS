package com.indice.erp.ai.finance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.action.AiActionRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Compatibility name for the existing Finance callers of shared AI action persistence. */
@Repository
public class AiFinanceActionRepository extends AiActionRepository {
    public AiFinanceActionRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        super(jdbcTemplate, objectMapper);
    }
}
