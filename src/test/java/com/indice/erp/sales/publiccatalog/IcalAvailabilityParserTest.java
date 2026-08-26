package com.indice.erp.sales.publiccatalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class IcalAvailabilityParserTest {

    private final IcalAvailabilityParser parser = new IcalAvailabilityParser();

    @Test
    void combinesDuplicateAndMultiDayEventsWhileIgnoringCancelledAndTransparentEvents() {
        var occupied = parser.occupiedDates("""
            BEGIN:VCALENDAR
            VERSION:2.0
            BEGIN:VEVENT
            UID:multi-day
            DTSTART;VALUE=DATE:20260810
            DTEND;VALUE=DATE:20260813
            SUMMARY:Occupied
             dates
            END:VEVENT
            BEGIN:VEVENT
            UID:multi-day
            DTSTART;VALUE=DATE:20260810
            DTEND;VALUE=DATE:20260813
            END:VEVENT
            BEGIN:VEVENT
            UID:cancelled
            STATUS:CANCELLED
            DTSTART;VALUE=DATE:20260814
            END:VEVENT
            BEGIN:VEVENT
            UID:transparent
            TRANSP:TRANSPARENT
            DTSTART;VALUE=DATE:20260815
            END:VEVENT
            BEGIN:VEVENT
            UID:ends-at-midnight
            DTSTART;TZID=America/Toronto:20260816T100000
            DTEND;TZID=America/Toronto:20260817T000000
            END:VEVENT
            BEGIN:VEVENT
            UID:crosses-midnight
            DTSTART:20260818T230000Z
            DTEND:20260819T010000Z
            END:VEVENT
            END:VCALENDAR
            """);

        assertThat(occupied).containsExactlyInAnyOrder(
            LocalDate.of(2026, 8, 10),
            LocalDate.of(2026, 8, 11),
            LocalDate.of(2026, 8, 12),
            LocalDate.of(2026, 8, 16),
            LocalDate.of(2026, 8, 18),
            LocalDate.of(2026, 8, 19));
    }

    @Test
    void acceptsAnEmptyCalendarButRejectsNonCalendarContent() {
        assertThat(parser.occupiedDates("BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR"))
            .isEmpty();
        assertThatThrownBy(() -> parser.occupiedDates("not a calendar"))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
