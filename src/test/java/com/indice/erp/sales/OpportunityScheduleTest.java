package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.*;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class OpportunityScheduleTest {
    final ZoneId zone = ZoneId.of("America/Toronto");

    @Test void derivesUtcAndKeepsWallTimeIncludingExplicitMidnight() {
        var payload = input("2026-10-18 10:30");
        OpportunitySchedule.normalize(payload, zone);
        assertThat(payload).containsEntry("nextActionAt", LocalDateTime.parse("2026-10-18T10:30"))
                .containsEntry("nextActionScheduledAt", LocalDateTime.parse("2026-10-18T14:30"))
                .containsEntry("nextActionTimezone", "America/Toronto");
        payload = input("2026-10-19T00:00");
        OpportunitySchedule.normalize(payload, zone);
        assertThat(payload.get("nextActionScheduledAt")).isEqualTo(LocalDateTime.parse("2026-10-19T04:00"));
    }

    @Test void dateOnlyAndClearedScheduleHaveNoReminder() {
        var date = input("2026-10-18");
        OpportunitySchedule.normalize(date, zone);
        assertThat(date).containsEntry("nextActionScheduledAt", null).containsEntry("nextActionTimezone", null);
        var empty = input("");
        OpportunitySchedule.normalize(empty, zone);
        assertThat(empty).containsEntry("nextActionAt", null).containsEntry("nextActionScheduledAt", null);
    }

    @Test void rejectsMalformedTimeAndDstGapOrOverlapWithoutGuessing() {
        for (String value : new String[]{"2026-10-18 99:00", "15:30", "2026-03-08 02:30", "2026-11-01 01:30"}) {
            assertThatThrownBy(() -> OpportunitySchedule.normalize(input(value), zone))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test void clientCannotForgeDerivedFieldsOrEraseAnOmittedSchedule() {
        var forged = new LinkedHashMap<String, Object>(Map.of("next_action_scheduled_at", "1999-01-01T12:00",
                "nextActionTimezone", "UTC", "notes", "unchanged schedule"));
        OpportunitySchedule.normalize(forged, zone);
        assertThat(forged).containsOnlyKeys("notes");
        var snake = new LinkedHashMap<String, Object>(Map.of("next_action_at", "2026-10-18 10:30",
                "nextActionScheduledAt", "1999-01-01T12:00"));
        OpportunitySchedule.normalize(snake, zone);
        assertThat(snake.get("nextActionScheduledAt")).isEqualTo(LocalDateTime.parse("2026-10-18T14:30"));
    }

    private LinkedHashMap<String, Object> input(String value) {
        return new LinkedHashMap<>(Map.of("nextActionAt", value));
    }
}
