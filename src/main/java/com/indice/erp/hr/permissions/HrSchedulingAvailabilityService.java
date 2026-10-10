package com.indice.erp.hr.permissions;

import com.indice.erp.access.module.ModuleAccessService;
import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** HR-owned date availability; no leave type, reason, health or payroll details cross this boundary. */
@Service
public class HrSchedulingAvailabilityService {
    private final JdbcTemplate db;
    private final ModuleAccessService modules;
    public HrSchedulingAvailabilityService(JdbcTemplate db,ModuleAccessService modules){this.db=db;this.modules=modules;}
    public boolean unavailable(long company,long validatedUser,LocalDate first,LocalDate last){
        if(company<=0||validatedUser<=0||first==null||last==null||last.isBefore(first)||last.isAfter(first.plusDays(366)))throw new IllegalArgumentException();
        if(!modules.companyCanAccess(company,"human_resources"))return false;
        // HR stores half-day quantity without morning/afternoon authority. Do not invent an available half.
        return Boolean.TRUE.equals(db.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM user_permission_requests p
              JOIN user_companies uc ON uc.company_id=p.company_id AND uc.id=p.user_company_id AND uc.user_id=p.user_id
              WHERE p.company_id=? AND p.user_id=? AND p.status='approved'
                AND p.start_date<=? AND p.end_date>=?)
            """,Boolean.class,company,validatedUser,java.sql.Date.valueOf(last),java.sql.Date.valueOf(first)));
    }
}
