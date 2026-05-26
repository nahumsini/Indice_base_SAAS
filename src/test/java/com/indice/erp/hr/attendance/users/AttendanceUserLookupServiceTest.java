package com.indice.erp.hr.attendance.users;

import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.attendance.application.AttendancePhotoService;
import com.indice.erp.hr.attendance.models.AttendanceHrUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;


@ExtendWith(MockitoExtension.class)
class AttendanceUserLookupServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void listAttendanceUsersAppliesBusinessScopePredicate() {
        var service = new AttendanceUserLookupService(jdbcTemplate, mock(AttendancePhotoService.class));

        service.listAttendanceUsers(1L, HrOperationalScope.businessOffice(3L, 9L));

        verify(jdbcTemplate).query(
            argThat((String sql) -> sql.contains("e.business_id = ?")),
            ArgumentMatchers.<RowMapper<AttendanceHrUser>>any(),
            eq(1L),
            eq(9L)
        );
    }
}
