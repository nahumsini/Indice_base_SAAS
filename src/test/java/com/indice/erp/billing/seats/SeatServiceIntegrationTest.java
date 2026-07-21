package com.indice.erp.billing.seats;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class SeatServiceIntegrationTest {

    private static final String COMPANY_PREFIX = "phase5-seat-test-";
    private static final String EMAIL_PREFIX = "phase5-seat-test-";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private SeatService seats;

    @BeforeEach
    void cleanBefore() {
        cleanTestState();
    }

    @AfterEach
    void cleanAfter() {
        cleanTestState();
    }

    @Test
    void concurrentInvitationsCannotReserveBeyondTheCompanyLimit() throws Exception {
        var suffix = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", COMPANY_PREFIX + suffix);
        var companyId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2a$10$phase5-test', 'Seat Owner')",
            EMAIL_PREFIX + suffix + "@example.com"
        );
        var userId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update(
            "INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, ?, 'owner', 'active', 'all')",
            userId,
            companyId
        );
        jdbc.update(
            "INSERT INTO company_seat_states (company_id, included_seats, purchased_extra_seats) VALUES (?, 2, 0)",
            companyId
        );

        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        var first = CompletableFuture.supplyAsync(() -> reserveAfterBarrier(
            companyId, userId, "first@example.com", "first-" + suffix, ready, start
        ));
        var second = CompletableFuture.supplyAsync(() -> reserveAfterBarrier(
            companyId, userId, "second@example.com", "second-" + suffix, ready, start
        ));
        assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
        start.countDown();

        var results = List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
        assertThat(results).containsExactlyInAnyOrder("RESERVED", "CAPACITY_REJECTED");
        assertThat(seats.snapshot(companyId)).satisfies(snapshot -> {
            assertThat(snapshot.active()).isEqualTo(1);
            assertThat(snapshot.reserved()).isEqualTo(1);
            assertThat(snapshot.limit()).isEqualTo(2);
            assertThat(snapshot.available()).isZero();
        });
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM company_seat_reservations WHERE company_id = ? AND status = 'RESERVED'",
            Integer.class,
            companyId
        )).isEqualTo(1);
    }

    private String reserveAfterBarrier(
        long companyId,
        long userId,
        String email,
        String idempotencyKey,
        CountDownLatch ready,
        CountDownLatch start
    ) {
        ready.countDown();
        try {
            if (!start.await(5, TimeUnit.SECONDS)) {
                return "BARRIER_TIMEOUT";
            }
            seats.reserveInvitation(companyId, email, userId, idempotencyKey);
            return "RESERVED";
        } catch (SeatCapacityExceededException exception) {
            return "CAPACITY_REJECTED";
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return "INTERRUPTED";
        }
    }

    private void cleanTestState() {
        jdbc.update(
            "DELETE FROM user_companies WHERE company_id IN (SELECT id FROM companies WHERE name LIKE ?)",
            COMPANY_PREFIX + "%"
        );
        jdbc.update("DELETE FROM companies WHERE name LIKE ?", COMPANY_PREFIX + "%");
        jdbc.update("DELETE FROM users WHERE email LIKE ?", EMAIL_PREFIX + "%");
    }
}
