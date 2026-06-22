package com.indice.erp.hr;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.permissions.HrPermissionDetailRepository;
import com.indice.erp.hr.permissions.HrPermissionListRepository;
import com.indice.erp.hr.permissions.HrPermissionQueryService;
import com.indice.erp.hr.permissions.PermissionActor;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HrPermissionQueryServiceTest {

    @Mock
    private HrPermissionListRepository listRepository;

    @Mock
    private HrPermissionDetailRepository detailRepository;

    @Mock
    private ObjectStorageService objectStorageService;

    @Mock
    private ObjectStorageProperties storageProperties;

    @Mock
    private HrOperationalScopeService hrOperationalScopeService;

    @Test
    void listManagementUsesResolvedOperationalScope() {
        var service = new HrPermissionQueryService(
            listRepository,
            detailRepository,
            objectStorageService,
            storageProperties,
            hrOperationalScopeService
        );
        var actor = new PermissionActor(1L, 7L, 12L, "Unit Admin", "admin", List.of("human_resources"));
        var filters = Map.of("status", "pending");
        var scope = HrOperationalScope.unitHeadquarters(4L);
        var result = new HrPermissionListRepository.PermissionListResult(List.of(), 0L, Map.of());

        when(hrOperationalScopeService.resolve(any(AuthSessionUser.class))).thenReturn(scope);
        when(listRepository.listRequests(7L, null, scope, filters)).thenReturn(result);

        service.listManagement(actor, filters);

        var currentUser = ArgumentCaptor.forClass(AuthSessionUser.class);
        verify(hrOperationalScopeService).resolve(currentUser.capture());
        assertEquals(1L, currentUser.getValue().userId());
        assertEquals(7L, currentUser.getValue().companyId());
        assertEquals(12L, currentUser.getValue().userCompanyId());
        assertEquals("admin", currentUser.getValue().role());
        verify(listRepository).listRequests(7L, null, scope, filters);
    }
}
