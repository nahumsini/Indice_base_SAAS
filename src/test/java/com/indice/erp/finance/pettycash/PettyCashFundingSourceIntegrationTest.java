package com.indice.erp.finance.pettycash;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.indice.erp.finance.pettycash.dto.*;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PettyCashFundingSourceIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PettyCashService service;
    @Autowired ObjectMapper json;

    @Test void externalFundCanUseAnExistingSourceAccountForOpeningDepositAndReturn() throws Exception {
        var f = fixture(); var body = request(f).put("fundingSourcePaymentAccountId", f.source).put("currentBalanceAmount", 100);
        var fund = service.createFund(f.context, json.treeToValue(body, CreatePettyCashFundRequest.class));
        assertThat(fund.fundType()).isEqualTo(PettyCashFundType.EXTERNAL_MANAGED);
        assertThat(fund.fundingSourcePaymentAccountId()).isEqualTo(f.source);
        assertThat(fund.budgetId()).isNull(); assertThat(fund.budgetLineId()).isNull();
        balances(f, fund.id(), "900", "100");
        var deposit = service.createMovement(f.context, fund.id(), movement(null, f.custody, null, "250", PettyCashMovementType.ADDITIONAL_DEPOSIT));
        balances(f, fund.id(), "650", "350");
        assertThat(deposit.statement().additionalDepositAmount()).isEqualByComparingTo("250");
        var closing = service.closeStatement(f.context, fund.id(), deposit.statement().id(), new ClosePettyCashStatementRequest(
            PettyCashStatementCloseAction.RETURN_TO_SOURCE, null, LocalDate.now(), "Devolución de prueba"));
        balances(f, fund.id(), "1000", "0");
        assertThat(closing.statement().status()).isEqualTo(PettyCashStatementStatus.CLOSED);
        assertThat(count(f,"finance_payment_account_movements")).isEqualTo(6);
        assertThat(count(f,"finance_expenses")).isZero();
    }

    @Test void externalMeansOnlyCreditsCustodyEvenWhenTheFundNormallyUsesAnAccount() throws Exception {
        var f = fixture(); var body = request(f).put("fundingSourcePaymentAccountId", f.source);
        var fund = service.createFund(f.context, json.treeToValue(body, CreatePettyCashFundRequest.class));
        service.createMovement(f.context, fund.id(), movement(null, f.custody, "Aportación del cliente", "125", PettyCashMovementType.ADDITIONAL_DEPOSIT));
        balances(f, fund.id(), "1000", "125");
        assertThat(count(f,"finance_payment_account_movements")).isEqualTo(1);
        assertThat(count(f,"finance_expenses")).isZero();
    }

    @Test void closingChoosesTheReturnDestinationWithoutAConfiguredPermanentSource() throws Exception {
        var f = fixture();
        var fund = service.createFund(f.context, json.treeToValue(request(f), CreatePettyCashFundRequest.class));
        var deposit = service.createMovement(f.context, fund.id(),
            movement(f.source, f.custody, null, "125", PettyCashMovementType.ADDITIONAL_DEPOSIT));
        balances(f, fund.id(), "875", "125");

        var closing = service.closeStatement(f.context, fund.id(), deposit.statement().id(),
            new ClosePettyCashStatementRequest(
                PettyCashStatementCloseAction.RETURN_TO_SOURCE,
                null,
                LocalDate.now(),
                "Devolución a cuenta elegida",
                new BigDecimal("125"),
                f.source,
                null
            ));

        balances(f, fund.id(), "1000", "0");
        assertThat(closing.statement().status()).isEqualTo(PettyCashStatementStatus.CLOSED);
        assertThat(count(f, "finance_expenses")).isZero();
    }

    @Test void anExternalFundCanReturnItsBalanceThroughNamedExternalMeans() throws Exception {
        var f = fixture();
        var fund = service.createFund(f.context, json.treeToValue(request(f), CreatePettyCashFundRequest.class));
        var deposit = service.createMovement(f.context, fund.id(),
            movement(null, f.custody, "Aportación del cliente", "125", PettyCashMovementType.ADDITIONAL_DEPOSIT));
        balances(f, fund.id(), "1000", "125");

        service.closeStatement(f.context, fund.id(), deposit.statement().id(),
            new ClosePettyCashStatementRequest(
                PettyCashStatementCloseAction.RETURN_TO_SOURCE,
                null,
                LocalDate.now(),
                "Devolución externa",
                new BigDecimal("125"),
                null,
                "Cliente custodio"
            ));

        balances(f, fund.id(), "1000", "0");
        assertThat(count(f, "finance_expenses")).isZero();
    }

    @Test void returnDestinationMustBelongToTheSameCompanyAndCurrency() throws Exception {
        var f = fixture();
        var other = fixture();
        var fund = service.createFund(f.context, json.treeToValue(request(f), CreatePettyCashFundRequest.class));
        var deposit = service.createMovement(f.context, fund.id(),
            movement(null, f.custody, "Aportación del cliente", "125", PettyCashMovementType.ADDITIONAL_DEPOSIT));

        assertThatThrownBy(() -> service.closeStatement(f.context, fund.id(), deposit.statement().id(),
            new ClosePettyCashStatementRequest(
                PettyCashStatementCloseAction.RETURN_TO_SOURCE,
                null,
                LocalDate.now(),
                "Destino ajeno",
                new BigDecimal("125"),
                other.source,
                null
            ))).hasMessageContaining("invalid for this company");

        balances(f, fund.id(), "1000", "125");
        assertThat(service.getFund(f.context, fund.id()).currentBalanceAmount()).isEqualByComparingTo("125");
    }

    @Test void aFundConfiguredForExternalMeansCanReceiveFromAnExplicitAccountAndChangeItsDefault() throws Exception {
        var f = fixture(); var body = request(f).put("fundingSourceName", "Aportaciones externas");
        var fund = service.createFund(f.context, json.treeToValue(body, CreatePettyCashFundRequest.class));
        service.createMovement(f.context, fund.id(), movement(f.source, f.custody, null, "80", PettyCashMovementType.ADDITIONAL_DEPOSIT));
        balances(f, fund.id(), "920", "80");
        body.put("fundingSourcePaymentAccountId", f.source);
        var updated = service.updateFund(f.context, fund.id(), json.treeToValue(body, UpdatePettyCashFundRequest.class));
        assertThat(updated.fundType()).isEqualTo(PettyCashFundType.EXTERNAL_MANAGED);
        assertThat(updated.fundingSourcePaymentAccountId()).isEqualTo(f.source);
        body.putNull("fundingSourcePaymentAccountId");
        updated = service.updateFund(f.context, fund.id(), json.treeToValue(body, UpdatePettyCashFundRequest.class));
        assertThat(updated.fundingSourcePaymentAccountId()).isNull();
        balances(f, fund.id(), "920", "80");
    }

    @Test void mixedOriginsAndAnotherCompanysAccountsFailBeforeAnyBalanceChange() throws Exception {
        var f = fixture(); var other = fixture();
        var body = request(f).put("fundingSourcePaymentAccountId", f.source);
        var fund = service.createFund(f.context, json.treeToValue(body, CreatePettyCashFundRequest.class));
        assertThatThrownBy(() -> service.createMovement(f.context, fund.id(), movement(f.source, f.custody, "Externo", "10", PettyCashMovementType.ADDITIONAL_DEPOSIT)))
            .hasMessageContaining("not both");
        assertThatThrownBy(() -> service.createMovement(f.context, fund.id(), movement(other.source, f.custody, null, "10", PettyCashMovementType.ADDITIONAL_DEPOSIT)))
            .hasMessageContaining("invalid for this company");
        body.put("fundingSourcePaymentAccountId", other.source);
        var invalid = json.treeToValue(body, UpdatePettyCashFundRequest.class);
        assertThatThrownBy(() -> service.updateFund(f.context, fund.id(), invalid)).hasMessageContaining("invalid for this company");
        balances(f, fund.id(), "1000", "0"); assertThat(count(f,"finance_petty_cash_movements")).isZero();
    }

    @Test void sameInactiveOrWrongCurrencyAccountsAndCompanyBudgetsAreRejected() throws Exception {
        var f = fixture(); var body = request(f).put("fundingSourcePaymentAccountId", f.custody);
        var same = json.treeToValue(body, CreatePettyCashFundRequest.class);
        assertThatThrownBy(() -> service.createFund(f.context, same)).hasMessageContaining("must be different");
        body.put("fundingSourcePaymentAccountId", f.source);
        var request = json.treeToValue(body, CreatePettyCashFundRequest.class);
        jdbc.update("UPDATE finance_payment_accounts SET status='INACTIVE' WHERE id=?", f.source);
        assertThatThrownBy(() -> service.createFund(f.context, request)).hasMessageContaining("invalid for this company");
        jdbc.update("UPDATE finance_payment_accounts SET status='ACTIVE', currency_code='USD' WHERE id=?", f.source);
        assertThatThrownBy(() -> service.createFund(f.context, request)).hasMessageContaining("invalid for this company");
        body.put("budgetId", 1);
        var budget = json.treeToValue(body, CreatePettyCashFundRequest.class);
        assertThatThrownBy(() -> service.createFund(f.context, budget)).hasMessageContaining("cannot affect a company budget");
        assertThat(count(f,"finance_petty_cash_funds")).isZero();
    }

    @Test void internalFundsStillRejectExternalMeansAndUseTheAccountTransfer() throws Exception {
        var f = fixture(); var body = request(f).put("fundingSourcePaymentAccountId", f.source);
        var fund = service.createFund(f.context, json.treeToValue(body, CreatePettyCashFundRequest.class));
        // Model a supported legacy internal fund without a budget link.
        jdbc.update("UPDATE finance_petty_cash_funds SET fund_type='INTERNAL_COMPANY' WHERE id=?", fund.id());
        jdbc.update("UPDATE finance_petty_cash_statements SET fund_type_snapshot='INTERNAL_COMPANY', fund_snapshot_json=JSON_SET(fund_snapshot_json,'$.fundType','INTERNAL_COMPANY') WHERE petty_cash_fund_id=?", fund.id());
        assertThatThrownBy(() -> service.createMovement(f.context, fund.id(), movement(null, f.custody, "Externo", "10", PettyCashMovementType.ADDITIONAL_DEPOSIT)))
            .hasMessageContaining("cannot use an external");
        service.createMovement(f.context, fund.id(), movement(f.source, f.custody, null, "10", PettyCashMovementType.ADDITIONAL_DEPOSIT));
        balances(f, fund.id(), "990", "10");
    }

    private CreatePettyCashMovementRequest movement(Long from, Long to, String external, String amount, PettyCashMovementType type) {
        return new CreatePettyCashMovementRequest(null, from, to, type, new BigDecimal(amount), "MXN", LocalDate.now(),
            external, "OWNER_CONTRIBUTION", "Cliente", "Aportación de prueba", external == null ? "INTERNAL_TRANSFER" : "EXTERNAL_MEDIA", null, "Test", null, null);
    }
    private ObjectNode request(Fixture f) {
        return json.createObjectNode().put("name", "Fondo de prueba").put("currencyCode", "MXN")
            .put("fundType", "EXTERNAL_MANAGED").put("limitAmount", 750).put("currentBalanceAmount", 0)
            .put("paymentAccountId", f.custody).put("responsibleUserId", f.context.userId()).put("cutOffDay", 30)
            .put("externalOwnerType", "PERSON").put("externalOwnerName", "Cliente de prueba")
            .put("externalOwnerRelationship", "CLIENT").put("statementRecipientEmail", "isolated@example.test").put("kioskEnabled", false);
    }
    private void balances(Fixture f, long fund, String source, String custody) {
        assertThat(jdbc.queryForObject("SELECT current_balance FROM finance_payment_accounts WHERE id=?", BigDecimal.class, f.source)).isEqualByComparingTo(source);
        assertThat(jdbc.queryForObject("SELECT current_balance FROM finance_payment_accounts WHERE id=?", BigDecimal.class, f.custody)).isEqualByComparingTo(custody);
        assertThat(service.getFund(f.context, fund).currentBalanceAmount()).isEqualByComparingTo(custody);
    }
    private int count(Fixture f, String table) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE company_id=?", Integer.class, f.context.companyId());
    }
    private Fixture fixture() {
        String key=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)",key);
        long company=jdbc.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,key);
        jdbc.update("INSERT INTO users (email,password_hash) VALUES (?,'isolated-no-login')",key+"@example.test");
        long user=jdbc.queryForObject("SELECT id FROM users WHERE email=?",Long.class,key+"@example.test");
        jdbc.update("INSERT INTO user_companies (company_id,user_id,role,status,visibility) VALUES (?,?,'admin','active','all')",company,user);
        long source=account(company,key+"-source", "1000"); long custody=account(company,key+"-custody", "0");
        return new Fixture(new FinanceContext(user,company,"Test","admin",true,FinanceScope.corporateOffice()),source,custody);
    }
    private long account(long company, String name, String amount) {
        jdbc.update("INSERT INTO finance_payment_accounts (company_id,name,type,currency_code,opening_balance,current_balance,status) VALUES (?,?,'CASH','MXN',?,?,'ACTIVE')",company,name,new BigDecimal(amount),new BigDecimal(amount));
        return jdbc.queryForObject("SELECT id FROM finance_payment_accounts WHERE name=?",Long.class,name);
    }
    private record Fixture(FinanceContext context, long source, long custody) {}
}
