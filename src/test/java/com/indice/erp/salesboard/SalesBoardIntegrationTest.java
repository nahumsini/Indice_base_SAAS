package com.indice.erp.salesboard;

import com.indice.erp.auth.*;
import com.indice.erp.exchange.*;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.sales.reporting.*;
import com.indice.erp.sales.reporting.SalesReportingContracts.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"app.email.enabled=false","app.mail-accounts.worker-enabled=false","app.mailing.worker-enabled=false"})
@AutoConfigureMockMvc
@Transactional
class SalesBoardIntegrationTest {
    @Autowired JdbcTemplate db;
    @Autowired SalesBoardService board;
    @Autowired SalesReportingReadService sales;
    @Autowired MockMvc mvc;
    @MockBean BusinessExchangeRateService rates;
    long company,other,user,membership,unit,business,otherUnit,otherBusiness;
    AuthSessionUser actor;
    long insert(String sql,Object... args) {
        var key=new GeneratedKeyHolder();
        db.update(connection->{ var statement=connection.prepareStatement(sql,java.sql.Statement.RETURN_GENERATED_KEYS);
            for(int i=0;i<args.length;i++) statement.setObject(i+1,args[i]); return statement; },key);
        return key.getKey().longValue();
    }
    @BeforeEach void setup() {
        assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        company=insert("INSERT INTO companies(name) VALUES(?)","Board "+UUID.randomUUID());
        other=insert("INSERT INTO companies(name) VALUES(?)","Other "+UUID.randomUUID());
        user=insert("INSERT INTO users(email,password_hash,full_name) VALUES(?,'synthetic-only','Board test')","board-"+UUID.randomUUID()+"@example.com");
        membership=insert("INSERT INTO user_companies(user_id,company_id,role,status) VALUES(?,?,'admin','active')",user,company);
        unit=insert("INSERT INTO units(company_id,name) VALUES(?,'Allowed unit')",company);
        business=insert("INSERT INTO businesses(company_id,unit_id,name) VALUES(?,?,'Allowed business')",company,unit);
        otherUnit=insert("INSERT INTO units(company_id,name) VALUES(?,'Other unit')",company);
        otherBusiness=insert("INSERT INTO businesses(company_id,unit_id,name) VALUES(?,?,'Other business')",company,otherUnit);
        db.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id,unit_id,business_id) VALUES(?,?,?,?,?)",company,membership,user,unit,business);
        db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES(?,'sales_board','active','test')",company);
        db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,'sales_board','admin')",membership);
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key) VALUES(?,'sales_board','overview')",membership);
        actor=new AuthSessionUser(user,company,"Synthetic","admin");
        String today=LocalDate.now(ZoneId.of("America/Mexico_City")).toString();
        when(rates.loadDailyRates()).thenReturn(new BusinessExchangeRatesResponse("USD",Map.of("USD",BigDecimal.ONE,"MXN",new BigDecimal("20")),
            new BusinessExchangeRateMetadataResponse("daily","official",today,today+"T12:00:00Z","synthetic","","",""),
            List.of(new BusinessExchangeRateSourceResponse("MXN",new BigDecimal("20"),today,"synthetic","test","","","official","")),List.of()));
    }
    long sale(long tenant,Long unitId,Long businessId,String origin,String date,String currency,String amount,String status) {
        return insert("INSERT INTO sales_records(company_id,unit_id,business_id,sale_number,customer_name,seller_name,sale_date,currency,total_amount,tax_total,commercial_status,source_type) VALUES(?,?,?,?, 'Synthetic customer','Test seller',?,?,?,10,?,?)",
            tenant,unitId,businessId,"BOARD-"+UUID.randomUUID().toString().substring(0,20),date,currency,new BigDecimal(amount),status,origin);
    }
    long sale(String origin,String date,String amount) { return sale(company,unit,business,origin,date,"MXN",amount,"approved"); }
    void ticket(long saleId,long tenant,String channel) {
        long warehouse=insert("INSERT INTO sales_inventory_warehouses(company_id,warehouse_code,name,type,status,business_unit_id,business_id) VALUES(?,?,'Synthetic warehouse','main','active',?,?)",tenant,UUID.randomUUID().toString(),unit,business);
        long register=insert("INSERT INTO pos_cash_registers(company_id,warehouse_id,unit_id,business_id,code,name,status,is_active,created_by_user_id) VALUES(?,?,?,?,?,'Synthetic register','ACTIVE',1,?)",tenant,warehouse,unit,business,UUID.randomUUID().toString(),user);
        long shift=insert("INSERT INTO pos_shifts(company_id,unit_id,business_id,warehouse_id,cash_register_id,opened_by_user_id,created_by_user_id,status,currency_code,opening_amount,expected_cash_amount) VALUES(?,?,?,?,?,?,?,'OPEN','MXN',0,0)",tenant,unit,business,warehouse,register,user,user);
        insert("INSERT INTO pos_tickets(company_id,warehouse_id,cash_register_id,shift_id,sales_record_id,ticket_number,status,channel,currency_code,total_amount,created_by_user_id) VALUES(?,?,?,?,?,?,'COMPLETED',?,'MXN',200,?)",tenant,warehouse,register,shift,saleId,UUID.randomUUID().toString(),channel,user);
    }
    SalesBoardContracts.Workspace read() { return read("ALL","", "ALL",1,25,"MXN"); }
    SalesBoardContracts.Workspace read(String origin,String channel,String status,int page,int size,String currency) {
        return board.read(actor,"2026-10-01","2026-10-14","",origin,channel,status,null,null,page,size,"date","asc",currency,"auto");
    }
    Filter filter(Long unitId,Long businessId) { return new Filter(LocalDate.of(2026,10,1),LocalDate.of(2026,10,14),"","ALL","","ALL",unitId,businessId,1,25,"date","asc"); }
    MockHttpSession session() {
        var session=new MockHttpSession(); session.setAttribute(SessionAuthService.SESSION_USER_ID,user);session.setAttribute(SessionAuthService.SESSION_COMPANY_ID,company);
        session.setAttribute(SessionAuthService.SESSION_USER_NAME,"Synthetic"); return session;
    }
    @Test void combinesSourcesOnceAndExcludesCancelledDeletedOtherTenantAndOtherUnit() {
        sale("SALES","2026-10-01","100");long pos=sale("POS","2026-10-02","200");ticket(pos,company,"POS");
        sale(company,unit,business,"SALES","2026-10-03","MXN","900","cancelled");
        long deleted=sale("SALES","2026-10-04","800");db.update("UPDATE sales_records SET deleted_at=NOW() WHERE id=?",deleted);
        sale(other,null,null,"SALES","2026-10-01","MXN","5000","approved");sale(company,otherUnit,otherBusiness,"SALES","2026-10-01","MXN","7000","approved");
        var result=read();assertThat(result.total()).isEqualTo(3);assertThat(result.summary().active()).isEqualTo(2);assertThat(result.summary().cancelled()).isEqualTo(1);
        assertThat(result.summary().total().preferredTotal()).isEqualByComparingTo("300");assertThat(result.summary().tax().preferredTotal()).isEqualByComparingTo("20");
        assertThat(result.summary().beforeTax().preferredTotal()).isEqualByComparingTo("280");assertThat(result.summary().averageTicket()).isEqualByComparingTo("150");
        assertThat(result.items()).filteredOn(r->r.sale().id()==pos).hasSize(1).first().satisfies(r->assertThat(r.sale().ticketNumber()).isNotBlank());
        assertThat(read("POS","POS","ALL",1,25,"MXN").total()).isEqualTo(1);
        assertThat(read("ALL","","CANCELLED",1,25,"MXN").summary().total().preferredTotal()).isZero();
    }
    @Test void cancelledRowsWithInvalidLegacyCurrencyDoNotContaminateActiveMoney() {
        sale("SALES","2026-10-01","100");
        sale(company,unit,business,"SALES","2026-10-02","","900","cancelled");
        var result=read();assertThat(result.summary().total().partial()).isFalse();
        assertThat(result.summary().total().preferredTotal()).isEqualByComparingTo("100");
        assertThat(result.analytics().trend().get(1).total().preferredTotal()).isZero();
    }
    @Test void previousPeriodAndWeekdayExposureIncludeDaysWithoutSales() {
        sale("SALES","2026-10-01","200");sale("POS","2026-10-08","100");sale("SALES","2026-09-17","100");
        var result=read();var comparison=result.analytics().comparison();
        assertThat(comparison.from()).isEqualTo("2026-09-17");assertThat(comparison.to()).isEqualTo("2026-09-30");assertThat(comparison.totalChangePercent()).isEqualByComparingTo("200");
        assertThat(result.analytics().trend()).hasSize(14);assertThat(result.analytics().trend().get(1).total().preferredTotal()).isZero();
        assertThat(result.analytics().weekdays().get(3).occurrences()).isEqualTo(2);assertThat(result.analytics().weekdays().get(3).averagePerDay()).isEqualByComparingTo("150");
        assertThat(result.analytics().weekdays().get(0).averagePerDay()).isZero();
    }
    @Test void zeroBaselineNeverFabricatesGrowthAndPartialConversionSuppressesAverageAndChange() {
        sale("SALES","2026-10-01","100"); assertThat(read().analytics().comparison().totalChangePercent()).isNull();
        sale(company,unit,business,"POS","2026-10-02","ZZZ","30","approved");
        var result=read();assertThat(result.summary().total().partial()).isTrue();assertThat(result.summary().total().excludedCurrencies()).contains("ZZZ");
        assertThat(result.summary().averageTicket()).isNull();assertThat(result.analytics().comparison().totalChangePercent()).isNull();
        assertThat(result.analytics().trend().get(1).total().partial()).isTrue();
    }
    @Test void convertsNativeCurrenciesThroughTheSharedBackendEngine() {
        sale("SALES","2026-10-01","100");sale(company,unit,business,"POS","2026-10-02","USD","10","approved");
        var result=read();assertThat(result.summary().total().partial()).isFalse();assertThat(result.summary().total().preferredTotal()).isEqualByComparingTo("300");
        assertThat(result.summary().total().nativeTotals()).hasSize(2);assertThat(read("ALL","","ALL",1,25,"USD").summary().total().preferredTotal()).isEqualByComparingTo("15");
    }
    @Test void fullFilteredTotalsRemainIndependentOfPaginationAndSorting() {
        for(int i=0;i<12;i++) sale("SALES","2026-10-01","10");
        var first=read("ALL","","ALL",1,10,"MXN");var second=read("ALL","","ALL",2,10,"MXN");
        assertThat(first.items()).hasSize(10);assertThat(second.items()).hasSize(2);assertThat(second.total()).isEqualTo(12);
        assertThat(first.summary().total().preferredTotal()).isEqualByComparingTo("120");assertThat(second.summary()).isEqualTo(first.summary());
    }
    @Test void amountSortingGroupsCurrenciesAndKeepsStableScopedPages() throws Exception {
        long high=sale("SALES","2026-10-01","500"), low=sale("POS","2026-10-02","10");
        long dollar=sale(company,unit,business,"SALES","2026-10-03","USD","2","approved");
        sale(other,null,null,"SALES","2026-10-01","MXN","9999","approved");
        sale(company,otherUnit,otherBusiness,"SALES","2026-10-01","MXN","9998","approved");
        for(int i=0;i<10;i++) sale("SALES","2026-10-01","100");
        var first=board.read(actor,"2026-10-01","2026-10-14","","ALL","","ALL",null,null,1,10,"amount","desc","MXN","auto");
        var second=board.read(actor,"2026-10-01","2026-10-14","","ALL","","ALL",null,null,2,10,"amount","desc","MXN","auto");
        assertThat(first.total()).isEqualTo(13);
        assertThat(first.items().getFirst().sale().id()).isEqualTo(high);
        assertThat(second.items()).extracting(r->r.sale().id()).endsWith(low,dollar);
        assertThat(first.items()).extracting(r->r.sale().id()).doesNotContainAnyElementsOf(second.items().stream().map(r->r.sale().id()).toList());
        var ascending=board.read(actor,"2026-10-01","2026-10-14","","ALL","","ALL",null,null,1,25,"amount","asc","MXN","auto");
        assertThat(ascending.items().getFirst().sale().id()).isEqualTo(low);
        assertThat(ascending.items().getLast().sale().id()).isEqualTo(dollar);
        mvc.perform(get("/api/v1/sales-board").session(session()).param("from","2026-10-01").param("to","2026-10-14").param("sort","amount"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(13));
    }
    @Test void unlinkedPosAndCrmChannelsStayUnclassifiedAndCrossTenantTicketsDoNotJoin() {
        long id=sale("POS","2026-10-01","200");
        assertThatThrownBy(()->ticket(id,other,"FOREIGN")).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        sale("SALES","2026-10-02","100");
        var result=read();assertThat(result.items()).allSatisfy(row->{assertThat(row.sale().channel()).isEqualTo("UNCLASSIFIED");assertThat(row.sale().ticketId()).isNull();});
        assertThat(result.options().channels()).noneMatch(channel->channel.channel().equals("FOREIGN"));
    }
    @Test void ownerBoundaryEnforcesUnitBusinessTenantAndUnassignedScope() {
        sale("SALES","2026-10-01","100");sale(company,otherUnit,otherBusiness,"SALES","2026-10-01","MXN","50","approved");
        assertThat(sales.read(company,HrOperationalScope.businessOffice(unit,business),filter(unit,business)).total()).isEqualTo(1);
        assertThat(sales.read(company,HrOperationalScope.corporateOffice(),filter(null,null)).total()).isEqualTo(2);
        assertThatThrownBy(()->sales.read(company,HrOperationalScope.unitHeadquarters(unit),filter(otherUnit,null))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->sales.read(company,HrOperationalScope.unitHeadquarters(unit),filter(unit,otherBusiness))).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(()->sales.read(company,HrOperationalScope.unassigned(),filter(null,null))).isInstanceOf(ResponseStatusException.class);
    }
    @Test void exposesPostedAndReversedEvidenceWithoutPostingAnythingOnRead() {
        long id=sale("SALES","2026-10-01","100");
        long period=insert("INSERT INTO finance_accounting_periods(company_id,period_key,period_start,period_end,framework_snapshot,functional_currency_snapshot) VALUES(?,'2026-10','2026-10-01','2026-10-31','LOCAL','MXN')",company);
        long journal=insert("INSERT INTO finance_journal_entries(company_id,period_id,entry_number,entry_date,journal_type,status,description,source_module,source_type,source_id,source_event_key,source_fingerprint,currency_code) VALUES(?,?,'SYN-1','2026-10-01','SALES','POSTED','Synthetic evidence','sales','SALE',?,?,REPEAT('a',64),'MXN')",company,period,String.valueOf(id),"sales:SALE:"+id);
        assertThat(read().items().getFirst().accounting().state()).isEqualTo("POSTED");
        insert("INSERT INTO finance_journal_entries(company_id,period_id,entry_number,entry_date,journal_type,status,description,source_module,source_type,source_id,source_event_key,source_fingerprint,currency_code,reversal_of_entry_id) VALUES(?,?,'SYN-R1','2026-10-02','REVERSAL','POSTED','Synthetic reversal','sales','REVERSAL',?,'synthetic-reversal',REPEAT('b',64),'MXN',?)",company,period,String.valueOf(id),journal);
        var evidence=read().items().getFirst().accounting();assertThat(evidence.state()).isEqualTo("REVERSED");assertThat(evidence.reversalNumber()).isEqualTo("SYN-R1");
        assertThat(db.queryForObject("SELECT COUNT(*) FROM finance_journal_entries WHERE company_id=?",Long.class,company)).isEqualTo(2);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_records WHERE company_id=?",Long.class,company)).isEqualTo(1);
    }
    @Test void validatesFiltersAndTreatsSearchWildcardsLiterally() throws Exception {
        sale("SALES","2026-10-01","100");
        mvc.perform(get("/api/v1/sales-board").session(session()).param("search","%_")).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        for(var param:List.of(Map.entry("direction","desc;DROP"),Map.entry("pageSize","3"),Map.entry("granularity","hour"),Map.entry("from","bad"),Map.entry("origin","invented"))) {
            mvc.perform(get("/api/v1/sales-board").session(session()).param(param.getKey(),param.getValue())).andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/v1/sales-board").session(session()).param("from","2026-11-01").param("to","2026-10-01")).andExpect(status().isBadRequest());
    }
    @Test void nativeSessionEntitlementModuleAndTabGatesFailClosed() throws Exception {
        mvc.perform(get("/api/v1/sales-board")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/sales-board").session(session())).andExpect(status().isOk());
        db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=? AND module_slug='sales_board'",membership);
        mvc.perform(get("/api/v1/sales-board").session(session())).andExpect(status().isForbidden());
        db.update("INSERT INTO user_company_tab_permissions(user_company_id,module_slug,tab_key) VALUES(?,'sales_board','overview')",membership);
        db.update("DELETE FROM user_company_module_roles WHERE user_company_id=? AND module_slug='sales_board'",membership);
        mvc.perform(get("/api/v1/sales-board").session(session())).andExpect(status().isForbidden());
        db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role) VALUES(?,'sales_board','admin')",membership);
        db.update("UPDATE company_module_entitlements SET status='inactive' WHERE company_id=? AND module_slug='sales_board'",company);
        mvc.perform(get("/api/v1/sales-board").session(session())).andExpect(status().isForbidden());
    }
    @Test void rejectsPublicDemoAndUnassignedUsersEvenWithGrants() throws Exception {
        var demo=session();demo.setAttribute(SessionAuthService.SESSION_PUBLIC_DEMO,true);demo.setAttribute(SessionAuthService.SESSION_PUBLIC_DEMO_EXPIRES_AT,java.time.Instant.now().plusSeconds(3600));
        mvc.perform(get("/api/v1/sales-board").session(demo)).andExpect(status().isForbidden());
        db.update("UPDATE user_work_profiles SET unit_id=NULL,business_id=NULL WHERE user_company_id=?",membership);
        mvc.perform(get("/api/v1/sales-board").session(session())).andExpect(status().isForbidden());
    }
}
