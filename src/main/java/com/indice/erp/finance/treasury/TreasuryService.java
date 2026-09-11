package com.indice.erp.finance.treasury;

import com.indice.erp.finance.FinanceApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Owner contract for payment-account balances. Other modules append movements here instead of
 * updating finance_payment_accounts directly.
 */
@Service
public class TreasuryService {

    private static final BigDecimal ZERO = new BigDecimal("0.0000");
    private static final Set<String> ACCOUNT_TYPES = Set.of("CASH", "BANK", "CREDIT_CARD", "PETTY_CASH");

    private final JdbcTemplate jdbcTemplate;

    public TreasuryService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Company cash control in original currencies, including collections awaiting settlement. */
    @Transactional(readOnly = true)
    public java.util.Map<String, BigDecimal> ownedCashBalances(long companyId) {
        var balances = new java.util.LinkedHashMap<String, BigDecimal>();
        jdbcTemplate.query("""
            SELECT account.currency_code, SUM(account.current_balance + account.pending_balance) amount
            FROM finance_payment_accounts account
            WHERE account.company_id = ? AND account.deleted_at IS NULL
              AND (account.type IN ('CASH', 'BANK', 'PETTY_CASH') OR account.system_key LIKE 'POS_UNASSIGNED_CARD:%')
              AND NOT EXISTS (SELECT 1 FROM finance_petty_cash_funds fund
                WHERE fund.company_id = account.company_id AND fund.payment_account_id = account.id
                  AND fund.fund_type = 'EXTERNAL_MANAGED')
            GROUP BY account.currency_code
            """, (org.springframework.jdbc.core.RowCallbackHandler) rs -> balances.put(rs.getString(1), rs.getBigDecimal(2)), companyId);
        return balances;
    }

    /** Electronic receipts are not verified cash until their owner settles the pending balance. */
    @Transactional(readOnly = true)
    public int unsettledCollectionAccounts(long companyId) {
        return jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM finance_payment_accounts
            WHERE company_id = ? AND deleted_at IS NULL AND pending_balance <> 0
            """, Integer.class, companyId);
    }

    /** Corporate credit instruments need a documented debt/cash classification, not their credit limit. */
    @Transactional(readOnly = true)
    public int unclassifiedCreditAccounts(long companyId) {
        return jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM finance_payment_accounts
            WHERE company_id = ? AND deleted_at IS NULL AND type = 'CREDIT_CARD'
              AND (system_key IS NULL OR system_key NOT LIKE 'POS_UNASSIGNED_CARD:%')
              AND (current_balance <> 0 OR pending_balance <> 0)
            """, Integer.class, companyId);
    }

    @Transactional(readOnly = true)
    public List<TreasuryAccount> listEligibleAccounts(
            long companyId,
            String currencyCode,
            Long unitId,
            Long businessId) {
        var currency = normalizeCurrency(currencyCode);
        return jdbcTemplate.query(
            """
            SELECT id, company_id, unit_id, business_id, name, type, currency_code,
                   current_balance, pending_balance, status, system_key, is_system_managed
            FROM finance_payment_accounts
            WHERE company_id = ?
              AND currency_code = ?
              AND status = 'ACTIVE'
              AND deleted_at IS NULL
              AND (
                (unit_id IS NULL AND business_id IS NULL)
                OR (? IS NOT NULL AND unit_id = ? AND business_id IS NULL)
                OR (? IS NOT NULL AND business_id = ?)
              )
            ORDER BY is_system_managed DESC, name ASC, id ASC
            """,
            this::mapAccount,
            companyId,
            currency,
            unitId, unitId,
            businessId, businessId
        );
    }

    /** Safe catalog used by collection surfaces before the final currency and scope are known. */
    @Transactional(readOnly = true)
    public List<TreasuryAccount> listBankCollectionDestinations(long companyId) {
        return jdbcTemplate.query(
            """
            SELECT id, company_id, unit_id, business_id, name, type, currency_code,
                   current_balance, pending_balance, status, system_key, is_system_managed
            FROM finance_payment_accounts
            WHERE company_id = ?
              AND type = 'BANK'
              AND status = 'ACTIVE'
              AND deleted_at IS NULL
              AND (system_key IS NULL OR system_key NOT LIKE 'POS_UNASSIGNED_%')
            ORDER BY currency_code ASC, name ASC, id ASC
            """,
            this::mapAccount,
            companyId
        );
    }

    @Transactional(readOnly = true)
    public TreasuryAccount requireEligibleAccount(
            long companyId,
            long accountId,
            String currencyCode,
            Long unitId,
            Long businessId,
            Set<String> allowedTypes) {
        var rows = jdbcTemplate.query(
            """
            SELECT id, company_id, unit_id, business_id, name, type, currency_code,
                   current_balance, pending_balance, status, system_key, is_system_managed
            FROM finance_payment_accounts
            WHERE company_id = ?
              AND id = ?
              AND status = 'ACTIVE'
              AND deleted_at IS NULL
              AND currency_code = ?
              AND (
                (unit_id IS NULL AND business_id IS NULL)
                OR (? IS NOT NULL AND unit_id = ? AND business_id IS NULL)
                OR (? IS NOT NULL AND business_id = ?)
              )
            """,
            this::mapAccount,
            companyId,
            accountId,
            normalizeCurrency(currencyCode),
            unitId, unitId,
            businessId, businessId
        );
        var account = rows.stream().findFirst()
            .orElseThrow(() -> FinanceApiException.badRequest("Payment account is not active or is outside the allowed scope."));
        if (allowedTypes != null && !allowedTypes.isEmpty() && !allowedTypes.contains(account.type())) {
            throw FinanceApiException.badRequest("Payment account type is not valid for this operation.");
        }
        return account;
    }

    @Transactional
    public TreasuryAccount ensureUniversalCash(long companyId, long actorUserId, String currencyCode) {
        return ensureSystemAccount(
            companyId,
            actorUserId,
            normalizeCurrency(currencyCode),
            "UNIVERSAL_CASH:" + normalizeCurrency(currencyCode),
            "Efectivo universal · " + normalizeCurrency(currencyCode) + " · Índice",
            "CASH",
            "Cuenta universal administrada por Índice para recibir efectivo."
        );
    }

    @Transactional
    public TreasuryAccount ensurePosPendingAccount(
            long companyId,
            long actorUserId,
            String currencyCode,
            String paymentMethod) {
        var method = normalizeToken(paymentMethod, "paymentMethod");
        if (!Set.of("CARD", "TRANSFER", "WALLET").contains(method)) {
            throw FinanceApiException.badRequest("Unsupported pending POS payment method.");
        }
        var currency = normalizeCurrency(currencyCode);
        var label = switch (method) {
            case "CARD" -> "Tarjeta";
            case "TRANSFER" -> "Transferencia";
            case "WALLET" -> "Billetera";
            default -> method;
        };
        return ensureSystemAccount(
            companyId,
            actorUserId,
            currency,
            "POS_UNASSIGNED_" + method + ":" + currency,
            "Cobros POS por asignar · " + label + " · " + currency + " · Índice",
            method.equals("CARD") ? "CREDIT_CARD" : "BANK",
            "Cuenta transitoria administrada por Índice; configure el destino definitivo en la caja."
        );
    }

    @Transactional
    public TreasuryMovementResult post(TreasuryMovementCommand command) {
        return post(command, false);
    }

    /** Expense removal compensates only recorded debits; an unassigned legacy payment creates no cash. */
    @Transactional
    public void reverseExpensePayments(long companyId, long expenseId, long userId, String reason) {
        var movements = jdbcTemplate.queryForList("""
            SELECT movement.* FROM finance_payment_account_movements movement
            WHERE movement.company_id = ? AND movement.source_module = 'EXPENSES'
              AND movement.source_type = 'EXPENSE_PAYMENT' AND movement.source_id = ?
              AND NOT EXISTS(SELECT 1 FROM finance_payment_account_movements reversal
                  WHERE reversal.company_id = movement.company_id AND reversal.reversal_of_movement_id = movement.id)
            ORDER BY movement.payment_account_id, movement.id FOR UPDATE
            """, companyId, String.valueOf(expenseId));
        for (var row : movements) {
            long movementId = ((Number) row.get("id")).longValue();
            post(new TreasuryMovementCommand(companyId, ((Number) row.get("payment_account_id")).longValue(),
                (Long) row.get("unit_id"), (Long) row.get("business_id"), (String) row.get("currency_code"),
                "EXPENSES", "EXPENSE_PAYMENT_REVERSAL", String.valueOf(expenseId), "EXPENSE_DELETION:" + movementId,
                ((BigDecimal) row.get("available_delta")).negate(), ((BigDecimal) row.get("pending_delta")).negate(),
                reason, java.time.Instant.now(), userId, movementId, null), true);
        }
    }

    private TreasuryMovementResult post(TreasuryMovementCommand command, boolean restoreOriginalMovement) {
        var availableDelta = amount(command.availableDelta());
        var pendingDelta = amount(command.pendingDelta());
        if (availableDelta.signum() == 0 && pendingDelta.signum() == 0) {
            throw FinanceApiException.badRequest("Treasury movement must change an available or pending balance.");
        }
        var eventKey = requireText(command.eventKey(), "eventKey", 190);
        var account = lockAccount(command.companyId(), command.paymentAccountId());
        if (!restoreOriginalMovement && !"ACTIVE".equals(account.status())) {
            throw FinanceApiException.conflict("Payment account is not active.");
        }
        if (!account.currencyCode().equals(normalizeCurrency(command.currencyCode()))) {
            throw FinanceApiException.badRequest("Treasury movement currency does not match the payment account.");
        }
        if (!restoreOriginalMovement && !matchesScope(account, command.unitId(), command.businessId())) {
            throw FinanceApiException.forbidden("Payment account is outside the movement scope.");
        }

        var existing = findMovement(command.companyId(), eventKey);
        if (existing != null) {
            if (existing.paymentAccountId != command.paymentAccountId()
                    || existing.availableDelta.compareTo(availableDelta) != 0
                    || existing.pendingDelta.compareTo(pendingDelta) != 0) {
                throw FinanceApiException.conflict("Treasury idempotency key was already used with different values.");
            }
            return new TreasuryMovementResult(
                existing.id,
                existing.paymentAccountId,
                account.availableBalance(),
                account.pendingBalance(),
                true
            );
        }

        final long movementId;
        try {
            movementId = insertMovement(command, eventKey, availableDelta, pendingDelta);
        } catch (DuplicateKeyException exception) {
            // A retry can race on a different account because the idempotency key is company-wide.
            // Resolve the winning event instead of leaking a database exception or double-posting.
            var concurrent = findMovement(command.companyId(), eventKey);
            if (concurrent == null
                    || concurrent.paymentAccountId != command.paymentAccountId()
                    || concurrent.availableDelta.compareTo(availableDelta) != 0
                    || concurrent.pendingDelta.compareTo(pendingDelta) != 0) {
                throw FinanceApiException.conflict("Treasury idempotency key was already used with different values.");
            }
            return new TreasuryMovementResult(
                concurrent.id,
                concurrent.paymentAccountId,
                account.availableBalance(),
                account.pendingBalance(),
                true
            );
        }
        var nextPendingBalance = account.pendingBalance().add(pendingDelta);
        if (nextPendingBalance.signum() < 0) {
            throw FinanceApiException.conflict("Treasury movement cannot make the pending balance negative.");
        }
        var updated = jdbcTemplate.update(
            """
            UPDATE finance_payment_accounts
            SET current_balance = current_balance + ?,
                pending_balance = pending_balance + ?,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND (status = 'ACTIVE' OR ? = TRUE)
              AND deleted_at IS NULL
            """,
            availableDelta,
            pendingDelta,
            command.actorUserId(),
            command.companyId(),
            command.paymentAccountId(),
            restoreOriginalMovement
        );
        if (updated != 1) {
            throw FinanceApiException.conflict("Payment account balance could not be updated.");
        }
        return new TreasuryMovementResult(
            movementId,
            command.paymentAccountId(),
            account.availableBalance().add(availableDelta),
            nextPendingBalance,
            false
        );
    }

    @Transactional
    public void transferAvailable(
            long companyId,
            long fromAccountId,
            long toAccountId,
            Long unitId,
            Long businessId,
            String currencyCode,
            BigDecimal amount,
            String sourceModule,
            String sourceType,
            String sourceId,
            String eventKey,
            String description,
            Instant occurredAt,
            Long actorUserId,
            String metadataJson) {
        var normalizedAmount = amount(amount);
        if (normalizedAmount.signum() <= 0) {
            throw FinanceApiException.badRequest("Transfer amount must be greater than zero.");
        }
        if (fromAccountId == toAccountId) {
            throw FinanceApiException.badRequest("Transfer source and destination accounts must be different.");
        }
        requireEligibleAccount(
            companyId, fromAccountId, currencyCode, unitId, businessId, ACCOUNT_TYPES
        );
        requireEligibleAccount(
            companyId, toAccountId, currencyCode, unitId, businessId, ACCOUNT_TYPES
        );
        // Opposite transfers may execute concurrently. Lock both accounts in a stable order so
        // every transaction acquires the same rows in the same sequence and cannot deadlock by
        // posting the outbound and inbound legs in opposite order.
        lockAccount(companyId, Math.min(fromAccountId, toAccountId));
        lockAccount(companyId, Math.max(fromAccountId, toAccountId));
        post(new TreasuryMovementCommand(
            companyId, fromAccountId, unitId, businessId, currencyCode, sourceModule, sourceType,
            sourceId, eventKey + ":OUT", normalizedAmount.negate(), ZERO, description,
            occurredAt, actorUserId, null, metadataJson
        ));
        post(new TreasuryMovementCommand(
            companyId, toAccountId, unitId, businessId, currencyCode, sourceModule, sourceType,
            sourceId, eventKey + ":IN", normalizedAmount, ZERO, description,
            occurredAt, actorUserId, null, metadataJson
        ));
    }

    private TreasuryAccount ensureSystemAccount(
            long companyId,
            long actorUserId,
            String currencyCode,
            String systemKey,
            String name,
            String type,
            String description) {
        var existing = findSystemAccount(companyId, systemKey);
        if (existing != null) {
            return existing;
        }
        try {
            jdbcTemplate.update(
                """
                INSERT INTO finance_payment_accounts
                  (company_id, unit_id, business_id, name, type, currency_code,
                   opening_balance, current_balance, pending_balance, status, description,
                   system_key, is_system_managed, created_by_user_id, metadata_json)
                VALUES (?, NULL, NULL, ?, ?, ?, 0.0000, 0.0000, 0.0000, 'ACTIVE', ?, ?, TRUE, ?,
                        JSON_OBJECT('owner', 'TREASURY', 'managed', TRUE))
                """,
                companyId,
                name,
                type,
                currencyCode,
                description,
                systemKey,
                actorUserId
            );
        } catch (DuplicateKeyException exception) {
            var concurrent = findSystemAccount(companyId, systemKey);
            if (concurrent == null) {
                throw FinanceApiException.conflict("A payment account name conflicts with the required system account.");
            }
            return concurrent;
        }
        var created = findSystemAccount(companyId, systemKey);
        if (created == null) {
            throw FinanceApiException.conflict("The required system payment account could not be provisioned.");
        }
        return created;
    }

    private TreasuryAccount findSystemAccount(long companyId, String systemKey) {
        return jdbcTemplate.query(
            """
            SELECT id, company_id, unit_id, business_id, name, type, currency_code,
                   current_balance, pending_balance, status, system_key, is_system_managed
            FROM finance_payment_accounts
            WHERE company_id = ? AND system_key = ? AND deleted_at IS NULL
            """,
            this::mapAccount,
            companyId,
            systemKey
        ).stream().findFirst().orElse(null);
    }

    private TreasuryAccount lockAccount(long companyId, long accountId) {
        return jdbcTemplate.query(
            """
            SELECT id, company_id, unit_id, business_id, name, type, currency_code,
                   current_balance, pending_balance, status, system_key, is_system_managed
            FROM finance_payment_accounts
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            FOR UPDATE
            """,
            this::mapAccount,
            companyId,
            accountId
        ).stream().findFirst()
            .orElseThrow(() -> FinanceApiException.badRequest("Payment account does not exist for this company."));
    }

    private ExistingMovement findMovement(long companyId, String eventKey) {
        return jdbcTemplate.query(
            """
            SELECT id, payment_account_id, available_delta, pending_delta
            FROM finance_payment_account_movements
            WHERE company_id = ? AND event_key = ?
            """,
            (rs, rowNum) -> new ExistingMovement(
                rs.getLong("id"),
                rs.getLong("payment_account_id"),
                rs.getBigDecimal("available_delta"),
                rs.getBigDecimal("pending_delta")
            ),
            companyId,
            eventKey
        ).stream().findFirst().orElse(null);
    }

    private long insertMovement(
            TreasuryMovementCommand command,
            String eventKey,
            BigDecimal availableDelta,
            BigDecimal pendingDelta) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                INSERT INTO finance_payment_account_movements
                  (company_id, payment_account_id, unit_id, business_id, currency_code,
                   source_module, source_type, source_id, event_key, available_delta, pending_delta,
                   description, occurred_at, created_by_user_id, reversal_of_movement_id, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                Statement.RETURN_GENERATED_KEYS
            );
            var index = 1;
            statement.setLong(index++, command.companyId());
            statement.setLong(index++, command.paymentAccountId());
            setNullableLong(statement, index++, command.unitId());
            setNullableLong(statement, index++, command.businessId());
            statement.setString(index++, normalizeCurrency(command.currencyCode()));
            statement.setString(index++, requireText(command.sourceModule(), "sourceModule", 48));
            statement.setString(index++, requireText(command.sourceType(), "sourceType", 64));
            statement.setString(index++, trimToNull(command.sourceId(), 120));
            statement.setString(index++, eventKey);
            statement.setBigDecimal(index++, availableDelta);
            statement.setBigDecimal(index++, pendingDelta);
            statement.setString(index++, requireText(command.description(), "description", 500));
            statement.setTimestamp(index++, Timestamp.from(command.occurredAt() == null ? Instant.now() : command.occurredAt()));
            setNullableLong(statement, index++, command.actorUserId());
            setNullableLong(statement, index++, command.reversalOfMovementId());
            statement.setString(index, command.metadataJson());
            return statement;
        }, keyHolder);
        return keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
    }

    private TreasuryAccount mapAccount(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new TreasuryAccount(
            rs.getLong("id"),
            rs.getLong("company_id"),
            nullableLong(rs, "unit_id"),
            nullableLong(rs, "business_id"),
            rs.getString("name"),
            rs.getString("type"),
            rs.getString("currency_code"),
            rs.getBigDecimal("current_balance"),
            rs.getBigDecimal("pending_balance"),
            rs.getString("status"),
            rs.getString("system_key"),
            rs.getBoolean("is_system_managed")
        );
    }

    private static Long nullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private static boolean matchesScope(TreasuryAccount account, Long unitId, Long businessId) {
        if (account.unitId() == null && account.businessId() == null) {
            return true;
        }
        if (account.businessId() != null) {
            return businessId != null && account.businessId().equals(businessId);
        }
        return unitId != null && account.unitId().equals(unitId);
    }

    private static void setNullableLong(java.sql.PreparedStatement statement, int index, Long value)
            throws java.sql.SQLException {
        if (value == null) {
            statement.setNull(index, Types.BIGINT);
        } else {
            statement.setLong(index, value);
        }
    }

    private static BigDecimal amount(BigDecimal value) {
        return (value == null ? ZERO : value).setScale(4, RoundingMode.HALF_UP);
    }

    private static String normalizeCurrency(String value) {
        var currency = requireText(value, "currencyCode", 3).toUpperCase(Locale.ROOT);
        if (currency.length() != 3) {
            throw FinanceApiException.badRequest("currencyCode must have three characters.");
        }
        return currency;
    }

    private static String normalizeToken(String value, String fieldName) {
        return requireText(value, fieldName, 32).toUpperCase(Locale.ROOT);
    }

    private static String requireText(String value, String fieldName, int maxLength) {
        var normalized = trimToNull(value, maxLength);
        if (normalized == null) {
            throw FinanceApiException.badRequest(fieldName + " is required.");
        }
        return normalized;
    }

    private static String trimToNull(String value, int maxLength) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        var normalized = value.trim();
        if (normalized.length() > maxLength) {
            throw FinanceApiException.badRequest("Value exceeds maximum length of " + maxLength + ".");
        }
        return normalized;
    }

    private record ExistingMovement(
        long id,
        long paymentAccountId,
        BigDecimal availableDelta,
        BigDecimal pendingDelta
    ) {
    }
}
