package com.indice.erp.hr;

import com.indice.erp.hr.records.HrRecordScopeAccess;
import java.sql.ResultSet;
import java.util.List;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HrRecordScopeAccessTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private HrOperationalScopeService hrOperationalScopeService;

    @Test
    void requireRecordInScopeRejectsRecordOutsideScope() throws Exception {
        var service = new HrRecordScopeAccess(jdbcTemplate, hrOperationalScopeService);
        var scope = HrOperationalScope.businessOffice(4L, 9L);

        when(jdbcTemplate.query(
            contains("FROM user_records"),
            ArgumentMatchers.<RowMapper<?>>any(),
            eq(1L),
            eq(44L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("user_unit_id_snapshot")).thenReturn(4L);
            when(rs.getLong("user_business_id_snapshot")).thenReturn(10L);
            when(rs.wasNull()).thenReturn(false, false);
            return List.of(rowMapper.mapRow(rs, 0));
        });
        doThrow(new HrAccessDeniedException("Forbidden"))
            .when(hrOperationalScopeService)
            .requireAssignmentInScope(1L, scope, 4L, 10L);

        assertThrows(HrAccessDeniedException.class, () -> service.requireRecordInScope(1L, scope, 44L));
    }

    @Test
    void requireRecordInScopeReturnsNotFoundForMissingRecord() {
        var service = new HrRecordScopeAccess(jdbcTemplate, hrOperationalScopeService);
        var scope = HrOperationalScope.businessOffice(4L, 9L);

        when(jdbcTemplate.query(
            contains("FROM user_records"),
            ArgumentMatchers.<RowMapper<?>>any(),
            eq(1L),
            eq(44L)
        )).thenReturn(List.of());

        assertThrows(NoSuchElementException.class, () -> service.requireRecordInScope(1L, scope, 44L));
    }
}
