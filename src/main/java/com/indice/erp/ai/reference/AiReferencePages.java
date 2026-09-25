package com.indice.erp.ai.reference;

import com.indice.erp.ai.reference.AiReferenceResolverContracts.PageRequest;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.ReferencePage;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Base64;
import java.util.List;
import java.util.Locale;

/** Pagination for the operational reference tools; cursors carry no authority. */
final class AiReferencePages {
    private AiReferencePages() { }

    static Request normalize(PageRequest candidate) {
        var request = candidate == null ? new PageRequest(null, null, null) : candidate;
        var query = request.query() == null ? "" : request.query().trim().toLowerCase(Locale.ROOT);
        var limit = request.limit() == null ? 25 : request.limit();
        if (query.length() > 120 || limit < 1 || limit > 50) throw new IllegalArgumentException("Invalid reference filters.");
        var offset = 0;
        if (request.cursor() != null && !request.cursor().isBlank()) {
            try {
                if (request.cursor().length() > 256) throw new IllegalArgumentException();
                var decoded = new String(Base64.getUrlDecoder().decode(request.cursor()), StandardCharsets.UTF_8);
                if (!decoded.startsWith("v1:")) throw new IllegalArgumentException();
                offset = Integer.parseInt(decoded.substring(3));
                if (offset < 0 || offset > Integer.MAX_VALUE - 50) throw new IllegalArgumentException();
            } catch (IllegalArgumentException exception) {
                throw new IllegalArgumentException("cursor is invalid.");
            }
        }
        return new Request(query, limit, offset);
    }

    static <T> ReferencePage<T> all(Clock clock, String scope, List<T> items, Request request) {
        if (request.offset() > items.size()) throw new IllegalArgumentException("cursor is no longer valid for this result set.");
        return page(clock, scope, items.subList(request.offset(), Math.min(items.size(), request.offset() + request.limit())),
            items.size(), request);
    }

    static <T> ReferencePage<T> page(Clock clock, String scope, List<T> items, int total, Request request) {
        var next = request.offset() + items.size();
        var hasMore = next < total;
        var cursor = hasMore ? Base64.getUrlEncoder().withoutPadding()
            .encodeToString(("v1:" + next).getBytes(StandardCharsets.UTF_8)) : null;
        return new ReferencePage<>(clock.instant(), scope, List.copyOf(items), items.size(), total, hasMore, cursor);
    }

    static boolean matches(String query, String... values) {
        if (query.isBlank()) return true;
        for (var value : values) if (value != null && value.toLowerCase(Locale.ROOT).contains(query)) return true;
        return false;
    }

    record Request(String query, int limit, int offset) { }
}
