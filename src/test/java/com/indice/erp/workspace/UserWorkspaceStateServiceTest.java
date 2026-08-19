package com.indice.erp.workspace;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class UserWorkspaceStateServiceTest {

    private JdbcTemplate jdbc;
    private UserWorkspaceStateService service;

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        service = new UserWorkspaceStateService(jdbc, new ObjectMapper());
    }

    @Test
    void rejectsInvalidScopeBeforeAccessingPersistence() {
        assertThatThrownBy(() -> service.get(1L, 2L, "sales/../../other", "contacts"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("moduleKey");

        verifyNoInteractions(jdbc);
    }

    @Test
    void rejectsNonObjectAndOversizedState() throws Exception {
        assertThatThrownBy(() -> service.save(
            1L, 2L, "sales", "contacts", new ObjectMapper().readTree("[]"), 1
        )).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("JSON object");

        var oversized = new ObjectMapper().createObjectNode();
        oversized.put("search", "x".repeat(70 * 1024));
        assertThatThrownBy(() -> service.save(1L, 2L, "sales", "contacts", oversized, 1))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("64 KB");

        verifyNoInteractions(jdbc);
    }
}
