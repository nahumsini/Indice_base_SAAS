package com.indice.erp.sales;

import com.indice.erp.auth.AuthSessionUser;
import java.time.LocalDate;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class SalesCommissionCutScheduler {
    private static final Logger log = LoggerFactory.getLogger(SalesCommissionCutScheduler.class);
    private final JdbcTemplate jdbcTemplate;
    private final SalesCommissionCutService service;

    SalesCommissionCutScheduler(JdbcTemplate jdbcTemplate, SalesCommissionCutService service) {
        this.jdbcTemplate = jdbcTemplate;
        this.service = service;
    }

    @Scheduled(cron = "${app.sales.commission-cuts.scheduler-cron:0 10 * * * *}")
    void executeDueCuts() {
        jdbcTemplate.query("""
            SELECT s.id, s.company_id, s.cadence, s.next_run_date, s.created_by_user_id,
                   s.created_by_user_company_id, COALESCE(u.full_name, u.email, 'Automatización') user_name
            FROM sales_commission_cut_schedules s
            LEFT JOIN users u ON u.id = s.created_by_user_id
            WHERE s.status = 'active' AND s.next_run_date <= CURRENT_DATE()
            ORDER BY s.id
            """, (rs, rowNum) -> new DueSchedule(rs.getLong("id"), rs.getLong("company_id"), rs.getString("cadence"),
                rs.getObject("next_run_date", LocalDate.class), rs.getLong("created_by_user_id"),
                rs.getLong("created_by_user_company_id"), rs.getString("user_name"))).forEach(this::execute);
    }

    private void execute(DueSchedule schedule) {
        try {
            service.executeAutomatic(schedule.id(), new AuthSessionUser(schedule.userId(), schedule.companyId(), schedule.userCompanyId(), schedule.userName(), "admin"), schedule.cadence(), schedule.nextRunDate());
        } catch (RuntimeException ex) {
            log.warn("commission_cut_schedule_failed scheduleId={} companyId={} reason={}", schedule.id(), schedule.companyId(), ex.getMessage());
        }
    }

    private record DueSchedule(long id, long companyId, String cadence, LocalDate nextRunDate, long userId, long userCompanyId, String userName) {}
}
