package com.indice.erp.hr;

import com.indice.erp.auth.AuthSessionUser;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HrOperationalScopeServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void resolvesCorporateOfficeForSuperadminWithoutDatabaseLookup() {
        var service = new HrOperationalScopeService(jdbcTemplate);
        var currentUser = new AuthSessionUser(7L, 1L, "Super Admin", "superadmin");

        var scope = service.resolve(currentUser);

        assertEquals(HrOperationalScope.Type.CORPORATE_OFFICE, scope.type());
        assertNull(scope.unitId());
        assertNull(scope.businessId());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void resolvesUnitHeadquartersForAdminEvenWhenWorkProfileHasBusiness() throws Exception {
        var service = new HrOperationalScopeService(jdbcTemplate);
        var currentUser = new AuthSessionUser(7L, 1L, "Scoped Admin", "admin");

        when(jdbcTemplate.query(
            contains("FROM user_companies uc"),
            ArgumentMatchers.<RowMapper<?>>any(),
            eq(7L),
            eq(1L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("unit_id")).thenReturn(4L);
            when(rs.getLong("business_id")).thenReturn(9L);
            when(rs.wasNull()).thenReturn(false, false);
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var scope = service.resolve(currentUser);

        assertEquals(HrOperationalScope.Type.UNIT_HEADQUARTERS, scope.type());
        assertEquals(4L, scope.unitId());
        assertNull(scope.businessId());
    }

    @Test
    void resolvesBusinessOfficeForManagerFromCurrentUsersWorkProfile() throws Exception {
        var service = new HrOperationalScopeService(jdbcTemplate);
        var currentUser = new AuthSessionUser(7L, 1L, "Scoped Manager", "manager");

        when(jdbcTemplate.query(
            contains("FROM user_companies uc"),
            ArgumentMatchers.<RowMapper<?>>any(),
            eq(7L),
            eq(1L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("unit_id")).thenReturn(4L);
            when(rs.getLong("business_id")).thenReturn(9L);
            when(rs.wasNull()).thenReturn(false, false);
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var scope = service.resolve(currentUser);

        assertEquals(HrOperationalScope.Type.BUSINESS_OFFICE, scope.type());
        assertEquals(4L, scope.unitId());
        assertEquals(9L, scope.businessId());
    }

    @Test
    void resolvesUnassignedForRegularUsersEvenWhenWorkProfileHasAssignment() throws Exception {
        var service = new HrOperationalScopeService(jdbcTemplate);
        var currentUser = new AuthSessionUser(7L, 1L, 22L, "Scoped User", "user");

        when(jdbcTemplate.query(
            contains("FROM user_companies uc"),
            ArgumentMatchers.<RowMapper<?>>any(),
            eq(7L),
            eq(1L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("unit_id")).thenReturn(4L);
            when(rs.getLong("business_id")).thenReturn(9L);
            when(rs.wasNull()).thenReturn(false, false);
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var scope = service.resolve(currentUser);

        assertEquals(HrOperationalScope.Type.UNASSIGNED, scope.type());
        assertFalse(service.containsAssignment(1L, scope, 4L, 9L));
    }

    @Test
    void resolvesUnassignedWhenCurrentUserHasNoWorkProfileAssignment() throws Exception {
        var service = new HrOperationalScopeService(jdbcTemplate);
        var currentUser = new AuthSessionUser(7L, 1L, "Scoped Admin", "admin");

        when(jdbcTemplate.query(
            contains("FROM user_companies uc"),
            ArgumentMatchers.<RowMapper<?>>any(),
            eq(7L),
            eq(1L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("unit_id")).thenReturn(0L);
            when(rs.getLong("business_id")).thenReturn(0L);
            when(rs.wasNull()).thenReturn(true, true);
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var scope = service.resolve(currentUser);

        assertEquals(HrOperationalScope.Type.UNASSIGNED, scope.type());
        assertFalse(service.containsAssignment(1L, scope, 4L, 9L));
    }

    @Test
    void unitScopeIncludesUsersInTheSameUnitOrBusinessesUnderThatUnit() {
        var service = new HrOperationalScopeService(jdbcTemplate);
        var scope = HrOperationalScope.unitHeadquarters(4L);

        assertTrue(service.containsAssignment(1L, scope, 4L, null));

        when(jdbcTemplate.queryForObject(
            contains("FROM businesses"),
            eq(Long.class),
            eq(9L),
            eq(4L),
            eq(1L)
        )).thenReturn(1L);

        assertTrue(service.containsAssignment(1L, scope, null, 9L));
    }

    @Test
    void businessScopeDoesNotIncludeOtherBusinesses() {
        var service = new HrOperationalScopeService(jdbcTemplate);
        var scope = HrOperationalScope.businessOffice(4L, 9L);

        assertTrue(service.containsAssignment(1L, scope, 4L, 9L));
        assertFalse(service.containsAssignment(1L, scope, 4L, 10L));
        assertFalse(service.containsAssignment(1L, scope, 4L, null));
    }

    @Test
    void requireUserInScopeRejectsTargetOutsideBusinessScope() throws Exception {
        var service = new HrOperationalScopeService(jdbcTemplate);
        var scope = HrOperationalScope.businessOffice(4L, 9L);

        when(jdbcTemplate.query(
            contains("FROM hr_users e"),
            ArgumentMatchers.<RowMapper<?>>any(),
            eq(1L),
            eq(77L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("unit_id")).thenReturn(4L);
            when(rs.getLong("business_id")).thenReturn(10L);
            when(rs.wasNull()).thenReturn(false, false);
            return List.of(rowMapper.mapRow(rs, 0));
        });

        assertThrows(HrAccessDeniedException.class, () -> service.requireUserInScope(1L, scope, 77L));
    }

    @Test
    void requireUserInScopeReturnsNotFoundForMissingTarget() {
        var service = new HrOperationalScopeService(jdbcTemplate);
        var scope = HrOperationalScope.businessOffice(4L, 9L);

        when(jdbcTemplate.query(
            contains("FROM hr_users e"),
            ArgumentMatchers.<RowMapper<?>>any(),
            eq(1L),
            eq(77L)
        )).thenReturn(List.of());

        assertThrows(NoSuchElementException.class, () -> service.requireUserInScope(1L, scope, 77L));
    }
}
