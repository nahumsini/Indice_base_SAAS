package com.indice.erp.face;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class FaceIdentityTemplateVaultTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void storesAnOpaqueReferenceUnderTheExactIdentityOwner() {
        var vault = new FaceIdentityTemplateVault(jdbcTemplate, new ObjectMapper());

        var reference = vault.store(7L, "PROVIDER", 91L, List.of(List.of(0.1, 0.2)));

        assertThat(reference).isNotBlank();
        verify(jdbcTemplate).update(
            contains("INSERT INTO face_identity_templates"),
            eq(reference), eq(7L), eq("PROVIDER"), eq(91L), eq("[[0.1,0.2]]"));
    }

    @Test
    void deletesOnlyTheTemplateOwnedByTheExactIdentity() {
        var vault = new FaceIdentityTemplateVault(jdbcTemplate, new ObjectMapper());

        vault.delete("template-ref", 7L, "PROVIDER", 91L);

        verify(jdbcTemplate).update(
            contains("DELETE FROM face_identity_templates"),
            eq("template-ref"), eq(7L), eq("PROVIDER"), eq(91L));
    }
}
