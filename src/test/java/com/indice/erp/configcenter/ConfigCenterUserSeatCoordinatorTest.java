package com.indice.erp.configcenter;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verifyNoInteractions;

import com.indice.erp.billing.seats.SeatCapacityExceededException;
import com.indice.erp.billing.seats.SeatService;
import com.indice.erp.billing.seats.SeatService.SeatSnapshot;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ConfigCenterUserSeatCoordinatorTest {

    @Mock
    private ConfigCenterService users;

    @Mock
    private SeatService seats;

    @InjectMocks
    private ConfigCenterUserSeatCoordinator coordinator;

    @Test
    void authorizationIsValidatedBeforeSeatCapacity() {
        doThrow(new IllegalArgumentException("Forbidden target."))
            .when(users).requireCanActivateUser(7L, 1L, "admin", 5L);

        assertThrows(
            IllegalArgumentException.class,
            () -> coordinator.activate(7L, 1L, "admin", 5L)
        );

        verifyNoInteractions(seats);
    }

    @Test
    void capacityIsReservedBeforeTheUserIsActivated() {
        var order = inOrder(users, seats);

        coordinator.activate(7L, 1L, "admin", 5L);

        order.verify(users).requireCanActivateUser(7L, 1L, "admin", 5L);
        order.verify(seats).requireAvailableSeatForActivation(7L, 5L);
        order.verify(users).activateUser(7L, 1L, "admin", 5L);
    }

    @Test
    void fullCapacityStopsBeforeMutatingTheUser() {
        doThrow(new SeatCapacityExceededException(
            "Seat limit reached.",
            new SeatSnapshot(7L, true, 5, 0, 0, 5, 0)
        )).when(seats).requireAvailableSeatForActivation(7L, 5L);
        var order = inOrder(users, seats);

        assertThrows(
            SeatCapacityExceededException.class,
            () -> coordinator.activate(7L, 1L, "admin", 5L)
        );

        order.verify(users).requireCanActivateUser(7L, 1L, "admin", 5L);
        order.verify(seats).requireAvailableSeatForActivation(7L, 5L);
        order.verifyNoMoreInteractions();
    }
}
