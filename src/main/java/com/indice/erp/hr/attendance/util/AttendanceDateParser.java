package com.indice.erp.hr.attendance.util;

import java.sql.Date;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;

import static com.indice.erp.hr.shared.HrPayloadUtils.parseDate;


public final class AttendanceDateParser {

    private AttendanceDateParser() {
    }

    public static LocalDate parseDate(String value) {
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Date must use YYYY-MM-DD format.");
        }
    }

    public static YearMonth parseMonth(String value) {
        try {
            return YearMonth.parse(value);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Month must use YYYY-MM format.");
        }
    }
}
