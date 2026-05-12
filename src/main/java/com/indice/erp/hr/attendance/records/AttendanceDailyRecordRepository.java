package com.indice.erp.hr.attendance.records;

import com.indice.erp.hr.attendance.models.DailyRecordRow;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;


@Repository
public class AttendanceDailyRecordRepository {

    private final JdbcTemplate jdbcTemplate;
    private final AttendanceDailyRecordMapper mapper;

    @Autowired
    public AttendanceDailyRecordRepository(JdbcTemplate jdbcTemplate, AttendanceDailyRecordMapper mapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.mapper = mapper;
    }

    public AttendanceDailyRecordRepository(JdbcTemplate jdbcTemplate) {
        this(jdbcTemplate, new AttendanceDailyRecordMapper());
    }

    public Map<Long, DailyRecordRow> loadDailyRecords(long companyId, LocalDate date) {
        var rows = jdbcTemplate.query(mapper.dailyRecordSelectSql("""
                WHERE r.company_id = ?
                  AND r.attendance_date = ?
                """),
            (rs, rowNum) -> mapper.mapDailyRecord(rs),
            companyId,
            date
        );
        var result = new HashMap<Long, DailyRecordRow>();
        for (var row : rows) {
            result.put(row.userCompanyId(), row);
        }
        return result;
    }

    public Map<LocalDate, DailyRecordRow> loadDailyRecords(
        long companyId,
        long userCompanyId,
        LocalDate startDate,
        LocalDate endDate
    ) {
        var rows = jdbcTemplate.query(mapper.dailyRecordSelectSql("""
                WHERE r.company_id = ?
                  AND r.user_company_id = ?
                  AND r.attendance_date BETWEEN ? AND ?
                """),
            (rs, rowNum) -> mapper.mapDailyRecord(rs),
            companyId,
            userCompanyId,
            startDate,
            endDate
        );
        return byAttendanceDate(rows);
    }

    public DailyRecordRow loadDailyRecord(long companyId, long userCompanyId, LocalDate date) {
        return loadDailyRecords(companyId, userCompanyId, date, date).get(date);
    }

    public DailyRecordRow loadOpenDailyRecord(long companyId, long userCompanyId, LocalDate latestDate) {
        var rows = jdbcTemplate.query(mapper.dailyRecordSelectSql("""
                WHERE r.company_id = ?
                  AND r.user_company_id = ?
                  AND r.attendance_date <= ?
                  AND r.first_check_in_at IS NOT NULL
                  AND r.last_check_out_at IS NULL
                ORDER BY r.attendance_date DESC
                LIMIT 1
                """),
            (rs, rowNum) -> mapper.mapDailyRecord(rs),
            companyId,
            userCompanyId,
            latestDate
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public Map<LocalDate, DailyRecordRow> loadUserDailyRecords(
        long companyId,
        long userId,
        LocalDate startDate,
        LocalDate endDate
    ) {
        var rows = jdbcTemplate.query(mapper.userDailyRecordSelectSql("""
                WHERE r.company_id = ?
                  AND r.user_id = ?
                  AND r.attendance_date BETWEEN ? AND ?
                """),
            (rs, rowNum) -> mapper.mapDailyRecord(rs),
            companyId,
            userId,
            startDate,
            endDate
        );
        return byAttendanceDate(rows);
    }

    public DailyRecordRow loadUserDailyRecord(long companyId, long userId, LocalDate date) {
        return loadUserDailyRecords(companyId, userId, date, date).get(date);
    }

    private Map<LocalDate, DailyRecordRow> byAttendanceDate(Iterable<DailyRecordRow> rows) {
        var result = new HashMap<LocalDate, DailyRecordRow>();
        for (var row : rows) {
            result.put(row.attendanceDate(), row);
        }
        return result;
    }


}
