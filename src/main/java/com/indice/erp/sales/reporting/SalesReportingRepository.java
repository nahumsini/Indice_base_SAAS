package com.indice.erp.sales.reporting;

import com.indice.erp.hr.HrOperationalScope;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static com.indice.erp.sales.reporting.SalesReportingContracts.*;

/** Sales-owned read projection. POS contributes its unique linked ticket, never a second sale. */
@Repository
class SalesReportingRepository {
    private static final String ORIGIN = "CASE WHEN s.source_type IN ('SALES','POS') THEN s.source_type ELSE 'UNKNOWN' END";
    private static final String CHANNEL = "CASE WHEN s.source_type = 'POS' THEN COALESCE(NULLIF(TRIM(t.channel),''),'UNCLASSIFIED') ELSE 'UNCLASSIFIED' END";
    private static final String ACTIVE = "LOWER(COALESCE(s.commercial_status,'')) NOT IN ('cancelled','canceled','rejected','voided')";
    private static final String FROM = """
        FROM sales_records s LEFT JOIN pos_tickets t ON t.company_id=s.company_id
          AND t.sales_record_id=s.id AND t.deleted_at IS NULL AND s.source_type='POS'
        """;
    private final JdbcTemplate db;
    SalesReportingRepository(JdbcTemplate db) { this.db = db; }

    Page read(long company, HrOperationalScope scope, Filter filter, Options options) {
        var query = where(company, scope, filter);
        long count = db.queryForObject("SELECT COUNT(*) " + FROM + query.sql, Long.class, query.args.toArray());
        String sort = switch (filter.sort()) { case "number" -> "s.sale_number"; case "customer" -> "s.customer_name"; default -> "s.sale_date"; };
        String direction = "asc".equals(filter.direction()) ? "ASC" : "DESC";
        var args = new ArrayList<>(query.args); args.add(filter.pageSize()); args.add((filter.page() - 1L) * filter.pageSize());
        var rows = db.query("SELECT s.*, " + ORIGIN + " origin, " + CHANNEL + " channel, t.id ticket_id, t.ticket_number, u.name unit_name, b.name business_name "
            + FROM + " LEFT JOIN units u ON u.id=s.unit_id AND u.company_id=s.company_id LEFT JOIN businesses b ON b.id=s.business_id AND b.company_id=s.company_id "
            + query.sql + " ORDER BY " + sort + " " + direction + ", s.id " + direction + " LIMIT ? OFFSET ?",
            (r,n) -> new Sale(r.getLong("id"),r.getString("sale_number"),r.getObject("sale_date",java.time.LocalDate.class),r.getString("origin"),r.getString("channel"),
                r.getString("customer_name"),r.getString("seller_name"),r.getObject("unit_id",Long.class),r.getString("unit_name"),r.getObject("business_id",Long.class),r.getString("business_name"),
                r.getString("currency"),r.getBigDecimal("total_amount"),r.getBigDecimal("tax_total"),r.getBigDecimal("discount_total"),
                r.getString("commercial_status"),r.getString("finance_status"),r.getString("inventory_status"),r.getString("delivery_status"),r.getObject("ticket_id",Long.class),r.getString("ticket_number")),args.toArray());
        var groups = db.query("SELECT " + ORIGIN + " origin, " + CHANNEL + " channel, UPPER(TRIM(s.currency)) currency, COUNT(*) records, "
            + "SUM(" + ACTIVE + ") active, SUM(NOT (" + ACTIVE + ")) cancelled, "
            + "SUM(CASE WHEN " + ACTIVE + " THEN s.total_amount ELSE 0 END) total, "
            + "SUM(CASE WHEN " + ACTIVE + " THEN s.tax_total ELSE 0 END) tax, "
            + "SUM(CASE WHEN " + ACTIVE + " THEN s.total_amount-s.tax_total ELSE 0 END) before_tax "
            + FROM + query.sql + " GROUP BY " + ORIGIN + "," + CHANNEL + ",UPPER(TRIM(s.currency)) ORDER BY origin,channel,currency",
            (r,n) -> new NativeGroup(r.getString("origin"),r.getString("channel"),r.getString("currency"),r.getLong("records"),r.getLong("active"),r.getLong("cancelled"),
                r.getBigDecimal("total"),r.getBigDecimal("tax"),r.getBigDecimal("before_tax")),query.args.toArray());
        long days = java.time.temporal.ChronoUnit.DAYS.between(filter.from(),filter.to()) + 1;
        var historyFilter = new Filter(filter.from().minusDays(days),filter.to(),filter.search(),filter.origin(),filter.channel(),
            filter.status(),filter.unitId(),filter.businessId(),filter.page(),filter.pageSize(),filter.sort(),filter.direction());
        var historyQuery = where(company,scope,historyFilter);
        var history = db.query("SELECT s.sale_date, UPPER(TRIM(s.currency)) currency, SUM("+ACTIVE+") active, "
            +"SUM(CASE WHEN "+ACTIVE+" THEN s.total_amount ELSE 0 END) total "+FROM+historyQuery.sql
            +" GROUP BY s.sale_date,UPPER(TRIM(s.currency)) ORDER BY s.sale_date,currency",
            (r,n)->new NativeDay(r.getObject("sale_date",java.time.LocalDate.class),r.getString("currency"),r.getLong("active"),r.getBigDecimal("total")),historyQuery.args.toArray());
        return new Page(rows,count,groups,history,options);
    }

    Options options(long company, HrOperationalScope scope) {
        var args = new ArrayList<Object>(); args.add(company);
        String unitsWhere = " WHERE u.company_id=?";
        if (!scope.isCorporateOffice()) { unitsWhere += " AND u.id=?"; args.add(scope.unitId()); }
        var units = db.query("SELECT u.id,u.name FROM units u"+unitsWhere+" ORDER BY u.name,u.id",(r,n)->new Unit(r.getLong(1),r.getString(2)),args.toArray());
        args = new ArrayList<>(); args.add(company);
        String businessWhere = " WHERE b.company_id=?";
        if (!scope.isCorporateOffice()) { businessWhere += " AND b.unit_id=?"; args.add(scope.unitId()); }
        if (scope.type()==HrOperationalScope.Type.BUSINESS_OFFICE) { businessWhere += " AND b.id=?"; args.add(scope.businessId()); }
        var businesses = db.query("SELECT b.id,b.unit_id,b.name FROM businesses b"+businessWhere+" ORDER BY b.name,b.id",(r,n)->new Business(r.getLong(1),r.getLong(2),r.getString(3)),args.toArray());
        args = new ArrayList<>(); args.add(company); args.addAll(scope.assignmentParameters());
        var channels = db.query("SELECT DISTINCT "+ORIGIN+" origin,"+CHANNEL+" channel "+FROM
            +" WHERE s.company_id=? AND s.deleted_at IS NULL"+scope.assignmentPredicate("s.unit_id","s.business_id","s.company_id")+" ORDER BY origin,channel",
            (r,n)->new Channel(r.getString(1),r.getString(2)),args.toArray());
        return new Options(units,businesses,channels);
    }

    private Query where(long company, HrOperationalScope scope, Filter f) {
        var args = new ArrayList<Object>(); args.add(company); args.add(f.from()); args.add(f.to());
        String sql = " WHERE s.company_id=? AND s.deleted_at IS NULL AND s.sale_date BETWEEN ? AND ?";
        sql += scope.assignmentPredicate("s.unit_id","s.business_id","s.company_id"); args.addAll(scope.assignmentParameters());
        if (!f.origin().equals("ALL")) { sql += " AND "+ORIGIN+"=?"; args.add(f.origin()); }
        if (!f.channel().isBlank()) { sql += " AND "+CHANNEL+"=?"; args.add(f.channel()); }
        if (f.status().equals("ACTIVE")) sql += " AND "+ACTIVE;
        if (f.status().equals("CANCELLED")) sql += " AND NOT ("+ACTIVE+")";
        if (f.unitId()!=null) { sql += " AND s.unit_id=?"; args.add(f.unitId()); }
        if (f.businessId()!=null) { sql += " AND s.business_id=?"; args.add(f.businessId()); }
        if (!f.search().isBlank()) {
            String term = "%"+f.search().replace("!","!!").replace("%","!%").replace("_","!_")+"%";
            sql += " AND (s.sale_number LIKE ? ESCAPE '!' OR s.customer_name LIKE ? ESCAPE '!' OR s.seller_name LIKE ? ESCAPE '!')";
            args.add(term); args.add(term); args.add(term);
        }
        return new Query(sql,args);
    }
    private record Query(String sql,List<Object> args) { }
}
