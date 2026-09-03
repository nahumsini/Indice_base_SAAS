package com.indice.erp.pos.restaurant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.AddItemRequest;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.ItemStatusRequest;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.OpenOrderRequest;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.TableLayoutRequest;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.UpdateFloorPlanRequest;
import com.indice.erp.pos.shift.ShiftRepository;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@ExtendWith(MockitoExtension.class)
class RestaurantOrderServiceTest {

    @Mock RestaurantOrderRepository repository;
    @Mock CashRegisterService cashRegisters;
    @Mock KioskRegistryService registry;
    @Mock ShiftRepository shifts;

    private RestaurantOrderService service;

    @BeforeEach
    void setUp() {
        service = new RestaurantOrderService(
            repository, cashRegisters, registry, new BCryptPasswordEncoder(), shifts);
        lenient().when(repository.kiosk(7L, 17L)).thenReturn(Optional.of(kiosk()));
    }

    @Test
    void pinIdentityMustBelongToTheKioskBusinessScope() {
        var candidate = candidate(91L, 900L, 2L, 99L, "employee", "246810");
        when(repository.pinCandidates(7L)).thenReturn(List.of(candidate));

        assertThatThrownBy(() -> service.identify(definition(), "246810"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Credential validation failed.");
    }

    @Test
    @SuppressWarnings("unchecked")
    void pinIdentityReturnsOnlyTheStableEmployeeIdentityForTheSameScope() {
        var candidate = candidate(91L, 900L, 2L, 3L, "employee", "246810");
        when(repository.pinCandidates(7L)).thenReturn(List.of(candidate));

        var response = service.identify(definition(), "246810");

        assertThat((Map<String, Object>) response.get("engine_identity"))
            .containsEntry("type", "EMPLOYEE")
            .containsEntry("id", 91L);
        assertThat(response).doesNotContainKeys("companyId", "unitId", "businessId");
    }

    @Test
    void sessionIsRevokedWhenTheEmployeeIsNoLongerActive() {
        when(repository.employeeScope(7L, 91L)).thenReturn(Optional.empty());

        assertThat(service.canUseSession(definition(), 91L)).isFalse();
    }

    @Test
    void superadminPinCanOperateAStationOutsideTheEmployeeWorkScope() {
        var candidate = candidate(91L, 900L, 8L, 11L, "superadmin", "246810");
        when(repository.pinCandidates(7L)).thenReturn(List.of(candidate));

        var response = service.identify(definition(), "246810");

        assertThat(response).containsKey("identification_token");
    }

    @Test
    void superadminSessionRemainsValidOutsideTheEmployeeWorkScope() {
        var scope = new LinkedHashMap<String, Object>();
        scope.put("userCompanyId", 91L);
        scope.put("role", "superadmin");
        scope.put("unitId", 8L);
        scope.put("businessId", 11L);
        when(repository.employeeScope(7L, 91L)).thenReturn(Optional.of(scope));

        assertThat(service.canUseSession(definition(), 91L)).isTrue();
    }

    @Test
    void multiKioskResolvesAnActiveCompanyMembershipWithoutStationScope() {
        var scope = new LinkedHashMap<String, Object>();
        scope.put("userCompanyId", 91L);
        scope.put("role", "user");
        scope.put("unitId", 8L);
        scope.put("businessId", 11L);
        when(repository.employeeScopeForUser(7L, 900L)).thenReturn(Optional.of(scope));

        assertThat(service.requireCompanyEmployeeMembership(definition(), 900L)).isEqualTo(91L);
    }

    @Test
    void multiKioskRejectsAUserWithoutAnActiveCompanyMembership() {
        when(repository.employeeScopeForUser(7L, 900L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.requireCompanyEmployeeMembership(definition(), 900L))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Employee is not active in the restaurant kiosk company.");
    }

    @Test
    void ordinaryWaiterCannotEditTheFloorPlan() {
        when(repository.employeeScope(7L, 91L)).thenReturn(Optional.of(scope("employee")));

        assertThat(service.canEditFloorPlan(definition(), 91L)).isFalse();
        assertThatThrownBy(() -> service.updateFloorPlan(
            definition(), 91L, new UpdateFloorPlanRequest(List.of(layout(41L, "Mesa 01", 1L)))))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Restaurant floor-plan editing is not allowed.");

        verify(repository, never()).updateTableLayout(
            anyLong(), anyLong(), anyLong(), anyString(), anyInt(), anyString(),
            anyInt(), anyInt(), anyInt(), anyInt(), anyInt(), anyLong());
    }

    @Test
    void supervisorCanPersistACompleteVersionedFloorPlan() {
        when(repository.employeeScope(7L, 91L)).thenReturn(Optional.of(scope("supervisor")));
        when(repository.tables(7L, 31L, null, null)).thenReturn(List.of(table(41L, "Mesa 01", 1L)));
        when(repository.updateTableLayout(
            7L, 31L, 41L, "Terraza", 6, "RECTANGLE", 0, 0, 4, 2, 0, 1L)).thenReturn(true);
        when(shifts.hasOpenShift(7L, 13L)).thenReturn(true);

        var result = service.updateFloorPlan(
            definition(), 91L,
            new UpdateFloorPlanRequest(List.of(new TableLayoutRequest(
                41L, "Terraza", 6, "RECTANGLE", 0, 0, 4, 2, 0, 1L))));

        assertThat(result).containsEntry("canEditFloorPlan", true);
        verify(repository).updateTableLayout(
            7L, 31L, 41L, "Terraza", 6, "RECTANGLE", 0, 0, 4, 2, 0, 1L);
        verify(repository).event(
            7L, 31L, null, null, 700L, 91L, null,
            "RESTAURANT_FLOOR_PLAN_UPDATED", null, null, "Updated layout for 1 tables");
    }

    @Test
    void supervisorCanEditTheSharedFloorPlanFromTheOrderCenterButNotFromKitchen() {
        when(repository.employeeScope(7L, 91L)).thenReturn(Optional.of(scope("supervisor")));
        when(repository.tables(7L, 31L, null, null)).thenReturn(List.of(table(41L, "Mesa 01", 1L)));
        when(repository.updateTableLayout(
            7L, 31L, 41L, "Mesa 01", 4, "ROUND", 0, 0, 3, 3, 0, 1L)).thenReturn(true);

        assertThat(service.canEditFloorPlan(definition("table_order_center"), 91L)).isTrue();
        assertThat(service.canEditFloorPlan(definition("kitchen_display"), 91L)).isFalse();
        assertThat(service.updateFloorPlan(
            definition("table_order_center"), 91L,
            new UpdateFloorPlanRequest(List.of(layout(41L, "Mesa 01", 1L)))))
            .containsEntry("canEditFloorPlan", true);
    }

    @Test
    void kitchenAdvancesEveryItemInAGroupedRoundWithIndividualTraceEvents() {
        when(shifts.findOperationalShiftId(7L, 13L)).thenReturn(Optional.of(401L));
        when(repository.updateItemStatus(7L, 31L, 401L, 101L, "SENT,ACKNOWLEDGED", "PREPARING")).thenReturn(true);
        when(repository.updateItemStatus(7L, 31L, 401L, 102L, "SENT,ACKNOWLEDGED", "PREPARING")).thenReturn(true);
        when(repository.itemOrderId(7L, 31L, 101L)).thenReturn(51L);
        when(repository.itemOrderId(7L, 31L, 102L)).thenReturn(51L);

        var result = service.updateItemStatus(
            definition("kitchen_display"), 91L,
            new ItemStatusRequest(null, List.of(101L, 102L), "PREPARING", "KDS grouped round 1"));

        assertThat(result).containsEntry("kioskType", "kitchen_display");
        verify(repository).updateItemStatus(7L, 31L, 401L, 101L, "SENT,ACKNOWLEDGED", "PREPARING");
        verify(repository).updateItemStatus(7L, 31L, 401L, 102L, "SENT,ACKNOWLEDGED", "PREPARING");
        verify(repository).event(
            7L, 31L, 51L, 101L, 700L, 91L, null,
            "RESTAURANT_ITEM_PREPARING", null, "PREPARING", "KDS grouped round 1");
        verify(repository).event(
            7L, 31L, 51L, 102L, 700L, 91L, null,
            "RESTAURANT_ITEM_PREPARING", null, "PREPARING", "KDS grouped round 1");
    }

    @Test
    void orderCenterCannotMutateKitchenPreparationState() {
        assertThatThrownBy(() -> service.updateItemStatus(
            definition("table_order_center"), 91L,
            new ItemStatusRequest(101L, null, "PREPARING", "Manual request")))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Item status transition is not available for this kiosk type.");

        verify(repository, never()).updateItemStatus(
            anyLong(), anyLong(), anyLong(), anyLong(), anyString(), anyString());
    }

    @Test
    void waiterCanOnlyMarkReadyItemsAsServed() {
        assertThatThrownBy(() -> service.updateItemStatus(
            definition("waiter_station"), 91L,
            new ItemStatusRequest(101L, null, "PREPARING", "Manual request")))
            .isInstanceOf(SecurityException.class);

        when(shifts.findOperationalShiftId(7L, 13L)).thenReturn(Optional.of(401L));
        when(repository.updateItemStatus(7L, 31L, 401L, 101L, "READY", "SERVED")).thenReturn(true);
        when(repository.itemOrderId(7L, 31L, 101L)).thenReturn(51L);
        when(repository.attributeWaiter(7L, 31L, 401L, 51L, 91L)).thenReturn(true);
        assertThat(service.updateItemStatus(
            definition("waiter_station"), 91L,
            new ItemStatusRequest(101L, null, "SERVED", "Delivered to table")))
            .containsEntry("kioskType", "waiter_station");
    }

    @Test
    void floorPlanRejectsOverlappingTablesBeforeWriting() {
        when(repository.employeeScope(7L, 91L)).thenReturn(Optional.of(scope("supervisor")));
        when(repository.tables(7L, 31L, null, null)).thenReturn(List.of(
            table(41L, "Mesa 01", 1L), table(42L, "Mesa 02", 1L)));

        var request = new UpdateFloorPlanRequest(List.of(
            layout(41L, "Mesa 01", 1L),
            layout(42L, "Mesa 02", 1L)));

        assertThatThrownBy(() -> service.updateFloorPlan(definition(), 91L, request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Restaurant tables cannot overlap.");

        verify(repository, never()).updateTableLayout(
            anyLong(), anyLong(), anyLong(), anyString(), anyInt(), anyString(),
            anyInt(), anyInt(), anyInt(), anyInt(), anyInt(), anyLong());
    }

    @Test
    void closedSettlementRegisterBlocksNewRestaurantOrders() {
        when(shifts.findOperationalShiftId(7L, 13L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.openOrder(
            definition(), 91L, new OpenOrderRequest(41L, 2, null)))
            .isInstanceOf(PosApiException.class)
            .hasMessage("The restaurant settlement register is closed.");

        verify(repository, never()).openOrder(
            anyLong(), anyLong(), anyLong(), anyLong(), nullable(Long.class), anyLong(), anyLong(), anyLong(),
            org.mockito.ArgumentMatchers.anyString(),
            org.mockito.ArgumentMatchers.anyInt(),
            org.mockito.ArgumentMatchers.anyString(),
            org.mockito.ArgumentMatchers.nullable(String.class));
    }

    @Test
    void orderCenterCanAssignAnAvailableTableAsHostess() {
        when(shifts.findOperationalShiftId(7L, 13L)).thenReturn(Optional.of(401L));
        when(repository.openOrder(
            eq(7L), eq(31L), eq(41L), eq(91L), nullable(Long.class), eq(17L), eq(13L), eq(401L),
            anyString(), eq(3), eq("MXN"), nullable(String.class))).thenReturn(51L);
        when(shifts.hasOpenShift(7L, 13L)).thenReturn(true);

        var result = service.openOrder(
            definition("table_order_center"), 91L, new OpenOrderRequest(41L, 3, null));

        assertThat(result).containsEntry("kioskType", "table_order_center");
        verify(repository).openOrder(
            eq(7L), eq(31L), eq(41L), eq(91L), nullable(Long.class), eq(17L), eq(13L), eq(401L),
            anyString(), eq(3), eq("MXN"), nullable(String.class));
        verify(repository).event(
            7L, 31L, 51L, null, 700L, 91L, null,
            "RESTAURANT_ORDER_OPENED", null, "OPEN", null);
    }

    @Test
    void waiterOpeningATableBecomesItsResponsibleEmployee() {
        when(shifts.findOperationalShiftId(7L, 13L)).thenReturn(Optional.of(401L));
        when(repository.openOrder(
            eq(7L), eq(31L), eq(41L), eq(91L), eq(91L), eq(17L), eq(13L), eq(401L),
            anyString(), eq(2), eq("MXN"), nullable(String.class))).thenReturn(51L);

        service.openOrder(definition("waiter_station"), 91L, new OpenOrderRequest(41L, 2, null));

        verify(repository).openOrder(
            eq(7L), eq(31L), eq(41L), eq(91L), eq(91L), eq(17L), eq(13L), eq(401L),
            anyString(), eq(2), eq("MXN"), nullable(String.class));
    }

    @Test
    void restaurantItemRequiresAValidGuestNumber() {
        assertThatThrownBy(() -> service.addItem(
            definition(), 91L,
            new AddItemRequest(51L, 61L, BigDecimal.ONE, 0, null, null, "GENERAL")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("guestNumber must be between 1 and 1000.");

        verify(repository, never()).addItem(
            anyLong(), anyLong(), anyLong(), anyString(), anyLong(), anyLong(), anyLong(),
            org.mockito.ArgumentMatchers.any(BigDecimal.class), anyInt(),
            org.mockito.ArgumentMatchers.nullable(String.class),
            org.mockito.ArgumentMatchers.nullable(String.class), anyString());
    }

    @Test
    void waiterItemCaptureAttributesTheOrderToTheAuthenticatedPinIdentity() {
        when(shifts.findOperationalShiftId(7L, 13L)).thenReturn(Optional.of(401L));
        when(repository.attributeWaiter(7L, 31L, 401L, 51L, 91L)).thenReturn(true);
        when(repository.addItem(
            7L, 31L, 11L, "MXN", 51L, 401L, 61L, BigDecimal.ONE,
            2, null, null, "GENERAL")).thenReturn(101L);

        service.addItem(
            definition("waiter_station"), 91L,
            new AddItemRequest(51L, 61L, BigDecimal.ONE, 2, null, null, "GENERAL"));

        verify(repository).attributeWaiter(7L, 31L, 401L, 51L, 91L);
        verify(repository).event(
            7L, 31L, 51L, 101L, 700L, 91L, null,
            "RESTAURANT_ITEM_ADDED", null, "DRAFT", null);
    }

    @Test
    void closedShiftReturnsACleanOperationalWorkspaceWithoutDeletingTraceHistory() {
        when(shifts.findOperationalShiftId(7L, 13L)).thenReturn(Optional.empty());
        when(repository.tables(7L, 31L, null, null)).thenReturn(List.of(table(41L, "Mesa 01", 8L)));

        var result = service.workspace(definition("kitchen_display"), 91L);

        assertThat(result)
            .containsEntry("orders", List.of())
            .containsEntry("kitchenItems", List.of());
        verify(repository, never()).orders(anyLong(), anyLong());
        verify(repository, never()).ordersForShift(anyLong(), anyLong(), anyLong());
        verify(repository, never()).kitchenItems(anyLong(), anyLong(), anyLong(), anyString());
    }

    @Test
    void kitchenWorkspaceReadsOnlyTheCurrentSettlementShift() {
        when(shifts.findOperationalShiftId(7L, 13L)).thenReturn(Optional.of(401L));
        when(repository.ordersForShift(7L, 31L, 401L)).thenReturn(List.of(Map.of("id", 51L)));
        when(repository.items(7L, 51L)).thenReturn(List.of(Map.of("id", 101L)));
        when(repository.kitchenItems(7L, 31L, 401L, "ALL"))
            .thenReturn(List.of(Map.of("id", 101L)));

        var result = service.workspace(definition("kitchen_display"), 91L);

        assertThat((List<?>) result.get("orders")).hasSize(1);
        assertThat((List<?>) result.get("kitchenItems")).hasSize(1);
        verify(repository).ordersForShift(7L, 31L, 401L);
        verify(repository).kitchenItems(7L, 31L, 401L, "ALL");
        verify(repository, never()).orders(7L, 31L);
    }

    private KioskResolvedDefinition definition() {
        return definition("waiter_station");
    }

    private KioskResolvedDefinition definition(String kioskType) {
        return new KioskResolvedDefinition(
            700L, 7L, "POINT_OF_SALE", kioskType, 17L,
            "WAITER-01", "Estación de mesero", KioskDefinitionStatus.ACTIVE,
            2L, 3L, 11L, KioskAccessLevel.CONTROLLED, null,
            "hint", true, 1, 1);
    }

    private Map<String, Object> kiosk() {
        return Map.of(
            "id", 17L,
            "ecosystemId", 31L,
            "unitId", 2L,
            "businessId", 3L,
            "warehouseId", 11L,
            "cashRegisterId", 13L,
            "currencyCode", "MXN",
            "name", "Estación de mesero",
            "ecosystemName", "Salón principal");
    }

    private Map<String, Object> candidate(
            long userCompanyId, long userId, Long unitId, Long businessId, String role, String pin) {
        var result = new LinkedHashMap<String, Object>();
        result.put("secretHash", new BCryptPasswordEncoder().encode(pin));
        result.put("userCompanyId", userCompanyId);
        result.put("userId", userId);
        result.put("role", role);
        result.put("fullName", "Ana Mesera");
        result.put("userCode", "MES-01");
        result.put("unitId", unitId);
        result.put("businessId", businessId);
        return result;
    }

    private Map<String, Object> scope(String role) {
        var result = new LinkedHashMap<String, Object>();
        result.put("userCompanyId", 91L);
        result.put("role", role);
        result.put("unitId", 2L);
        result.put("businessId", 3L);
        return result;
    }

    private Map<String, Object> table(long id, String name, long version) {
        return Map.of(
            "id", id,
            "areaId", 51L,
            "areaName", "Salón principal",
            "name", name,
            "version", version,
            "guestCount", 0);
    }

    private TableLayoutRequest layout(long id, String name, long version) {
        return new TableLayoutRequest(id, name, 4, "ROUND", 0, 0, 3, 3, 0, version);
    }
}
