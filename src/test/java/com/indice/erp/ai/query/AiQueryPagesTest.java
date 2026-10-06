package com.indice.erp.ai.query;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class AiQueryPagesTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final AuthSessionUser user = new AuthSessionUser(1L, 2L, 3L, "Synthetic", "admin");
    @Test void traversesEveryAuthorizedRecordAndKeepsFullCount() {
        var rows = IntStream.range(0, 135).boxed().toList();
        var first = AiQueryPages.page(mapper, user, "list_tasks", Map.of("limit", 100), rows);
        assertThat(first.items()).hasSize(100); assertThat(first.totalCount()).isEqualTo(135);
        assertThat(first.hasMore()).isTrue();
        var second = AiQueryPages.page(mapper, user, "list_tasks", Map.of("limit", 100, "cursor", first.nextCursor()), rows);
        assertThat(second.items()).isEqualTo(rows.subList(100, 135));
        assertThat(second.hasMore()).isFalse(); assertThat(second.nextCursor()).isNull();
    }
    @Test void cursorsCannotBeReusedAcrossTenantsUsersToolsOrFilters() {
        var first = AiQueryPages.page(mapper, user, "list_tasks", Map.of("status", "pending", "limit", 1), List.of(1, 2));
        var cursor = first.nextCursor();
        assertThatThrownBy(() -> AiQueryPages.page(mapper, new AuthSessionUser(1L, 20L, 3L, "Other", "admin"),
            "list_tasks", Map.of("status", "pending", "cursor", cursor), List.of(1, 2))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> AiQueryPages.page(mapper, user, "search_employees", Map.of("status", "pending", "cursor", cursor), List.of(1, 2))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> AiQueryPages.page(mapper, user, "list_tasks", Map.of("status", "completed", "cursor", cursor), List.of(1, 2))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> AiQueryPages.page(mapper, user, "list_tasks", Map.of("cursor", "invalid"), List.of(1, 2))).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void emptyScopeIsMeasuredAndLimitsAreBounded() {
        var page = AiQueryPages.page(mapper, user, "list_tasks", Map.of(), List.of());
        assertThat(page.totalCount()).isZero(); assertThat(page.hasMore()).isFalse();
        assertThatThrownBy(() -> AiQueryPages.page(mapper, user, "list_tasks", Map.of("limit", 101), List.of(1))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> AiQueryPages.page(mapper, user, "list_tasks", Map.of("limit", 1.5), List.of(1))).isInstanceOf(IllegalArgumentException.class);
    }
}
