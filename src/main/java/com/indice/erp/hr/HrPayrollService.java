package com.indice.erp.hr;

import static com.indice.erp.hr.HrPayloadUtils.nullable;
import static com.indice.erp.hr.HrPayloadUtils.parseBigDecimal;
import static com.indice.erp.hr.HrPayloadUtils.parseDate;
import static com.indice.erp.hr.HrPayloadUtils.parseLong;
import static com.indice.erp.hr.HrPayloadUtils.safe;
import static com.indice.erp.hr.HrPayloadUtils.stringValue;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.stream.Collectors;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HrPayrollService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal DEFAULT_OVERTIME_MULTIPLIER = BigDecimal.ONE;

    private final JdbcTemplate jdbcTemplate;

    public HrPayrollService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> overview(long companyId) {
        var preferences = ensurePreferences(companyId);
        var runs = loadRuns(companyId);

        int draftCount = 0;
        int processedCount = 0;
        int approvedCount = 0;
        int paidCount = 0;
        int cancelledCount = 0;
        BigDecimal totalGross = BigDecimal.ZERO;
        BigDecimal totalNet = BigDecimal.ZERO;

        for (var run : runs) {
            switch (run.status()) {
                case "draft" -> draftCount++;
                case "processed" -> processedCount++;
                case "approved" -> approvedCount++;
                case "paid" -> paidCount++;
                case "cancelled" -> cancelledCount++;
                default -> {
                }
            }

            totalGross = totalGross.add(run.grossAmount());
            totalNet = totalNet.add(run.netAmount());
        }

        var summary = new LinkedHashMap<String, Object>();
        summary.put("runs_count", runs.size());
        summary.put("draft_count", draftCount);
        summary.put("processed_count", processedCount);
        summary.put("approved_count", approvedCount);
        summary.put("paid_count", paidCount);
        summary.put("cancelled_count", cancelledCount);
        summary.put("total_gross_amount", scaled(totalGross));
        summary.put("total_net_amount", scaled(totalNet));

        var body = new LinkedHashMap<String, Object>();
        body.put("summary", summary);
        body.put("preferences", toPreferencesMap(preferences));
        body.put("recent_runs", runs.stream().limit(6).map(this::toRunSummaryMap).toList());
        return body;
    }

    public Map<String, Object> getPreferences(long companyId) {
        return toPreferencesMap(ensurePreferences(companyId));
    }

    @Transactional
    public Map<String, Object> savePreferences(long companyId, Map<String, Object> payload) {
        var current = ensurePreferences(companyId);
        var groupingMode = normalizeGroupingMode(stringValue(payload, "grouping_mode"), current.groupingMode());
        var defaultDailyHours = normalizePositiveDecimal(parseBigDecimal(payload, "default_daily_hours"), current.defaultDailyHours(), "default_daily_hours");
        var payLeaveDays = parseBoolean(payload.getOrDefault("pay_leave_days", current.payLeaveDays()));
        var isrRate = normalizeRate(parseBigDecimal(payload, "isr_rate"), current.isrRate(), "isr_rate");
        var imssEmployeeRate = normalizeRate(parseBigDecimal(payload, "imss_employee_rate"), current.imssEmployeeRate(), "imss_employee_rate");
        var infonavitEmployeeRate = normalizeRate(parseBigDecimal(payload, "infonavit_employee_rate"), current.infonavitEmployeeRate(), "infonavit_employee_rate");
        var imssEmployerRate = normalizeRate(parseBigDecimal(payload, "imss_employer_rate"), current.imssEmployerRate(), "imss_employer_rate");
        var infonavitEmployerRate = normalizeRate(parseBigDecimal(payload, "infonavit_employer_rate"), current.infonavitEmployerRate(), "infonavit_employer_rate");
        var sarEmployerRate = normalizeRate(parseBigDecimal(payload, "sar_employer_rate"), current.sarEmployerRate(), "sar_employer_rate");

        jdbcTemplate.update(
            """
                UPDATE hr_payroll_preferences
                SET grouping_mode = ?,
                    default_daily_hours = ?,
                    pay_leave_days = ?,
                    isr_rate = ?,
                    imss_employee_rate = ?,
                    infonavit_employee_rate = ?,
                    imss_employer_rate = ?,
                    infonavit_employer_rate = ?,
                    sar_employer_rate = ?
                WHERE company_id = ?
                """,
            groupingMode,
            defaultDailyHours,
            payLeaveDays,
            isrRate,
            imssEmployeeRate,
            infonavitEmployeeRate,
            imssEmployerRate,
            infonavitEmployerRate,
            sarEmployerRate,
            companyId
        );

        return toPreferencesMap(ensurePreferences(companyId));
    }

    public Map<String, Object> listRuns(long companyId, Map<String, String> filters) {
        var items = loadRuns(companyId).stream()
            .filter((run) -> matchesRunFilters(run, filters))
            .map(this::toRunSummaryMap)
            .toList();

        return Map.of("items", items);
    }

    @Transactional
    public Map<String, Object> createRuns(long companyId, long userId, Map<String, Object> payload) {
        var preferences = ensurePreferences(companyId);
        var payPeriod = normalizePayPeriod(stringValue(payload, "pay_period"));
        var periodStartDate = parseDate(payload, "period_start_date", "start_date");
        var periodEndDate = parseDate(payload, "period_end_date", "end_date");

        if (periodStartDate == null || periodEndDate == null) {
            throw new IllegalArgumentException("period_start_date and period_end_date are required.");
        }
        if (periodEndDate.isBefore(periodStartDate)) {
            throw new IllegalArgumentException("period_end_date must be on or after period_start_date.");
        }

        periodEndDate = normalizeRunPeriodEndDate(payPeriod, periodStartDate);
        var normalizedPeriodEndDate = periodEndDate;

        var groupingMode = normalizeGroupingMode(stringValue(payload, "grouping_mode"), preferences.groupingMode());
        var employees = loadEligibleEmployees(companyId, payPeriod, true);
        if (employees.isEmpty()) {
            throw new IllegalArgumentException("No active employees are configured for the selected pay frequency.");
        }

        var groupedEmployees = groupEmployees(employees, groupingMode);
        var createdRuns = new ArrayList<Map<String, Object>>();

        for (var group : groupedEmployees) {
            var existingRun = findExistingRun(companyId, groupingMode, group.groupingKey(), payPeriod, periodStartDate, normalizedPeriodEndDate);
            if (existingRun != null) {
                var existingSummary = toRunSummaryMap(existingRun);
                existingSummary.put("reused", true);
                createdRuns.add(existingSummary);
                continue;
            }

            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                var statement = connection.prepareStatement(
                    """
                        INSERT INTO hr_payroll_runs
                        (company_id, grouping_mode, grouping_key, grouping_label, pay_period, period_start_date, period_end_date, status, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)
                        """,
                    new String[] {"id"}
                );
                statement.setLong(1, companyId);
                statement.setString(2, groupingMode);
                statement.setString(3, nullable(group.groupingKey()));
                statement.setString(4, nullable(group.groupingLabel()));
                statement.setString(5, payPeriod);
                statement.setObject(6, periodStartDate);
                statement.setObject(7, normalizedPeriodEndDate);
                statement.setLong(8, userId);
                return statement;
            }, keyHolder);

            var runId = keyHolder.getKey() == null ? null : keyHolder.getKey().longValue();
            if (runId == null) {
                throw new IllegalStateException("Payroll run could not be created.");
            }

            for (var employee : group.employees()) {
                createRunLine(companyId, runId, employee, preferences, payPeriod, periodStartDate, normalizedPeriodEndDate);
            }

            recomputeRunTotals(runId);
            createdRuns.add(toRunSummaryMap(loadRun(companyId, runId)));
        }

        return Map.of("items", createdRuns);
    }

    public Map<String, Object> getRunDetail(long companyId, long runId) {
        var run = loadRun(companyId, runId);
        var lines = loadRunLines(runId).stream()
            .map((line) -> {
                var body = new LinkedHashMap<String, Object>();
                body.put("id", line.id());
                body.put("employee_id", line.employeeId());
                body.put("employee_number", line.employeeNumberSnapshot());
                body.put("employee_name", line.employeeNameSnapshot());
                body.put("position_title", line.positionTitleSnapshot());
                body.put("department", line.departmentSnapshot());
                body.put("unit_id", line.unitIdSnapshot());
                body.put("unit_name", line.unitNameSnapshot());
                body.put("business_id", line.businessIdSnapshot());
                body.put("business_name", line.businessNameSnapshot());
                body.put("pay_period", line.payPeriodSnapshot());
                body.put("salary_type", line.salaryTypeSnapshot());
                body.put("base_salary_amount", scaled(line.baseSalaryAmount()));
                body.put("hourly_rate_amount", scaledNullable(line.hourlyRateAmount()));
                body.put("days_payable", scaled(line.daysPayable()));
                body.put("leave_days", scaled(line.leaveDays()));
                body.put("absence_days", scaled(line.absenceDays()));
                body.put("rest_days", scaled(line.restDays()));
                body.put("late_count", line.lateCount());
                body.put("regular_hours", scaled(line.regularHours()));
                body.put("overtime_hours", scaled(line.overtimeHours()));
                body.put("include_in_fiscal", line.includeInFiscal());
                body.put("gross_amount", scaled(line.grossAmount()));
                body.put("deductions_amount", scaled(line.deductionsAmount()));
                body.put("employer_contributions_amount", scaled(line.employerContributionsAmount()));
                body.put("net_amount", scaled(line.netAmount()));
                body.put("notes", line.notes());
                body.put("items", loadRunLineItems(line.id()).stream().map(this::toRunLineItemMap).toList());
                return body;
            })
            .toList();

        var body = new LinkedHashMap<String, Object>();
        body.put("run", toRunSummaryMap(run));
        body.put("lines", lines);
        return body;
    }

    @Transactional
    public Map<String, Object> updateRunLine(long companyId, long runId, long lineId, Map<String, Object> payload) {
        var run = loadRun(companyId, runId);
        requireRunStatus(run, "draft");
        var line = loadRunLine(runId, lineId);

        var includeInFiscal = payload.containsKey("include_in_fiscal")
            ? parseBoolean(payload.get("include_in_fiscal"))
            : line.includeInFiscal();
        var notes = payload.containsKey("notes") ? nullable(stringValue(payload, "notes")) : line.notes();
        var manualItems = parseManualItems(payload.get("manual_items"));

        jdbcTemplate.update(
            """
                UPDATE hr_payroll_run_lines
                SET include_in_fiscal = ?,
                    notes = ?
                WHERE id = ? AND run_id = ?
                """,
            includeInFiscal,
            notes,
            lineId,
            runId
        );

        jdbcTemplate.update(
            "DELETE FROM hr_payroll_run_line_items WHERE run_line_id = ? AND source_type = 'manual'",
            lineId
        );

        for (var index = 0; index < manualItems.size(); index++) {
            var manualItem = manualItems.get(index);
            jdbcTemplate.update(
                """
                    INSERT INTO hr_payroll_run_line_items
                    (run_line_id, code, category, label, amount, source_type, display_order)
                    VALUES (?, ?, ?, ?, ?, 'manual', ?)
                    """,
                lineId,
                manualItem.code(),
                manualItem.category(),
                manualItem.label(),
                manualItem.amount(),
                1000 + index
            );
        }

        recomputeRunLineFromStoredItems(lineId, ensurePreferences(companyId));
        recomputeRunTotals(runId);
        return getRunDetail(companyId, runId);
    }

    @Transactional
    public Map<String, Object> processRun(long companyId, long userId, long runId) {
        var run = loadRun(companyId, runId);
        requireRunStatus(run, "draft");
        recomputeRunTotals(runId);
        updateRunStatus(runId, "processed", userId);
        return Map.of("run", toRunSummaryMap(loadRun(companyId, runId)));
    }

    @Transactional
    public Map<String, Object> approveRun(long companyId, long userId, long runId) {
        var run = loadRun(companyId, runId);
        requireRunStatus(run, "processed");
        updateRunStatus(runId, "approved", userId);
        return Map.of("run", toRunSummaryMap(loadRun(companyId, runId)));
    }

    @Transactional
    public Map<String, Object> markRunPaid(long companyId, long userId, long runId) {
        var run = loadRun(companyId, runId);
        requireRunStatus(run, "approved");
        updateRunStatus(runId, "paid", userId);
        return Map.of("run", toRunSummaryMap(loadRun(companyId, runId)));
    }

    @Transactional
    public Map<String, Object> cancelRun(long companyId, long userId, long runId) {
        var run = loadRun(companyId, runId);
        if ("paid".equals(run.status())) {
            throw new IllegalArgumentException("Paid payroll runs cannot be cancelled.");
        }
        if ("cancelled".equals(run.status())) {
            throw new IllegalArgumentException("Payroll run is already cancelled.");
        }
        jdbcTemplate.update(
            """
                UPDATE hr_payroll_runs
                SET status = 'cancelled',
                    cancelled_by = ?,
                    cancelled_at = ?
                WHERE id = ? AND company_id = ?
                """,
            userId,
            Timestamp.valueOf(LocalDateTime.now()),
            runId,
            companyId
        );
        return Map.of("run", toRunSummaryMap(loadRun(companyId, runId)));
    }

    public String exportRunCsv(long companyId, long runId) {
        var detail = getRunDetail(companyId, runId);
        @SuppressWarnings("unchecked")
        var run = (Map<String, Object>) detail.get("run");
        @SuppressWarnings("unchecked")
        var lines = (List<Map<String, Object>>) detail.get("lines");

        var builder = new StringBuilder();
        builder.append("run_id,period_start_date,period_end_date,status,employee_id,employee_name,pay_period,salary_type,gross_amount,deductions_amount,employer_contributions_amount,net_amount\n");
        for (var line : lines) {
            builder.append(csv(run.get("id"))).append(',')
                .append(csv(run.get("period_start_date"))).append(',')
                .append(csv(run.get("period_end_date"))).append(',')
                .append(csv(run.get("status"))).append(',')
                .append(csv(line.get("employee_id"))).append(',')
                .append(csv(line.get("employee_name"))).append(',')
                .append(csv(line.get("pay_period"))).append(',')
                .append(csv(line.get("salary_type"))).append(',')
                .append(csv(line.get("gross_amount"))).append(',')
                .append(csv(line.get("deductions_amount"))).append(',')
                .append(csv(line.get("employer_contributions_amount"))).append(',')
                .append(csv(line.get("net_amount")))
                .append('\n');
        }
        return builder.toString();
    }

    public byte[] exportRunPdf(long companyId, long runId) {
        var detail = getRunDetail(companyId, runId);
        @SuppressWarnings("unchecked")
        var run = (Map<String, Object>) detail.get("run");
        @SuppressWarnings("unchecked")
        var lines = (List<Map<String, Object>>) detail.get("lines");

        try (var document = new PDDocument(); var buffer = new ByteArrayOutputStream()) {
            var bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            var regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            var page = new PDPage(PDRectangle.LETTER);
            document.addPage(page);
            var content = new PDPageContentStream(document, page);

            float y = writePayrollPdfHeader(content, bold, regular, run);
            for (var line : lines) {
                if (y < 60) {
                    content.close();
                    page = new PDPage(PDRectangle.LETTER);
                    document.addPage(page);
                    content = new PDPageContentStream(document, page);
                    y = writePayrollPdfHeader(content, bold, regular, run);
                }

                content.beginText();
                content.setFont(regular, 9);
                content.newLineAtOffset(40, y);
                content.showText(truncatePdf(String.valueOf(line.get("employee_name")), 30));
                content.newLineAtOffset(180, 0);
                content.showText(String.valueOf(line.get("gross_amount")));
                content.newLineAtOffset(80, 0);
                content.showText(String.valueOf(line.get("deductions_amount")));
                content.newLineAtOffset(90, 0);
                content.showText(String.valueOf(line.get("net_amount")));
                content.endText();
                y -= 14;
            }

            content.close();

            document.save(buffer);
            return buffer.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Payroll PDF export could not be generated.", ex);
        }
    }

    private float writePayrollPdfHeader(
        PDPageContentStream content,
        PDType1Font bold,
        PDType1Font regular,
        Map<String, Object> run
    ) throws IOException {
        float y = 740f;

        content.beginText();
        content.setFont(bold, 16);
        content.newLineAtOffset(40, y);
        content.showText("Payroll Run #" + run.get("id"));
        content.endText();

        y -= 24;
        content.beginText();
        content.setFont(regular, 10);
        content.newLineAtOffset(40, y);
        content.showText("Status: " + safe(String.valueOf(run.get("status"))) + "  Period: "
            + safe(String.valueOf(run.get("period_start_date"))) + " to " + safe(String.valueOf(run.get("period_end_date"))));
        content.endText();

        y -= 24;
        content.beginText();
        content.setFont(bold, 10);
        content.newLineAtOffset(40, y);
        content.showText("Employee");
        content.newLineAtOffset(180, 0);
        content.showText("Gross");
        content.newLineAtOffset(80, 0);
        content.showText("Deductions");
        content.newLineAtOffset(90, 0);
        content.showText("Net");
        content.endText();

        return y - 12;
    }

    private PayrollPreferencesRow ensurePreferences(long companyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT company_id,
                       grouping_mode,
                       default_daily_hours,
                       pay_leave_days,
                       isr_rate,
                       imss_employee_rate,
                       infonavit_employee_rate,
                       imss_employer_rate,
                       infonavit_employer_rate,
                       sar_employer_rate
                FROM hr_payroll_preferences
                WHERE company_id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> new PayrollPreferencesRow(
                rs.getLong("company_id"),
                normalizeGroupingMode(rs.getString("grouping_mode"), "single"),
                scaled(rs.getBigDecimal("default_daily_hours")),
                rs.getBoolean("pay_leave_days"),
                scaled(rs.getBigDecimal("isr_rate")),
                scaled(rs.getBigDecimal("imss_employee_rate")),
                scaled(rs.getBigDecimal("infonavit_employee_rate")),
                scaled(rs.getBigDecimal("imss_employer_rate")),
                scaled(rs.getBigDecimal("infonavit_employer_rate")),
                scaled(rs.getBigDecimal("sar_employer_rate"))
            ),
            companyId
        );

        if (!rows.isEmpty()) {
            return rows.getFirst();
        }

        jdbcTemplate.update(
            """
                INSERT INTO hr_payroll_preferences
                (company_id, grouping_mode, default_daily_hours, pay_leave_days, isr_rate, imss_employee_rate, infonavit_employee_rate, imss_employer_rate, infonavit_employer_rate, sar_employer_rate)
                VALUES (?, 'single', 8.00, 1, 0.10000, 0.04000, 0.03000, 0.07000, 0.05000, 0.02000)
                """,
            companyId
        );
        return ensurePreferences(companyId);
    }

    private List<PayrollRunRow> loadRuns(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT id,
                       company_id,
                       grouping_mode,
                       grouping_key,
                       grouping_label,
                       pay_period,
                       period_start_date,
                       period_end_date,
                       status,
                       employees_count,
                       gross_amount,
                       deductions_amount,
                       employer_contributions_amount,
                       net_amount,
                       created_at
                FROM hr_payroll_runs
                WHERE company_id = ?
                ORDER BY period_end_date DESC, id DESC
                """,
            (rs, rowNum) -> mapRunRow(rs),
            companyId
        );
    }

    private PayrollRunRow loadRun(long companyId, long runId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id,
                       company_id,
                       grouping_mode,
                       grouping_key,
                       grouping_label,
                       pay_period,
                       period_start_date,
                       period_end_date,
                       status,
                       employees_count,
                       gross_amount,
                       deductions_amount,
                       employer_contributions_amount,
                       net_amount,
                       created_at
                FROM hr_payroll_runs
                WHERE company_id = ? AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapRunRow(rs),
            companyId,
            runId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Payroll run not found.");
        }
        return rows.getFirst();
    }

    private PayrollRunRow findExistingRun(
        long companyId,
        String groupingMode,
        String groupingKey,
        String payPeriod,
        LocalDate periodStartDate,
        LocalDate periodEndDate
    ) {
        var rows = jdbcTemplate.query(
            """
                SELECT id,
                       company_id,
                       grouping_mode,
                       grouping_key,
                       grouping_label,
                       pay_period,
                       period_start_date,
                       period_end_date,
                       status,
                       employees_count,
                       gross_amount,
                       deductions_amount,
                       employer_contributions_amount,
                       net_amount,
                       created_at
                FROM hr_payroll_runs
                WHERE company_id = ?
                  AND grouping_mode = ?
                  AND ((grouping_key IS NULL AND ? IS NULL) OR grouping_key = ?)
                  AND pay_period = ?
                  AND period_start_date = ?
                  AND period_end_date = ?
                  AND status <> 'cancelled'
                ORDER BY id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> mapRunRow(rs),
            companyId,
            groupingMode,
            nullable(groupingKey),
            nullable(groupingKey),
            payPeriod,
            periodStartDate,
            periodEndDate
        );
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private List<PayrollEmployeeRow> loadEligibleEmployees(long companyId, String payPeriod, boolean matchRequestedPayPeriod) {
        return jdbcTemplate.query(
            """
                SELECT e.id,
                       COALESCE(e.employee_number, '') AS employee_number,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position,
                       COALESCE(e.department, '') AS department,
                       COALESCE(LOWER(e.status), 'active') AS status,
                       e.unit_id,
                       u.name AS unit_name,
                       e.business_id,
                       b.name AS business_name,
                       COALESCE(e.salary, 0) AS salary,
                       COALESCE(e.hourly_rate, 0) AS hourly_rate,
                       COALESCE(LOWER(e.salary_type), 'daily') AS salary_type,
                       COALESCE(LOWER(e.pay_period), 'weekly') AS pay_period
                FROM hr_employees e
                LEFT JOIN units u ON u.id = e.unit_id
                LEFT JOIN businesses b ON b.id = e.business_id
                WHERE e.company_id = ?
                  AND COALESCE(LOWER(e.status), 'active') <> 'terminated'
                  AND (? = 0 OR COALESCE(LOWER(e.pay_period), 'weekly') = ?)
                ORDER BY full_name ASC, e.id ASC
                """,
            (rs, rowNum) -> new PayrollEmployeeRow(
                rs.getLong("id"),
                safe(rs.getString("employee_number")),
                safe(rs.getString("full_name")),
                safe(rs.getString("position")),
                safe(rs.getString("department")),
                safe(rs.getString("status")),
                getNullableLong(rs, "unit_id"),
                safe(rs.getString("unit_name")),
                getNullableLong(rs, "business_id"),
                safe(rs.getString("business_name")),
                scaled(rs.getBigDecimal("salary")),
                scaled(rs.getBigDecimal("hourly_rate")),
                safe(rs.getString("salary_type")),
                safe(rs.getString("pay_period"))
            ),
            companyId,
            matchRequestedPayPeriod ? 1 : 0,
            payPeriod
        );
    }

    private List<PayrollEmployeeGroup> groupEmployees(List<PayrollEmployeeRow> employees, String groupingMode) {
        var grouped = new LinkedHashMap<String, List<PayrollEmployeeRow>>();
        var labels = new LinkedHashMap<String, String>();

        for (var employee : employees) {
            String key;
            String label;
            switch (groupingMode) {
                case "unit" -> {
                    key = employee.unitId() == null ? "unit:unassigned" : "unit:" + employee.unitId();
                    label = employee.unitName().isBlank() ? "No unit" : employee.unitName();
                }
                case "business" -> {
                    key = employee.businessId() == null ? "business:unassigned" : "business:" + employee.businessId();
                    label = employee.businessName().isBlank() ? "No business" : employee.businessName();
                }
                default -> {
                    key = "single";
                    label = "All employees";
                }
            }

            grouped.computeIfAbsent(key, ignored -> new ArrayList<>()).add(employee);
            labels.putIfAbsent(key, label);
        }

        return grouped.entrySet().stream()
            .map((entry) -> new PayrollEmployeeGroup(entry.getKey(), labels.get(entry.getKey()), List.copyOf(entry.getValue())))
            .toList();
    }

    private void createRunLine(
        long companyId,
        long runId,
        PayrollEmployeeRow employee,
        PayrollPreferencesRow preferences,
        String runPayPeriod,
        LocalDate periodStartDate,
        LocalDate periodEndDate
    ) {
        var computation = computeLine(companyId, employee, preferences, periodStartDate, periodEndDate);

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO hr_payroll_run_lines
                    (run_id, company_id, employee_id, employee_number_snapshot, employee_name_snapshot, position_title_snapshot, department_snapshot,
                     unit_id_snapshot, unit_name_snapshot, business_id_snapshot, business_name_snapshot, pay_period_snapshot, salary_type_snapshot,
                     base_salary_amount, hourly_rate_amount, days_payable, leave_days, absence_days, rest_days, late_count, regular_hours, overtime_hours,
                     include_in_fiscal, gross_amount, deductions_amount, employer_contributions_amount, net_amount, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                new String[] {"id"}
            );
            statement.setLong(1, runId);
            statement.setLong(2, companyId);
            statement.setLong(3, employee.id());
            statement.setString(4, nullable(employee.employeeNumber()));
            statement.setString(5, employee.fullName());
            statement.setString(6, nullable(employee.positionTitle()));
            statement.setString(7, nullable(employee.department()));
            if (employee.unitId() == null) {
                statement.setNull(8, Types.BIGINT);
            } else {
                statement.setLong(8, employee.unitId());
            }
            statement.setString(9, nullable(employee.unitName()));
            if (employee.businessId() == null) {
                statement.setNull(10, Types.BIGINT);
            } else {
                statement.setLong(10, employee.businessId());
            }
            statement.setString(11, nullable(employee.businessName()));
            statement.setString(12, runPayPeriod);
            statement.setString(13, employee.salaryType());
            statement.setBigDecimal(14, computation.baseSalaryAmount());
            if (employee.hourlyRate().compareTo(BigDecimal.ZERO) == 0) {
                statement.setNull(15, Types.DECIMAL);
            } else {
                statement.setBigDecimal(15, employee.hourlyRate());
            }
            statement.setBigDecimal(16, computation.daysPayable());
            statement.setBigDecimal(17, computation.leaveDays());
            statement.setBigDecimal(18, computation.absenceDays());
            statement.setBigDecimal(19, computation.restDays());
            statement.setInt(20, computation.lateCount());
            statement.setBigDecimal(21, computation.regularHours());
            statement.setBigDecimal(22, computation.overtimeHours());
            statement.setBoolean(23, true);
            statement.setBigDecimal(24, computation.grossAmount());
            statement.setBigDecimal(25, computation.deductionsAmount());
            statement.setBigDecimal(26, computation.employerContributionsAmount());
            statement.setBigDecimal(27, computation.netAmount());
            statement.setString(28, null);
            return statement;
        }, keyHolder);

        var runLineId = keyHolder.getKey() == null ? null : keyHolder.getKey().longValue();
        if (runLineId == null) {
            throw new IllegalStateException("Payroll run line could not be created.");
        }

        storeLineItems(runLineId, computation.items());
    }

    private LineComputation computeLine(
        long companyId,
        PayrollEmployeeRow employee,
        PayrollPreferencesRow preferences,
        LocalDate periodStartDate,
        LocalDate periodEndDate
    ) {
        var dailyRecords = loadDailyRecords(companyId, employee.id(), periodStartDate, periodEndDate);
        var scheduleWindows = loadScheduleWindows(companyId, employee.id(), periodStartDate, periodEndDate);

        BigDecimal payableDays = BigDecimal.ZERO;
        BigDecimal leaveDays = BigDecimal.ZERO;
        BigDecimal absenceDays = BigDecimal.ZERO;
        BigDecimal restDays = BigDecimal.ZERO;
        int lateCount = 0;
        BigDecimal regularHours = BigDecimal.ZERO;
        BigDecimal overtimeHours = BigDecimal.ZERO;
        BigDecimal leaveHours = BigDecimal.ZERO;
        BigDecimal baseDailyAmount = BigDecimal.ZERO;
        BigDecimal absenceDeductionAmount = BigDecimal.ZERO;

        for (var currentDate = periodStartDate; !currentDate.isAfter(periodEndDate); currentDate = currentDate.plusDays(1)) {
            var record = dailyRecords.get(currentDate);
            var window = resolveScheduleWindow(scheduleWindows, currentDate);
            var status = resolvePayrollStatus(record, window);
            if (status == null) {
                continue;
            }

            var scheduledHours = scheduledHours(window);
            switch (status) {
                case "rest" -> restDays = restDays.add(BigDecimal.ONE);
                case "absence" -> {
                    if (window != null && !window.isRestDay()) {
                        absenceDays = absenceDays.add(BigDecimal.ONE);
                        if ("daily".equals(employee.salaryType())) {
                            baseDailyAmount = baseDailyAmount.add(employee.salary());
                            absenceDeductionAmount = absenceDeductionAmount.add(employee.salary());
                        }
                    }
                }
                case "leave" -> {
                    leaveDays = leaveDays.add(BigDecimal.ONE);
                    if ("daily".equals(employee.salaryType())) {
                        baseDailyAmount = baseDailyAmount.add(employee.salary());
                        if (preferences.payLeaveDays()) {
                            payableDays = payableDays.add(BigDecimal.ONE);
                        } else {
                            absenceDeductionAmount = absenceDeductionAmount.add(employee.salary());
                        }
                    } else {
                        leaveHours = leaveHours.add(scheduledHours);
                    }
                }
                case "late" -> {
                    lateCount++;
                    if ("daily".equals(employee.salaryType())) {
                        baseDailyAmount = baseDailyAmount.add(employee.salary());
                        payableDays = payableDays.add(BigDecimal.ONE);
                    } else {
                        var workedHours = resolveWorkedHours(record, scheduledHours);
                        regularHours = regularHours.add(workedHours.min(scheduledHours.compareTo(BigDecimal.ZERO) > 0 ? scheduledHours : workedHours));
                        if (workedHours.compareTo(scheduledHours) > 0 && scheduledHours.compareTo(BigDecimal.ZERO) > 0) {
                            overtimeHours = overtimeHours.add(workedHours.subtract(scheduledHours));
                        } else if (scheduledHours.compareTo(BigDecimal.ZERO) <= 0) {
                            regularHours = regularHours.add(BigDecimal.ZERO);
                        }
                    }
                }
                case "on_time" -> {
                    if ("daily".equals(employee.salaryType())) {
                        baseDailyAmount = baseDailyAmount.add(employee.salary());
                        payableDays = payableDays.add(BigDecimal.ONE);
                    } else {
                        var workedHours = resolveWorkedHours(record, scheduledHours);
                        if (scheduledHours.compareTo(BigDecimal.ZERO) > 0) {
                            regularHours = regularHours.add(workedHours.min(scheduledHours));
                            if (workedHours.compareTo(scheduledHours) > 0) {
                                overtimeHours = overtimeHours.add(workedHours.subtract(scheduledHours));
                            }
                        } else {
                            regularHours = regularHours.add(workedHours);
                        }
                    }
                }
                default -> {
                }
            }
        }

        var items = new ArrayList<PayrollLineItemDraft>();
        if ("daily".equals(employee.salaryType())) {
            if (baseDailyAmount.compareTo(BigDecimal.ZERO) > 0) {
                items.add(new PayrollLineItemDraft("BASE_DAILY", "earning", "Base daily pay", baseDailyAmount, "computed", 10));
            }
            if (absenceDeductionAmount.compareTo(BigDecimal.ZERO) > 0) {
                items.add(new PayrollLineItemDraft("ABSENCE_DEDUCTION", "deduction", "Unpaid attendance deduction", absenceDeductionAmount, "computed", 70));
            }
        } else {
            var baseHourlyAmount = employee.hourlyRate().multiply(regularHours);
            var overtimeAmount = employee.hourlyRate().multiply(overtimeHours).multiply(DEFAULT_OVERTIME_MULTIPLIER);
            var leaveHourlyAmount = employee.hourlyRate().multiply(leaveHours);

            if (baseHourlyAmount.compareTo(BigDecimal.ZERO) > 0) {
                items.add(new PayrollLineItemDraft("BASE_HOURLY", "earning", "Regular hours", baseHourlyAmount, "computed", 10));
            }
            if (overtimeAmount.compareTo(BigDecimal.ZERO) > 0) {
                items.add(new PayrollLineItemDraft("OVERTIME", "earning", "Overtime", overtimeAmount, "computed", 20));
            }
            if (leaveHourlyAmount.compareTo(BigDecimal.ZERO) > 0) {
                items.add(new PayrollLineItemDraft("LEAVE_PAY", "earning", "Paid leave", leaveHourlyAmount, "computed", 30));
            }
        }

        return computeTotalsForItems(
            employee.salaryType(),
            employee.salary(),
            employee.hourlyRate(),
            payableDays,
            leaveDays,
            absenceDays,
            restDays,
            lateCount,
            regularHours,
            overtimeHours,
            items,
            true,
            preferences
        );
    }

    private void recomputeRunLineFromStoredItems(long runLineId, PayrollPreferencesRow preferences) {
        var line = loadRunLine(runLineId);
        var computedItems = loadRunLineItemsBySource(runLineId, "computed").stream()
            .map(this::toDraftItem)
            .toList();
        var manualItems = loadRunLineItemsBySource(runLineId, "manual").stream()
            .map(this::toDraftItem)
            .toList();
        var mergedItems = new ArrayList<PayrollLineItemDraft>();
        mergedItems.addAll(computedItems);
        mergedItems.addAll(manualItems);

        var recalculated = computeTotalsForItems(
            line.salaryTypeSnapshot(),
            line.baseSalaryAmount(),
            line.hourlyRateAmount() == null ? BigDecimal.ZERO : line.hourlyRateAmount(),
            line.daysPayable(),
            line.leaveDays(),
            line.absenceDays(),
            line.restDays(),
            line.lateCount(),
            line.regularHours(),
            line.overtimeHours(),
            mergedItems,
            line.includeInFiscal(),
            preferences
        );

        jdbcTemplate.update(
            """
                UPDATE hr_payroll_run_lines
                SET include_in_fiscal = ?,
                    notes = ?,
                    gross_amount = ?,
                    deductions_amount = ?,
                    employer_contributions_amount = ?,
                    net_amount = ?
                WHERE id = ?
                """,
            line.includeInFiscal(),
            line.notes(),
            recalculated.grossAmount(),
            recalculated.deductionsAmount(),
            recalculated.employerContributionsAmount(),
            recalculated.netAmount(),
            runLineId
        );

        jdbcTemplate.update(
            "DELETE FROM hr_payroll_run_line_items WHERE run_line_id = ? AND source_type = 'computed_tax'",
            runLineId
        );

        var computedTaxItems = recalculated.items().stream()
            .filter((item) -> "computed_tax".equals(item.sourceType()))
            .toList();
        if (!computedTaxItems.isEmpty()) {
            storeLineItems(runLineId, computedTaxItems);
        }
    }

    private LineComputation computeTotalsForItems(
        String salaryType,
        BigDecimal baseSalaryAmount,
        BigDecimal hourlyRateAmount,
        BigDecimal daysPayable,
        BigDecimal leaveDays,
        BigDecimal absenceDays,
        BigDecimal restDays,
        int lateCount,
        BigDecimal regularHours,
        BigDecimal overtimeHours,
        List<PayrollLineItemDraft> baseItems,
        boolean includeInFiscal,
        PayrollPreferencesRow preferences
    ) {
        var items = new ArrayList<PayrollLineItemDraft>();
        items.addAll(baseItems.stream()
            .filter((item) -> !"computed_tax".equals(item.sourceType()))
            .toList());

        var earningTotal = sumAmounts(items, "earning");
        var attendanceReductionTotal = items.stream()
            .filter((item) -> "deduction".equals(item.category()) && "ABSENCE_DEDUCTION".equals(item.code()))
            .map(PayrollLineItemDraft::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        var taxableBase = includeInFiscal
            ? earningTotal.subtract(attendanceReductionTotal).max(BigDecimal.ZERO)
            : BigDecimal.ZERO;

        if (includeInFiscal) {
            var isrAmount = taxableBase.multiply(preferences.isrRate());
            var imssAmount = taxableBase.multiply(preferences.imssEmployeeRate());
            var infonavitAmount = taxableBase.multiply(preferences.infonavitEmployeeRate());
            var employerImssAmount = taxableBase.multiply(preferences.imssEmployerRate());
            var employerInfonavitAmount = taxableBase.multiply(preferences.infonavitEmployerRate());
            var employerSarAmount = taxableBase.multiply(preferences.sarEmployerRate());

            if (isrAmount.compareTo(BigDecimal.ZERO) > 0) {
                items.add(new PayrollLineItemDraft("ISR", "deduction", "ISR", isrAmount, "computed_tax", 80));
            }
            if (imssAmount.compareTo(BigDecimal.ZERO) > 0) {
                items.add(new PayrollLineItemDraft("IMSS", "deduction", "IMSS", imssAmount, "computed_tax", 90));
            }
            if (infonavitAmount.compareTo(BigDecimal.ZERO) > 0) {
                items.add(new PayrollLineItemDraft("INFONAVIT", "deduction", "INFONAVIT", infonavitAmount, "computed_tax", 100));
            }
            if (employerImssAmount.compareTo(BigDecimal.ZERO) > 0) {
                items.add(new PayrollLineItemDraft("EMPLOYER_IMSS", "employer_contribution", "Employer IMSS", employerImssAmount, "computed_tax", 110));
            }
            if (employerInfonavitAmount.compareTo(BigDecimal.ZERO) > 0) {
                items.add(new PayrollLineItemDraft("EMPLOYER_INFONAVIT", "employer_contribution", "Employer INFONAVIT", employerInfonavitAmount, "computed_tax", 120));
            }
            if (employerSarAmount.compareTo(BigDecimal.ZERO) > 0) {
                items.add(new PayrollLineItemDraft("EMPLOYER_SAR", "employer_contribution", "Employer SAR", employerSarAmount, "computed_tax", 130));
            }
        }

        var grossAmount = scaled(sumAmounts(items, "earning"));
        var deductionsAmount = scaled(sumAmounts(items, "deduction"));
        var employerContributionsAmount = scaled(sumAmounts(items, "employer_contribution"));
        var netAmount = scaled(grossAmount.subtract(deductionsAmount));

        return new LineComputation(
            scaled(baseSalaryAmount),
            scaled(hourlyRateAmount),
            scaled(daysPayable),
            scaled(leaveDays),
            scaled(absenceDays),
            scaled(restDays),
            lateCount,
            scaled(regularHours),
            scaled(overtimeHours),
            grossAmount,
            deductionsAmount,
            employerContributionsAmount,
            netAmount,
            items.stream().sorted((left, right) -> Integer.compare(left.displayOrder(), right.displayOrder())).toList()
        );
    }

    private void recomputeRunTotals(long runId) {
        var lines = loadRunLines(runId);
        var employeesCount = lines.size();
        var grossAmount = lines.stream().map(PayrollRunLineRow::grossAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        var deductionsAmount = lines.stream().map(PayrollRunLineRow::deductionsAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        var employerContributionsAmount = lines.stream().map(PayrollRunLineRow::employerContributionsAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        var netAmount = lines.stream().map(PayrollRunLineRow::netAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        jdbcTemplate.update(
            """
                UPDATE hr_payroll_runs
                SET employees_count = ?,
                    gross_amount = ?,
                    deductions_amount = ?,
                    employer_contributions_amount = ?,
                    net_amount = ?
                WHERE id = ?
                """,
            employeesCount,
            scaled(grossAmount),
            scaled(deductionsAmount),
            scaled(employerContributionsAmount),
            scaled(netAmount),
            runId
        );
    }

    private void updateRunStatus(long runId, String status, long userId) {
        var now = Timestamp.valueOf(LocalDateTime.now());
        switch (status) {
            case "processed" -> jdbcTemplate.update(
                "UPDATE hr_payroll_runs SET status = 'processed', processed_by = ?, processed_at = ? WHERE id = ?",
                userId,
                now,
                runId
            );
            case "approved" -> jdbcTemplate.update(
                "UPDATE hr_payroll_runs SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?",
                userId,
                now,
                runId
            );
            case "paid" -> jdbcTemplate.update(
                "UPDATE hr_payroll_runs SET status = 'paid', paid_by = ?, paid_at = ? WHERE id = ?",
                userId,
                now,
                runId
            );
            default -> throw new IllegalArgumentException("Unsupported payroll run status.");
        }
    }

    private void requireRunStatus(PayrollRunRow run, String expectedStatus) {
        if (!expectedStatus.equals(run.status())) {
            throw new IllegalArgumentException("Payroll run must be in " + expectedStatus + " status.");
        }
    }

    private List<PayrollRunLineRow> loadRunLines(long runId) {
        return jdbcTemplate.query(
            """
                SELECT id, run_id, company_id, employee_id, employee_number_snapshot, employee_name_snapshot, position_title_snapshot,
                       department_snapshot, unit_id_snapshot, unit_name_snapshot, business_id_snapshot, business_name_snapshot,
                       pay_period_snapshot, salary_type_snapshot, base_salary_amount, hourly_rate_amount, days_payable, leave_days,
                       absence_days, rest_days, late_count, regular_hours, overtime_hours, include_in_fiscal, gross_amount,
                       deductions_amount, employer_contributions_amount, net_amount, notes
                FROM hr_payroll_run_lines
                WHERE run_id = ?
                ORDER BY employee_name_snapshot ASC, id ASC
                """,
            (rs, rowNum) -> mapRunLineRow(rs),
            runId
        );
    }

    private PayrollRunLineRow loadRunLine(long runId, long lineId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id, run_id, company_id, employee_id, employee_number_snapshot, employee_name_snapshot, position_title_snapshot,
                       department_snapshot, unit_id_snapshot, unit_name_snapshot, business_id_snapshot, business_name_snapshot,
                       pay_period_snapshot, salary_type_snapshot, base_salary_amount, hourly_rate_amount, days_payable, leave_days,
                       absence_days, rest_days, late_count, regular_hours, overtime_hours, include_in_fiscal, gross_amount,
                       deductions_amount, employer_contributions_amount, net_amount, notes
                FROM hr_payroll_run_lines
                WHERE run_id = ? AND id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapRunLineRow(rs),
            runId,
            lineId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Payroll run line not found.");
        }
        return rows.getFirst();
    }

    private PayrollRunLineRow loadRunLine(long lineId) {
        var rows = jdbcTemplate.query(
            """
                SELECT id, run_id, company_id, employee_id, employee_number_snapshot, employee_name_snapshot, position_title_snapshot,
                       department_snapshot, unit_id_snapshot, unit_name_snapshot, business_id_snapshot, business_name_snapshot,
                       pay_period_snapshot, salary_type_snapshot, base_salary_amount, hourly_rate_amount, days_payable, leave_days,
                       absence_days, rest_days, late_count, regular_hours, overtime_hours, include_in_fiscal, gross_amount,
                       deductions_amount, employer_contributions_amount, net_amount, notes
                FROM hr_payroll_run_lines
                WHERE id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapRunLineRow(rs),
            lineId
        );
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Payroll run line not found.");
        }
        return rows.getFirst();
    }

    private List<PayrollRunLineItemRow> loadRunLineItems(long runLineId) {
        return jdbcTemplate.query(
            """
                SELECT id, run_line_id, code, category, label, amount, source_type, display_order
                FROM hr_payroll_run_line_items
                WHERE run_line_id = ?
                ORDER BY display_order ASC, id ASC
                """,
            (rs, rowNum) -> mapRunLineItemRow(rs),
            runLineId
        );
    }

    private List<PayrollRunLineItemRow> loadRunLineItemsBySource(long runLineId, String sourceType) {
        return jdbcTemplate.query(
            """
                SELECT id, run_line_id, code, category, label, amount, source_type, display_order
                FROM hr_payroll_run_line_items
                WHERE run_line_id = ? AND source_type = ?
                ORDER BY display_order ASC, id ASC
                """,
            (rs, rowNum) -> mapRunLineItemRow(rs),
            runLineId,
            sourceType
        );
    }

    private Map<LocalDate, PayrollDailyRecordRow> loadDailyRecords(long companyId, long employeeId, LocalDate startDate, LocalDate endDate) {
        var rows = jdbcTemplate.query(
            """
                SELECT attendance_date,
                       system_status,
                       corrected_status,
                       first_check_in_at,
                       last_check_out_at
                FROM hr_attendance_daily_records
                WHERE company_id = ?
                  AND employee_id = ?
                  AND attendance_date BETWEEN ? AND ?
                """,
            (rs, rowNum) -> new PayrollDailyRecordRow(
                rs.getObject("attendance_date", LocalDate.class),
                normalizeNullableAttendanceStatus(rs.getString("system_status")),
                normalizeNullableAttendanceStatus(rs.getString("corrected_status")),
                toLocalDateTime(rs.getTimestamp("first_check_in_at")),
                toLocalDateTime(rs.getTimestamp("last_check_out_at"))
            ),
            companyId,
            employeeId,
            startDate,
            endDate
        );
        var result = new HashMap<LocalDate, PayrollDailyRecordRow>();
        for (var row : rows) {
            result.put(row.attendanceDate(), row);
        }
        return result;
    }

    private List<PayrollScheduleWindow> loadScheduleWindows(long companyId, long employeeId, LocalDate startDate, LocalDate endDate) {
        return jdbcTemplate.query(
            """
                SELECT a.template_id,
                       a.effective_start_date,
                       a.effective_end_date,
                       d.day_of_week,
                       d.start_time,
                       d.end_time,
                       d.late_after_minutes,
                       d.is_rest_day
                FROM hr_employee_schedule_assignments a
                JOIN hr_schedule_template_days d ON d.template_id = a.template_id
                WHERE a.company_id = ?
                  AND a.employee_id = ?
                  AND LOWER(COALESCE(a.status, 'active')) = 'active'
                  AND a.effective_start_date <= ?
                  AND (a.effective_end_date IS NULL OR a.effective_end_date >= ?)
                ORDER BY a.effective_start_date DESC, a.id DESC
                """,
            (rs, rowNum) -> new PayrollScheduleWindow(
                rs.getLong("template_id"),
                rs.getObject("effective_start_date", LocalDate.class),
                rs.getObject("effective_end_date", LocalDate.class),
                rs.getInt("day_of_week"),
                rs.getObject("start_time", LocalTime.class),
                rs.getObject("end_time", LocalTime.class),
                rs.getInt("late_after_minutes"),
                rs.getBoolean("is_rest_day")
            ),
            companyId,
            employeeId,
            endDate,
            startDate
        );
    }

    private PayrollScheduleWindow resolveScheduleWindow(List<PayrollScheduleWindow> windows, LocalDate date) {
        return windows.stream()
            .filter((window) -> window.dayOfWeek() == date.getDayOfWeek().getValue())
            .filter((window) -> !date.isBefore(window.effectiveStartDate()))
            .filter((window) -> window.effectiveEndDate() == null || !date.isAfter(window.effectiveEndDate()))
            .findFirst()
            .orElse(null);
    }

    private String resolvePayrollStatus(PayrollDailyRecordRow record, PayrollScheduleWindow window) {
        if (record != null && !isBlank(record.correctedStatus())) {
            return record.correctedStatus();
        }
        if (record != null && !isBlank(record.systemStatus())) {
            return record.systemStatus();
        }
        if (window == null) {
            return null;
        }
        return window.isRestDay() ? "rest" : "absence";
    }

    private BigDecimal scheduledHours(PayrollScheduleWindow window) {
        if (window == null || window.isRestDay() || window.startTime() == null || window.endTime() == null) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(Duration.between(window.startTime(), window.endTime()).toMinutes())
            .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal resolveWorkedHours(PayrollDailyRecordRow record, BigDecimal scheduledHours) {
        if (record == null || record.firstCheckInAt() == null) {
            return BigDecimal.ZERO;
        }
        if (record.lastCheckOutAt() == null) {
            return scheduledHours;
        }
        if (!record.lastCheckOutAt().isAfter(record.firstCheckInAt())) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(Duration.between(record.firstCheckInAt(), record.lastCheckOutAt()).toMinutes())
            .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    }

    private void storeLineItems(long runLineId, List<PayrollLineItemDraft> items) {
        for (var item : items) {
            jdbcTemplate.update(
                """
                    INSERT INTO hr_payroll_run_line_items
                    (run_line_id, code, category, label, amount, source_type, display_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                runLineId,
                item.code(),
                item.category(),
                item.label(),
                scaled(item.amount()),
                item.sourceType(),
                item.displayOrder()
            );
        }
    }

    private List<ManualPayrollItemInput> parseManualItems(Object rawValue) {
        if (!(rawValue instanceof List<?> rawItems)) {
            return List.of();
        }

        var items = new ArrayList<ManualPayrollItemInput>();
        for (var rawItem : rawItems) {
            if (!(rawItem instanceof Map<?, ?> rawMap)) {
                throw new IllegalArgumentException("manual_items entries must be objects.");
            }
            var map = new LinkedHashMap<String, Object>();
            rawMap.forEach((key, value) -> map.put(String.valueOf(key), value));

            var category = normalizeManualCategory(stringValue(map, "category"));
            var label = stringValue(map, "label");
            if (label.isBlank()) {
                throw new IllegalArgumentException("manual item label is required.");
            }
            var amount = parseBigDecimal(map, "amount");
            if (amount == null || amount.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("manual item amount must be zero or greater.");
            }
            items.add(new ManualPayrollItemInput(
                "earning".equals(category) ? "MANUAL_EARNING" : "MANUAL_DEDUCTION",
                category,
                label,
                scaled(amount)
            ));
        }
        return items;
    }

    private String normalizeManualCategory(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "earning", "percepcion", "perception" -> "earning";
            case "deduction", "deduccion", "deduction_manual" -> "deduction";
            default -> throw new IllegalArgumentException("manual item category must be earning or deduction.");
        };
    }

    private boolean matchesRunFilters(PayrollRunRow run, Map<String, String> filters) {
        var status = safe(filters.get("status")).trim().toLowerCase(Locale.ROOT);
        if (!status.isBlank() && !status.equals(run.status())) {
            return false;
        }

        var payPeriod = safe(filters.get("pay_period")).trim().toLowerCase(Locale.ROOT);
        if (!payPeriod.isBlank() && !payPeriod.equals(run.payPeriod())) {
            return false;
        }

        var groupingMode = safe(filters.get("grouping_mode")).trim().toLowerCase(Locale.ROOT);
        if (!groupingMode.isBlank() && !groupingMode.equals(run.groupingMode())) {
            return false;
        }

        var periodFrom = parseOptionalDate(filters.get("period_from"));
        if (periodFrom != null && run.periodEndDate().isBefore(periodFrom)) {
            return false;
        }

        var periodTo = parseOptionalDate(filters.get("period_to"));
        if (periodTo != null && run.periodStartDate().isAfter(periodTo)) {
            return false;
        }

        var unitId = safe(filters.get("unit_id")).trim();
        if (!unitId.isBlank() && !"unit".equals(run.groupingMode())) {
            return false;
        }
        if (!unitId.isBlank() && !("unit:" + unitId).equals(run.groupingKey())) {
            return false;
        }

        var businessId = safe(filters.get("business_id")).trim();
        if (!businessId.isBlank() && !"business".equals(run.groupingMode())) {
            return false;
        }
        if (!businessId.isBlank() && !("business:" + businessId).equals(run.groupingKey())) {
            return false;
        }

        return true;
    }

    private Map<String, Object> toPreferencesMap(PayrollPreferencesRow preferences) {
        var body = new LinkedHashMap<String, Object>();
        body.put("grouping_mode", preferences.groupingMode());
        body.put("default_daily_hours", scaled(preferences.defaultDailyHours()));
        body.put("pay_leave_days", preferences.payLeaveDays());
        body.put("isr_rate", scaled(preferences.isrRate()));
        body.put("imss_employee_rate", scaled(preferences.imssEmployeeRate()));
        body.put("infonavit_employee_rate", scaled(preferences.infonavitEmployeeRate()));
        body.put("imss_employer_rate", scaled(preferences.imssEmployerRate()));
        body.put("infonavit_employer_rate", scaled(preferences.infonavitEmployerRate()));
        body.put("sar_employer_rate", scaled(preferences.sarEmployerRate()));
        return body;
    }

    private Map<String, Object> toRunSummaryMap(PayrollRunRow run) {
        var body = new LinkedHashMap<String, Object>();
        body.put("id", run.id());
        body.put("grouping_mode", run.groupingMode());
        body.put("grouping_key", run.groupingKey());
        body.put("grouping_label", run.groupingLabel());
        body.put("pay_period", run.payPeriod());
        body.put("period_start_date", run.periodStartDate().toString());
        body.put("period_end_date", run.periodEndDate().toString());
        body.put("status", run.status());
        body.put("employees_count", run.employeesCount());
        body.put("gross_amount", scaled(run.grossAmount()));
        body.put("deductions_amount", scaled(run.deductionsAmount()));
        body.put("employer_contributions_amount", scaled(run.employerContributionsAmount()));
        body.put("net_amount", scaled(run.netAmount()));
        body.put("created_at", run.createdAt() == null ? null : run.createdAt().toString());
        return body;
    }

    private Map<String, Object> toRunLineItemMap(PayrollRunLineItemRow item) {
        var body = new LinkedHashMap<String, Object>();
        body.put("id", item.id());
        body.put("code", item.code());
        body.put("category", item.category());
        body.put("label", item.label());
        body.put("amount", scaled(item.amount()));
        body.put("source_type", item.sourceType());
        return body;
    }

    private PayrollLineItemDraft toDraftItem(PayrollRunLineItemRow row) {
        return new PayrollLineItemDraft(
            row.code(),
            row.category(),
            row.label(),
            row.amount(),
            row.sourceType(),
            row.displayOrder()
        );
    }

    private PayrollRunRow mapRunRow(ResultSet rs) throws SQLException {
        return new PayrollRunRow(
            rs.getLong("id"),
            rs.getLong("company_id"),
            safe(rs.getString("grouping_mode")),
            safe(rs.getString("grouping_key")),
            safe(rs.getString("grouping_label")),
            safe(rs.getString("pay_period")),
            rs.getObject("period_start_date", LocalDate.class),
            rs.getObject("period_end_date", LocalDate.class),
            safe(rs.getString("status")),
            rs.getInt("employees_count"),
            scaled(rs.getBigDecimal("gross_amount")),
            scaled(rs.getBigDecimal("deductions_amount")),
            scaled(rs.getBigDecimal("employer_contributions_amount")),
            scaled(rs.getBigDecimal("net_amount")),
            toLocalDateTime(rs.getTimestamp("created_at"))
        );
    }

    private PayrollRunLineRow mapRunLineRow(ResultSet rs) throws SQLException {
        return new PayrollRunLineRow(
            rs.getLong("id"),
            rs.getLong("run_id"),
            rs.getLong("company_id"),
            rs.getLong("employee_id"),
            safe(rs.getString("employee_number_snapshot")),
            safe(rs.getString("employee_name_snapshot")),
            safe(rs.getString("position_title_snapshot")),
            safe(rs.getString("department_snapshot")),
            getNullableLong(rs, "unit_id_snapshot"),
            safe(rs.getString("unit_name_snapshot")),
            getNullableLong(rs, "business_id_snapshot"),
            safe(rs.getString("business_name_snapshot")),
            safe(rs.getString("pay_period_snapshot")),
            safe(rs.getString("salary_type_snapshot")),
            scaled(rs.getBigDecimal("base_salary_amount")),
            nullableBigDecimal(rs.getBigDecimal("hourly_rate_amount")),
            scaled(rs.getBigDecimal("days_payable")),
            scaled(rs.getBigDecimal("leave_days")),
            scaled(rs.getBigDecimal("absence_days")),
            scaled(rs.getBigDecimal("rest_days")),
            rs.getInt("late_count"),
            scaled(rs.getBigDecimal("regular_hours")),
            scaled(rs.getBigDecimal("overtime_hours")),
            rs.getBoolean("include_in_fiscal"),
            scaled(rs.getBigDecimal("gross_amount")),
            scaled(rs.getBigDecimal("deductions_amount")),
            scaled(rs.getBigDecimal("employer_contributions_amount")),
            scaled(rs.getBigDecimal("net_amount")),
            safe(rs.getString("notes"))
        );
    }

    private PayrollRunLineItemRow mapRunLineItemRow(ResultSet rs) throws SQLException {
        return new PayrollRunLineItemRow(
            rs.getLong("id"),
            rs.getLong("run_line_id"),
            safe(rs.getString("code")),
            safe(rs.getString("category")),
            safe(rs.getString("label")),
            scaled(rs.getBigDecimal("amount")),
            safe(rs.getString("source_type")),
            rs.getInt("display_order")
        );
    }

    private BigDecimal scaled(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal scaledNullable(BigDecimal value) {
        return value == null ? null : value.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal nullableBigDecimal(BigDecimal value) {
        return value == null ? null : value.setScale(2, RoundingMode.HALF_UP);
    }

    private LocalDate normalizeRunPeriodEndDate(String payPeriod, LocalDate periodStartDate) {
        var monthEnd = periodStartDate.withDayOfMonth(periodStartDate.lengthOfMonth());
        var configuredEndDate = switch (payPeriod) {
            case "weekly" -> periodStartDate.plusDays(6);
            case "biweekly" -> periodStartDate.plusDays(13);
            case "monthly" -> monthEnd;
            default -> monthEnd;
        };

        return configuredEndDate.isAfter(monthEnd) ? monthEnd : configuredEndDate;
    }

    private BigDecimal normalizePositiveDecimal(BigDecimal value, BigDecimal fallback, String key) {
        var resolved = value == null ? fallback : value;
        if (resolved == null || resolved.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(key + " must be greater than zero.");
        }
        return scaled(resolved);
    }

    private BigDecimal normalizeRate(BigDecimal value, BigDecimal fallback, String key) {
        var resolved = value == null ? fallback : value;
        if (resolved == null || resolved.compareTo(BigDecimal.ZERO) < 0 || resolved.compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException(key + " must be between 0 and 1.");
        }
        return resolved.setScale(5, RoundingMode.HALF_UP);
    }

    private String normalizeGroupingMode(String value, String fallback) {
        var normalized = value == null || value.isBlank() ? fallback : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "single", "nomina-unica" -> "single";
            case "unit", "unidad-negocio" -> "unit";
            case "business", "negocio" -> "business";
            default -> throw new IllegalArgumentException("grouping_mode must be single, unit, or business.");
        };
    }

    private String normalizePayPeriod(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "weekly", "semanal" -> "weekly";
            case "biweekly", "quincenal" -> "biweekly";
            case "monthly", "mensual" -> "monthly";
            default -> throw new IllegalArgumentException("pay_period must be weekly, biweekly, or monthly.");
        };
    }

    private String normalizeNullableAttendanceStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        var normalized = value.trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        return switch (normalized) {
            case "a_tiempo", "presente", "asistencia", "on_time" -> "on_time";
            case "retardo", "late" -> "late";
            case "permiso", "leave" -> "leave";
            case "descanso", "rest" -> "rest";
            case "falta", "absence" -> "absence";
            default -> normalized;
        };
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private BigDecimal sumAmounts(List<PayrollLineItemDraft> items, String category) {
        return items.stream()
            .filter((item) -> category.equals(item.category()))
            .map(PayrollLineItemDraft::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumAmounts(List<PayrollLineItemDraft> items) {
        return items.stream()
            .map(PayrollLineItemDraft::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private LocalDate parseOptionalDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Date filters must use YYYY-MM-DD format.");
        }
    }

    private String csv(Object value) {
        var text = value == null ? "" : String.valueOf(value);
        return "\"" + text.replace("\"", "\"\"") + "\"";
    }

    private String truncatePdf(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, Math.max(0, maxLength - 1));
    }

    private LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    private Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private boolean parseBoolean(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        if (value instanceof String string) {
            var normalized = string.trim().toLowerCase(Locale.ROOT);
            return switch (normalized) {
                case "true", "1", "yes", "si", "sí" -> true;
                case "", "false", "0", "no" -> false;
                default -> throw new IllegalArgumentException("Boolean payload is invalid.");
            };
        }
        return false;
    }

    private record PayrollPreferencesRow(
        long companyId,
        String groupingMode,
        BigDecimal defaultDailyHours,
        boolean payLeaveDays,
        BigDecimal isrRate,
        BigDecimal imssEmployeeRate,
        BigDecimal infonavitEmployeeRate,
        BigDecimal imssEmployerRate,
        BigDecimal infonavitEmployerRate,
        BigDecimal sarEmployerRate
    ) {
    }

    private record PayrollRunRow(
        long id,
        long companyId,
        String groupingMode,
        String groupingKey,
        String groupingLabel,
        String payPeriod,
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        String status,
        int employeesCount,
        BigDecimal grossAmount,
        BigDecimal deductionsAmount,
        BigDecimal employerContributionsAmount,
        BigDecimal netAmount,
        LocalDateTime createdAt
    ) {
    }

    private record PayrollRunLineRow(
        long id,
        long runId,
        long companyId,
        long employeeId,
        String employeeNumberSnapshot,
        String employeeNameSnapshot,
        String positionTitleSnapshot,
        String departmentSnapshot,
        Long unitIdSnapshot,
        String unitNameSnapshot,
        Long businessIdSnapshot,
        String businessNameSnapshot,
        String payPeriodSnapshot,
        String salaryTypeSnapshot,
        BigDecimal baseSalaryAmount,
        BigDecimal hourlyRateAmount,
        BigDecimal daysPayable,
        BigDecimal leaveDays,
        BigDecimal absenceDays,
        BigDecimal restDays,
        int lateCount,
        BigDecimal regularHours,
        BigDecimal overtimeHours,
        boolean includeInFiscal,
        BigDecimal grossAmount,
        BigDecimal deductionsAmount,
        BigDecimal employerContributionsAmount,
        BigDecimal netAmount,
        String notes
    ) {
    }

    private record PayrollRunLineItemRow(
        long id,
        long runLineId,
        String code,
        String category,
        String label,
        BigDecimal amount,
        String sourceType,
        int displayOrder
    ) {
    }

    private record PayrollEmployeeRow(
        long id,
        String employeeNumber,
        String fullName,
        String positionTitle,
        String department,
        String status,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName,
        BigDecimal salary,
        BigDecimal hourlyRate,
        String salaryType,
        String payPeriod
    ) {
    }

    private record PayrollEmployeeGroup(
        String groupingKey,
        String groupingLabel,
        List<PayrollEmployeeRow> employees
    ) {
    }

    private record PayrollDailyRecordRow(
        LocalDate attendanceDate,
        String systemStatus,
        String correctedStatus,
        LocalDateTime firstCheckInAt,
        LocalDateTime lastCheckOutAt
    ) {
    }

    private record PayrollScheduleWindow(
        long templateId,
        LocalDate effectiveStartDate,
        LocalDate effectiveEndDate,
        int dayOfWeek,
        LocalTime startTime,
        LocalTime endTime,
        int lateAfterMinutes,
        boolean isRestDay
    ) {
    }

    private record PayrollLineItemDraft(
        String code,
        String category,
        String label,
        BigDecimal amount,
        String sourceType,
        int displayOrder
    ) {
    }

    private record ManualPayrollItemInput(
        String code,
        String category,
        String label,
        BigDecimal amount
    ) {
    }

    private record LineComputation(
        BigDecimal baseSalaryAmount,
        BigDecimal hourlyRateAmount,
        BigDecimal daysPayable,
        BigDecimal leaveDays,
        BigDecimal absenceDays,
        BigDecimal restDays,
        int lateCount,
        BigDecimal regularHours,
        BigDecimal overtimeHours,
        BigDecimal grossAmount,
        BigDecimal deductionsAmount,
        BigDecimal employerContributionsAmount,
        BigDecimal netAmount,
        List<PayrollLineItemDraft> items
    ) {
    }
}
