package com.indice.erp.hr.users;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** HR-owned Scheduling projection. No payroll, personal address or employment details are exposed. */
@Service
public class HrSchedulingDirectoryService {
    public record Employee(long id,String name) { }
    private final JdbcTemplate db;
    public HrSchedulingDirectoryService(JdbcTemplate db){this.db=db;}
    public List<Employee> active(long company){
        return db.query("""
            SELECT DISTINCT h.user_id,TRIM(CONCAT(COALESCE(h.first_name,''),' ',COALESCE(h.last_name,''))) name
            FROM hr_users h JOIN user_companies m ON m.company_id=h.company_id AND m.id=h.user_company_id AND m.user_id=h.user_id
            WHERE h.company_id=? AND h.work_profile_id IS NOT NULL AND h.termination_date IS NULL
              AND LOWER(COALESCE(h.status,'active')) IN ('active','activo')
              AND LOWER(COALESCE(m.status,'active')) IN ('active','activo') ORDER BY name,h.user_id
            """,(r,n)->new Employee(r.getLong(1),r.getString(2)),company);
    }
    /** Meeting directory: HR names take precedence; existing administrative accounts remain usable. */
    public List<Employee> meetingMembers(long company) {
        return db.query("""
            SELECT u.id,COALESCE(NULLIF(TRIM(CONCAT(COALESCE(h.first_name,''),' ',COALESCE(h.last_name,''))),''),u.full_name) name
            FROM user_companies m JOIN users u ON u.id=m.user_id
            LEFT JOIN hr_users h ON h.company_id=m.company_id AND h.user_id=m.user_id
              AND h.user_company_id=m.id
            WHERE m.company_id=? AND m.status='active'
              AND NOT EXISTS(SELECT 1 FROM hr_users x WHERE x.company_id=m.company_id AND x.user_id=m.user_id
                AND (LOWER(COALESCE(x.status,'active')) NOT IN ('active','activo') OR x.termination_date IS NOT NULL))
            ORDER BY name,u.id
            """,(r,n)->new Employee(r.getLong(1),r.getString(2)),company).stream().distinct().toList();
    }
    /** Legacy staff without an HR profile retain access; a known inactive HR employee never does. */
    public boolean eligible(long company,long user){
        return !Boolean.TRUE.equals(db.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM hr_users h WHERE h.company_id=? AND h.user_id=?
              AND (LOWER(COALESCE(h.status,'active')) NOT IN ('active','activo') OR h.termination_date IS NOT NULL))
            """,Boolean.class,company,user));
    }
}
