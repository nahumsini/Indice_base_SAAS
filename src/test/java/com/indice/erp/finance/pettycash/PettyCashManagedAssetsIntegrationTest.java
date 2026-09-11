package com.indice.erp.finance.pettycash;

import static org.assertj.core.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashFundRequest;
import com.indice.erp.finance.pettycash.dto.UpdatePettyCashFundRequest;
import com.indice.erp.finance.pettycash.dto.PettyCashManagedAsset;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PettyCashManagedAssetsIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PettyCashService service;
    @Autowired PettyCashRepository repository;
    @Autowired PettyCashMapper mapper;
    @Autowired PettyCashMonthlyCutScheduler scheduler;
    @Autowired ObjectMapper json;
    @Autowired jakarta.validation.Validator validation;

    private final List<PettyCashManagedAsset> assets = List.of(
        new PettyCashManagedAsset("REAL_ESTATE", "Casa de prueba", "REF-1"),
        new PettyCashManagedAsset("VEHICLE", "Vehículo de prueba", "REF-2"));

    @Test void savesReloadsEditsAndClearsAllRowsWithoutChangingMoneyOrHistoricalCuts() throws Exception {
        var f = fixture();
        var body = request(f);
        body.set("managedAssets", json.valueToTree(assets));
        var created = service.createFund(f.context, json.treeToValue(body, CreatePettyCashFundRequest.class));
        assertThat(created.managedAssets()).containsExactlyElementsOf(assets);
        assertThat(created.managedAssetName()).isEqualTo(assets.getFirst().name());
        assertThat(service.getFund(f.context, created.id()).managedAssets()).containsExactlyElementsOf(assets);
        var firstCut = repository.findStatements(f.context).getFirst();
        assertThat(mapper.toResponse(firstCut).managedAssetsSnapshot()).containsExactlyElementsOf(assets);

        body.set("managedAssets", json.valueToTree(List.of(assets.get(1), new PettyCashManagedAsset("VESSEL", "Barco", null))));
        var updated = service.updateFund(f.context, created.id(), json.treeToValue(body, UpdatePettyCashFundRequest.class));
        assertThat(updated.managedAssets()).extracting(PettyCashManagedAsset::name).containsExactly("Vehículo de prueba", "Barco");
        assertThat(updated.managedAssetName()).isEqualTo("Vehículo de prueba");
        assertThat(updated.currentBalanceAmount()).isZero();
        assertThat(updated.limitAmount()).isEqualByComparingTo("750");
        assertThat(mapper.toResponse(repository.findStatementById(f.context, firstCut.id()).orElseThrow()).managedAssetsSnapshot())
            .containsExactlyElementsOf(assets);

        // Monthly automation must copy the new list and remain idempotent.
        var nextPeriod = YearMonth.parse(firstCut.periodKey()).plusMonths(1);
        scheduler.openPeriod(f.context.companyId(), nextPeriod);
        scheduler.openPeriod(f.context.companyId(), nextPeriod);
        var cuts = repository.findStatements(f.context);
        assertThat(cuts).hasSize(2);
        var nextCut = cuts.stream().filter(cut -> cut.periodKey().equals(nextPeriod.toString())).findFirst().orElseThrow();
        assertThat(mapper.toResponse(nextCut).managedAssetsSnapshot()).isEqualTo(updated.managedAssets());
        assertThat(jdbc.queryForObject("""
            SELECT JSON_TYPE(JSON_EXTRACT(fund_snapshot_json, '$.managedAssetsJson'))
            FROM finance_petty_cash_statements WHERE company_id = ? AND id = ?
            """, String.class, f.context.companyId(), nextCut.id())).isEqualTo("STRING");

        body.set("managedAssets", json.createArrayNode());
        var cleared = service.updateFund(f.context, created.id(), json.treeToValue(body, UpdatePettyCashFundRequest.class));
        assertThat(cleared.managedAssets()).isEmpty();
        assertThat(cleared.managedAssetType()).isNull();
        assertThat(cleared.managedAssetName()).isNull();
        assertThat(cleared.managedAssetReference()).isNull();
        assertThat(mapper.toResponse(repository.findStatementById(f.context, nextCut.id()).orElseThrow()).managedAssetsSnapshot())
            .isEqualTo(updated.managedAssets());
        for (var table : List.of("finance_payment_account_movements", "finance_petty_cash_movements", "finance_expenses")) {
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE company_id=?", Integer.class, f.context.companyId())).isZero();
        }
    }

    @Test void legacyClientsCanReadAndEditTheFirstAssetWithoutDiscardingAdditionalAssets() throws Exception {
        var f = fixture(); var body = request(f);
        body.put("managedAssetType", "REAL_ESTATE").put("managedAssetName", "Anterior").put("managedAssetReference", "OLD");
        var created = service.createFund(f.context, json.treeToValue(body, CreatePettyCashFundRequest.class));
        assertThat(created.managedAssets()).containsExactly(new PettyCashManagedAsset("REAL_ESTATE", "Anterior", "OLD"));
        // A pre-migration/null JSON row is still readable from its own scalar identity.
        jdbc.update("UPDATE finance_petty_cash_funds SET managed_assets_json=NULL WHERE id=?", created.id());
        assertThat(service.getFund(f.context, created.id()).managedAssets()).isEqualTo(created.managedAssets());
        body.set("managedAssets", json.valueToTree(assets));
        service.updateFund(f.context, created.id(), json.treeToValue(body, UpdatePettyCashFundRequest.class));
        body.remove("managedAssets"); body.put("managedAssetName", "Corregido");
        var changed = service.updateFund(f.context, created.id(), json.treeToValue(body, UpdatePettyCashFundRequest.class));
        assertThat(changed.managedAssets()).containsExactly(new PettyCashManagedAsset("REAL_ESTATE", "Corregido", "OLD"), assets.get(1));
    }

    @Test void anotherCompanyCannotReadOrReplaceAssets() throws Exception {
        var f = fixture(); var other = fixture(); var body = request(f);
        body.set("managedAssets", json.valueToTree(assets));
        var created = service.createFund(f.context, json.treeToValue(body, CreatePettyCashFundRequest.class));
        var replacement = json.treeToValue(body, UpdatePettyCashFundRequest.class);
        assertThatThrownBy(() -> service.getFund(other.context, created.id())).isInstanceOf(java.util.NoSuchElementException.class);
        assertThatThrownBy(() -> service.updateFund(other.context, created.id(), replacement)).isInstanceOf(java.util.NoSuchElementException.class);
        assertThat(service.getFund(f.context, created.id()).managedAssets()).isEqualTo(assets);
    }

    @Test void rejectsIncompleteInvalidAndOversizedCollectionsBeforeAnyFundMutation() throws Exception {
        var f = fixture(); var body = request(f);
        for (var invalid : List.of("[{\"type\":\"VEHICLE\",\"name\":\" \"}]", "[{\"type\":\"UNKNOWN\",\"name\":\"Test\"}]", "[null]")) {
            body.set("managedAssets", json.readTree(invalid));
            var request = json.treeToValue(body, CreatePettyCashFundRequest.class);
            assertThatThrownBy(() -> service.createFund(f.context, request)).hasMessageContaining("valid type and name");
        }
        body.set("managedAssets", json.valueToTree(java.util.Collections.nCopies(51, assets.getFirst())));
        var oversized = json.treeToValue(body, CreatePettyCashFundRequest.class);
        assertThat(validation.validate(oversized)).isNotEmpty();
        assertThatThrownBy(() -> service.createFund(f.context, oversized)).hasMessageContaining("50 managed assets");
        body.set("managedAssets", json.valueToTree(List.of(new PettyCashManagedAsset("VEHICLE", " ", null))));
        assertThat(validation.validate(json.treeToValue(body, CreatePettyCashFundRequest.class)))
            .anySatisfy(error -> assertThat(error.getPropertyPath().toString()).contains("managedAssets[0].name"));
        assertThat(repository.findFunds(f.context)).isEmpty();
    }

    @Test void emptyHistoricalSnapshotDoesNotInheritCurrentFundAssets() throws Exception {
        var f = fixture(); var body = request(f); body.set("managedAssets", json.createArrayNode());
        var created = service.createFund(f.context, json.treeToValue(body, CreatePettyCashFundRequest.class));
        var cut = repository.findStatements(f.context).getFirst();
        body.set("managedAssets", json.valueToTree(assets));
        service.updateFund(f.context, created.id(), json.treeToValue(body, UpdatePettyCashFundRequest.class));
        assertThat(mapper.toResponse(repository.findStatementById(f.context, cut.id()).orElseThrow()).managedAssetsSnapshot()).isEmpty();
    }

    private ObjectNode request(Fixture f) {
        return json.createObjectNode().put("name", "Fondo de prueba").put("currencyCode", "MXN")
            .put("fundType", "EXTERNAL_MANAGED").put("limitAmount", 750).put("currentBalanceAmount", 0)
            .put("paymentAccountId", f.account).put("responsibleUserId", f.context.userId()).put("cutOffDay", 30)
            .put("fundingSourceName", "Aportación externa").put("externalOwnerType", "PERSON")
            .put("externalOwnerName", "Cliente de prueba").put("externalOwnerRelationship", "CLIENT")
            .put("statementRecipientEmail", "isolated@example.test").put("kioskEnabled", false);
    }

    private Fixture fixture() {
        String key = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", key);
        long company = jdbc.queryForObject("SELECT id FROM companies WHERE name=?", Long.class, key);
        jdbc.update("INSERT INTO users (email,password_hash) VALUES (?,'isolated-no-login')", key+"@example.test");
        long user = jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class, key+"@example.test");
        jdbc.update("INSERT INTO user_companies (company_id,user_id,role,status,visibility) VALUES (?,?,'admin','active','all')",company,user);
        jdbc.update("INSERT INTO finance_payment_accounts (company_id,name,type,currency_code,opening_balance,current_balance,status) VALUES (?,?,'CASH','MXN',0,0,'ACTIVE')",company,key);
        long account = jdbc.queryForObject("SELECT id FROM finance_payment_accounts WHERE name=?", Long.class, key);
        return new Fixture(new FinanceContext(user,company,"Test","admin",true,FinanceScope.corporateOffice()), account);
    }
    private record Fixture(FinanceContext context, long account) {}
}
