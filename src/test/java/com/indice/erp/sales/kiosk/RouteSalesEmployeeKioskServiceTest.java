package com.indice.erp.sales.kiosk;

import com.indice.erp.finance.treasury.TreasuryAccount;
import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.sales.SalesService;
import com.indice.erp.sales.kiosk.RouteSalesKioskDtos.CreateContactRequest;
import com.indice.erp.sales.kiosk.RouteSalesKioskDtos.FiscalProfileRequest;
import com.indice.erp.sales.kiosk.RouteSalesKioskDtos.PaymentEvidenceRegisterRequest;
import com.indice.erp.sales.kiosk.RouteSalesKioskDtos.CreateSaleRequest;
import com.indice.erp.sales.kiosk.RouteSalesKioskDtos.SaleItemRequest;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class RouteSalesEmployeeKioskServiceTest {

    @Mock
    private JdbcTemplate jdbc;

    @Mock
    private SalesService sales;

    @Mock
    private TreasuryService treasury;

    private RouteSalesEmployeeKioskService service;

    @BeforeEach
    void setUp() {
        service = new RouteSalesEmployeeKioskService(jdbc, sales, treasury);
    }

    @Test
    @SuppressWarnings("unchecked")
    void loadsActiveCompanyWarehousesWithoutComparingLegacyFieldsToHrScope() throws Exception {
        var warehouseSql = new AtomicReference<String>();
        var warehouseArguments = new AtomicReference<Object[]>();

        given(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var sql = invocation.getArgument(0, String.class);
                var mapper = (RowMapper<Object>) invocation.getArgument(1, RowMapper.class);
                var invocationArguments = invocation.getArguments();
                var arguments = Arrays.copyOfRange(invocationArguments, 2, invocationArguments.length);
                if (sql.contains("FROM user_companies")) {
                    var row = mock(ResultSet.class);
                    given(row.getLong("user_company_id")).willReturn(1314L);
                    given(row.getString("seller_name")).willReturn("Andrea Martínez López");
                    given(row.getString("email")).willReturn("andrea.martinez@example.com");
                    given(row.getObject("unit_id", Long.class)).willReturn(6L);
                    given(row.getObject("business_id", Long.class)).willReturn(8L);
                    given(row.getString("unit_name")).willReturn("Corporate office");
                    given(row.getString("business_name")).willReturn("Corporate office");
                    return List.of(mapper.mapRow(row, 0));
                }
                if (sql.contains("FROM sales_inventory_warehouses")) {
                    warehouseSql.set(sql);
                    warehouseArguments.set(arguments);
                    var row = mock(ResultSet.class);
                    given(row.getLong("id")).willReturn(1L);
                    given(row.getString("warehouse_code")).willReturn("WH-00001");
                    given(row.getString("name")).willReturn("Cancún");
                    given(row.getString("type")).willReturn("businessWarehouse");
                    given(row.getString("business_unit_id")).willReturn("24");
                    given(row.getString("business_unit_name")).willReturn("Cancún");
                    given(row.getString("business_id")).willReturn("29");
                    given(row.getString("business_name")).willReturn("Cancún headquarters");
                    return List.of(mapper.mapRow(row, 0));
                }
                return List.of();
            });
        given(treasury.listBankCollectionDestinations(2L)).willReturn(List.of(
            new TreasuryAccount(
                88L, 2L, 24L, 29L, "Banco operativo", "BANK", "MXN",
                new BigDecimal("4500.0000"), BigDecimal.ZERO, "ACTIVE", null, false)));

        var bootstrap = service.bootstrap(routeSalesDefinition(), 91L);

        var warehouses = (List<Map<String, Object>>) bootstrap.get("warehouses");
        var paymentAccounts = (List<Map<String, Object>>) bootstrap.get("payment_accounts");
        assertThat(warehouses).hasSize(1);
        assertThat(warehouses.getFirst())
            .containsEntry("id", 1L)
            .containsEntry("name", "Cancún");
        assertThat(warehouseArguments.get()).containsExactly(2L);
        assertThat(warehouseSql.get())
            .contains("company_id = ?", "deleted_at IS NULL", "status")
            .doesNotContain("business_unit_id = CAST", "business_id = CAST");
        assertThat(paymentAccounts).singleElement().satisfies(account -> assertThat(account)
            .containsEntry("id", 88L)
            .containsEntry("name", "Banco operativo")
            .containsEntry("currency", "MXN")
            .doesNotContainKeys("available_balance", "pending_balance", "account_number"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void rejectsPaymentEvidenceForASaleOutsideTheAuthenticatedSellerPortfolio() throws Exception {
        given(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var sql = invocation.getArgument(0, String.class);
                if (!sql.contains("FROM user_companies")) return List.of();
                var mapper = (RowMapper<Object>) invocation.getArgument(1, RowMapper.class);
                var row = mock(ResultSet.class);
                given(row.getLong("user_company_id")).willReturn(1314L);
                given(row.getString("seller_name")).willReturn("Andrea Martínez López");
                given(row.getString("email")).willReturn("andrea.martinez@example.com");
                given(row.getObject("unit_id", Long.class)).willReturn(6L);
                given(row.getObject("business_id", Long.class)).willReturn(8L);
                given(row.getString("unit_name")).willReturn("Corporate office");
                given(row.getString("business_name")).willReturn("Corporate office");
                return List.of(mapper.mapRow(row, 0));
            });

        var request = new PaymentEvidenceRegisterRequest(
            77L,
            "sales/sales/2/payment-evidence/77/evidence.jpg",
            "evidence.jpg",
            "image/jpeg",
            1024L);

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
            service.registerPaymentEvidence(routeSalesDefinition(), 91L, request))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("no pertenece al vendedor");
        verify(sales, never()).registerSalePaymentEvidenceForSale(
            anyLong(), anyLong(), anyLong(), any(Map.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void registersPaymentEvidenceOnlyAfterConfirmingTheAuthenticatedSellerOwnsTheSale() throws Exception {
        given(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var sql = invocation.getArgument(0, String.class);
                var mapper = (RowMapper<Object>) invocation.getArgument(1, RowMapper.class);
                var row = mock(ResultSet.class);
                if (sql.contains("FROM user_companies")) {
                    given(row.getLong("user_company_id")).willReturn(1314L);
                    given(row.getString("seller_name")).willReturn("Andrea Martínez López");
                    given(row.getString("email")).willReturn("andrea.martinez@example.com");
                    given(row.getObject("unit_id", Long.class)).willReturn(6L);
                    given(row.getObject("business_id", Long.class)).willReturn(8L);
                    given(row.getString("unit_name")).willReturn("Corporate office");
                    given(row.getString("business_name")).willReturn("Corporate office");
                    return List.of(mapper.mapRow(row, 0));
                }
                if (sql.contains("FROM sales_records")) {
                    given(row.getLong("id")).willReturn(77L);
                    return List.of(mapper.mapRow(row, 0));
                }
                return List.of();
            });
        var request = new PaymentEvidenceRegisterRequest(
            77L,
            "sales/sales/2/payment-evidence/77/evidence.jpg",
            "evidence.jpg",
            "image/jpeg",
            1024L);
        given(sales.registerSalePaymentEvidenceForSale(anyLong(), anyLong(), anyLong(), any(Map.class)))
            .willReturn(Map.of("id", 501L));

        var result = service.registerPaymentEvidence(routeSalesDefinition(), 91L, request);

        assertThat(result).containsEntry("evidence", Map.of("id", 501L));
        verify(sales).registerSalePaymentEvidenceForSale(
            org.mockito.ArgumentMatchers.eq(2L),
            org.mockito.ArgumentMatchers.eq(91L),
            org.mockito.ArgumentMatchers.eq(77L),
            any(Map.class));
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void createsTheRouteCustomerWithItsAuthoritativeFiscalProfile() throws Exception {
        given(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var sql = invocation.getArgument(0, String.class);
                if (!sql.contains("FROM user_companies")) return List.of();
                var mapper = (RowMapper<Object>) invocation.getArgument(1, RowMapper.class);
                var row = mock(ResultSet.class);
                given(row.getLong("user_company_id")).willReturn(1314L);
                given(row.getString("seller_name")).willReturn("Andrea Martínez López");
                given(row.getString("email")).willReturn("andrea.martinez@example.com");
                given(row.getObject("unit_id", Long.class)).willReturn(6L);
                given(row.getObject("business_id", Long.class)).willReturn(8L);
                given(row.getString("unit_name")).willReturn("Corporate office");
                given(row.getString("business_name")).willReturn("Corporate office");
                return List.of(mapper.mapRow(row, 0));
            });
        given(sales.create(anyLong(), anyLong(), anyString(), any(Map.class)))
            .willAnswer(invocation -> {
                var saved = new LinkedHashMap<>((Map<String, Object>) invocation.getArgument(3, Map.class));
                saved.put("id", 44L);
                saved.put("contactCode", "CON-00044");
                return saved;
            });
        var request = new CreateContactRequest(
            "Cliente de ruta",
            "María López",
            "5551234567",
            "compras@cliente.test",
            new FiscalProfileRequest(
                "mx", "CLIENTE DE RUTA SA DE CV", "XAXX010101000", "CSF-2026",
                "Av. Reforma 100", "Interior 2", "Ciudad de México", "CDMX", "06600",
                "facturacion@cliente.test", "601", "g03", "Enviar XML y PDF"));

        var result = service.createContact(routeSalesDefinition(), 91L, request);

        var contact = (Map<String, Object>) result.get("contact");
        assertThat(contact)
            .containsEntry("id", 44L)
            .containsEntry("fiscal_country", "MX")
            .containsEntry("fiscal_tax_id", "XAXX010101000")
            .containsEntry("fiscal_cfdi_use", "G03");
        var payloadCaptor = ArgumentCaptor.forClass(Map.class);
        verify(sales).create(
            org.mockito.ArgumentMatchers.eq(2L),
            org.mockito.ArgumentMatchers.eq(91L),
            org.mockito.ArgumentMatchers.eq("contacts"),
            payloadCaptor.capture());
        assertThat((Map<String, Object>) payloadCaptor.getValue())
            .containsEntry("fiscalCountry", "MX")
            .containsEntry("fiscalLegalName", "CLIENTE DE RUTA SA DE CV")
            .containsEntry("fiscalTaxId", "XAXX010101000")
            .containsEntry("fiscalPostalCode", "06600")
            .containsEntry("fiscalRegime", "601")
            .containsEntry("fiscalMetadata", Map.of("cfdiUse", "G03"));
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void confirmsElectronicRouteSaleIntoTheSelectedTreasuryAccount() throws Exception {
        given(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var sql = invocation.getArgument(0, String.class);
                var mapper = (RowMapper<Object>) invocation.getArgument(1, RowMapper.class);
                var row = mock(ResultSet.class);
                if (sql.contains("FROM user_companies")) {
                    given(row.getLong("user_company_id")).willReturn(1314L);
                    given(row.getString("seller_name")).willReturn("Andrea Martínez López");
                    given(row.getString("email")).willReturn("andrea.martinez@example.com");
                    given(row.getObject("unit_id", Long.class)).willReturn(24L);
                    given(row.getObject("business_id", Long.class)).willReturn(29L);
                    given(row.getString("unit_name")).willReturn("Cancún");
                    given(row.getString("business_name")).willReturn("Cancún headquarters");
                    return List.of(mapper.mapRow(row, 0));
                }
                if (sql.contains("FROM sales_contacts")) {
                    given(row.getLong("id")).willReturn(44L);
                    given(row.getString("company_name")).willReturn("Cliente de ruta");
                    return List.of(mapper.mapRow(row, 0));
                }
                if (sql.contains("FROM sales_inventory_warehouses")) {
                    given(row.getLong("id")).willReturn(1L);
                    given(row.getString("name")).willReturn("Cancún");
                    given(row.getString("business_unit_id")).willReturn("24");
                    given(row.getString("business_unit_name")).willReturn("Cancún");
                    given(row.getString("business_id")).willReturn("29");
                    given(row.getString("business_name")).willReturn("Cancún headquarters");
                    return List.of(mapper.mapRow(row, 0));
                }
                if (sql.contains("FROM sales_products")) {
                    given(row.getLong("id")).willReturn(20L);
                    given(row.getString("sku")).willReturn("SERV-20");
                    given(row.getString("name")).willReturn("Instalación");
                    given(row.getString("type")).willReturn("SERVICE");
                    given(row.getBigDecimal("price")).willReturn(new BigDecimal("100.00"));
                    given(row.getString("currency")).willReturn("MXN");
                    given(row.getString("tax_category")).willReturn("standard");
                    return List.of(mapper.mapRow(row, 0));
                }
                return List.of();
            });
        var bankAccount = new TreasuryAccount(
            88L, 2L, 24L, 29L, "Banco operativo", "BANK", "MXN",
            BigDecimal.ZERO, BigDecimal.ZERO, "ACTIVE", null, false);
        given(treasury.requireEligibleAccount(
            org.mockito.ArgumentMatchers.eq(2L),
            org.mockito.ArgumentMatchers.eq(88L),
            org.mockito.ArgumentMatchers.eq("MXN"),
            org.mockito.ArgumentMatchers.eq(24L),
            org.mockito.ArgumentMatchers.eq(29L),
            org.mockito.ArgumentMatchers.eq(Set.of("BANK"))))
            .willReturn(bankAccount);
        given(sales.create(anyLong(), anyLong(), anyString(), any(Map.class)))
            .willAnswer(invocation -> {
                var saved = new LinkedHashMap<>((Map<String, Object>) invocation.getArgument(3, Map.class));
                saved.put("id", 77L);
                saved.put("saleNumber", "SAL-00077");
                saved.put("saleDate", "2026-09-10");
                saved.put("subtotal", new BigDecimal("200.00"));
                saved.put("taxTotal", new BigDecimal("32.00"));
                saved.put("totalAmount", new BigDecimal("232.00"));
                return saved;
            });
        var missingAccountRequest = new CreateSaleRequest(
            44L, 1L, "transfer", "REF-2026-09-10", null, true, null,
            List.of(new SaleItemRequest(20L, new BigDecimal("2"))));
        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
            service.createSale(routeSalesDefinition(), 91L, missingAccountRequest))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("cuenta bancaria");
        verify(sales, never()).create(anyLong(), anyLong(), anyString(), any(Map.class));

        var request = new CreateSaleRequest(
            44L, 1L, "transfer", "REF-2026-09-10", 88L, true, null,
            List.of(new SaleItemRequest(20L, new BigDecimal("2"))));

        var result = service.createSale(routeSalesDefinition(), 91L, request);

        assertThat(result)
            .containsEntry("settlement_status", "settled")
            .containsEntry("message", "Venta registrada. El inventario y el ingreso en Tesorería quedaron actualizados.");
        var payloadCaptor = ArgumentCaptor.forClass(Map.class);
        verify(sales).create(
            org.mockito.ArgumentMatchers.eq(2L),
            org.mockito.ArgumentMatchers.eq(91L),
            org.mockito.ArgumentMatchers.eq("sales"),
            payloadCaptor.capture());
        var payload = (Map<String, Object>) payloadCaptor.getValue();
        assertThat(payload)
            .containsEntry("paymentMethod", "transfer")
            .containsEntry("paymentReference", "REF-2026-09-10")
            .containsEntry("financeStatus", "approved");
        assertThat((Map<String, Object>) payload.get("customFields"))
            .containsEntry("paymentAccountId", 88L)
            .containsEntry("paymentAccountName", "Banco operativo")
            .containsEntry("routeSettlementMode", "DIRECT_TREASURY_BANK");
        assertThat((Map<String, Object>) result.get("sale"))
            .containsEntry("payment_account_id", 88L)
            .containsEntry("payment_account_name", "Banco operativo")
            .containsEntry("finance_status", "approved");
    }

    private KioskResolvedDefinition routeSalesDefinition() {
        return new KioskResolvedDefinition(
            12L, 2L, "SALES", RouteSalesEmployeeKioskService.KIOSK_TYPE,
            null, "SYSTEM-EMPLOYEE-ROUTE-SALES", "Venta en ruta",
            KioskDefinitionStatus.ACTIVE, null, null, null, KioskAccessLevel.CONTROLLED,
            null, "", false, 1, 1);
    }
}
