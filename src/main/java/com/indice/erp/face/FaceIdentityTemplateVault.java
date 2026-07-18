package com.indice.erp.face;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Owns facial templates so Kiosk Engine only retains an opaque reference. */
@Service
public class FaceIdentityTemplateVault {

    private static final TypeReference<List<List<Double>>> EMBEDDINGS_TYPE = new TypeReference<>() {};

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public FaceIdentityTemplateVault(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public String store(
            long companyId,
            String identityType,
            long identityId,
            List<List<Double>> embeddings) {
        if (embeddings == null || embeddings.isEmpty()) {
            throw new IllegalArgumentException("A facial template is required.");
        }
        var reference = UUID.randomUUID().toString();
        jdbcTemplate.update(
            """
                INSERT INTO face_identity_templates (
                    template_reference, company_id, identity_type, identity_id, embeddings_json
                ) VALUES (?, ?, ?, ?, CAST(? AS JSON))
                """,
            reference, companyId, identityType, identityId, json(embeddings));
        return reference;
    }

    public List<List<Double>> require(
            String reference,
            long companyId,
            String identityType,
            long identityId) {
        var rows = jdbcTemplate.query(
            """
                SELECT embeddings_json
                FROM face_identity_templates
                WHERE template_reference = ? AND company_id = ? AND identity_type = ? AND identity_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getString("embeddings_json"),
            reference, companyId, identityType, identityId);
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Facial template is not available.");
        }
        try {
            return objectMapper.readValue(rows.getFirst(), EMBEDDINGS_TYPE);
        } catch (JsonProcessingException failure) {
            throw new IllegalStateException("Stored facial template is invalid.", failure);
        }
    }

    public void delete(
            String reference,
            long companyId,
            String identityType,
            long identityId) {
        if (reference == null || reference.isBlank()) return;
        jdbcTemplate.update(
            """
                DELETE FROM face_identity_templates
                WHERE template_reference = ? AND company_id = ? AND identity_type = ? AND identity_id = ?
                """,
            reference, companyId, identityType, identityId);
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException failure) {
            throw new IllegalArgumentException("Facial template must be valid JSON.", failure);
        }
    }
}
