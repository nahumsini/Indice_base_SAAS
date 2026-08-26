package com.indice.erp.sales.publiccatalog;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

final class IcalAvailabilityParser {

    private static final DateTimeFormatter DATE = DateTimeFormatter.BASIC_ISO_DATE;
    private static final DateTimeFormatter LOCAL_SECONDS = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss");
    private static final DateTimeFormatter LOCAL_MINUTES = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmm");
    private static final int MAX_UNFOLDED_LINES = 100_000;

    Set<LocalDate> occupiedDates(String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Availability calendar is empty.");
        }
        var lines = unfold(content);
        if (lines.stream().noneMatch(line -> "BEGIN:VCALENDAR".equalsIgnoreCase(line.trim()))) {
            throw new IllegalArgumentException("Availability calendar format is invalid.");
        }
        var occupied = new LinkedHashSet<LocalDate>();
        Map<String, Property> event = null;
        for (var line : lines) {
            if ("BEGIN:VEVENT".equalsIgnoreCase(line.trim())) {
                event = new HashMap<>();
                continue;
            }
            if ("END:VEVENT".equalsIgnoreCase(line.trim())) {
                appendEvent(event, occupied);
                event = null;
                continue;
            }
            if (event == null) continue;
            var property = property(line);
            if (property != null) event.putIfAbsent(property.name(), property);
        }
        return Set.copyOf(occupied);
    }

    private List<String> unfold(String content) {
        var physical = content.replace("\r\n", "\n").replace('\r', '\n').split("\n", -1);
        var unfolded = new ArrayList<String>();
        for (var line : physical) {
            if ((line.startsWith(" ") || line.startsWith("\t")) && !unfolded.isEmpty()) {
                var last = unfolded.size() - 1;
                unfolded.set(last, unfolded.get(last) + line.substring(1));
            } else {
                unfolded.add(line);
                if (unfolded.size() > MAX_UNFOLDED_LINES) {
                    throw new IllegalArgumentException("Availability calendar is too large.");
                }
            }
        }
        return unfolded;
    }

    private Property property(String line) {
        var colon = line.indexOf(':');
        if (colon <= 0) return null;
        var header = line.substring(0, colon).split(";");
        var parameters = new HashMap<String, String>();
        for (int index = 1; index < header.length; index++) {
            var equals = header[index].indexOf('=');
            if (equals > 0) {
                parameters.put(header[index].substring(0, equals).toUpperCase(Locale.ROOT),
                    header[index].substring(equals + 1).replace("\"", ""));
            }
        }
        return new Property(header[0].toUpperCase(Locale.ROOT), parameters, line.substring(colon + 1).trim());
    }

    private void appendEvent(Map<String, Property> event, Set<LocalDate> occupied) {
        if (event == null || event.isEmpty()) return;
        if (equalsValue(event.get("STATUS"), "CANCELLED") || equalsValue(event.get("TRANSP"), "TRANSPARENT")) {
            return;
        }
        var startProperty = event.get("DTSTART");
        if (startProperty == null) return;
        var start = parseTemporal(startProperty);
        var endProperty = event.get("DTEND");
        var end = endProperty == null ? null : parseTemporal(endProperty);
        var first = start.date();
        LocalDate endExclusive;
        if (end == null) {
            endExclusive = first.plusDays(1);
        } else if (end.dateOnly()) {
            endExclusive = end.date();
        } else {
            endExclusive = end.time().equals(LocalTime.MIDNIGHT)
                ? end.date() : end.date().plusDays(1);
        }
        if (!endExclusive.isAfter(first)) endExclusive = first.plusDays(1);
        if (java.time.temporal.ChronoUnit.DAYS.between(first, endExclusive) > 3660) {
            throw new IllegalArgumentException("Availability event range is too large.");
        }
        for (var date = first; date.isBefore(endExclusive); date = date.plusDays(1)) {
            occupied.add(date);
        }
    }

    private ParsedTemporal parseTemporal(Property property) {
        var value = property.value();
        var dateOnly = "DATE".equalsIgnoreCase(property.parameters().get("VALUE"))
            || value.matches("\\d{8}");
        try {
            if (dateOnly) return new ParsedTemporal(LocalDate.parse(value, DATE), LocalTime.MIDNIGHT, true);
            var zoneName = property.parameters().get("TZID");
            if (value.endsWith("Z")) {
                var local = parseLocal(value.substring(0, value.length() - 1));
                var zoned = local.atZone(ZoneOffset.UTC);
                return new ParsedTemporal(zoned.toLocalDate(), zoned.toLocalTime(), false);
            }
            if (value.matches(".*[+-]\\d{4}$")) {
                var offset = OffsetDateTime.parse(value, DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmssXX"));
                return new ParsedTemporal(offset.toLocalDate(), offset.toLocalTime(), false);
            }
            var local = parseLocal(value);
            var zone = zoneName == null || zoneName.isBlank() ? ZoneOffset.UTC : safeZone(zoneName);
            var zoned = ZonedDateTime.of(local, zone);
            return new ParsedTemporal(zoned.toLocalDate(), zoned.toLocalTime(), false);
        } catch (DateTimeParseException invalid) {
            throw new IllegalArgumentException("Availability event date is invalid.");
        }
    }

    private LocalDateTime parseLocal(String value) {
        return LocalDateTime.parse(value, value.length() == 13 ? LOCAL_MINUTES : LOCAL_SECONDS);
    }

    private ZoneId safeZone(String value) {
        try {
            return ZoneId.of(value);
        } catch (RuntimeException ignored) {
            return ZoneOffset.UTC;
        }
    }

    private boolean equalsValue(Property property, String expected) {
        return property != null && expected.equalsIgnoreCase(property.value());
    }

    private record Property(String name, Map<String, String> parameters, String value) {
    }

    private record ParsedTemporal(LocalDate date, LocalTime time, boolean dateOnly) {
    }
}
