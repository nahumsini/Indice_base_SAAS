package com.indice.erp.ai.hr;

import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.HrAccessService.HrTab;
import java.util.Set;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiHrAccessTest {
    final AiToolAuthorizationService authorization=mock(AiToolAuthorizationService.class);
    final HrAccessService hr=mock(HrAccessService.class);
    final AiHrAccess access=new AiHrAccess(authorization,hr);
    final AuthSessionUser user=new AuthSessionUser(1L,2L,3L,"Synthetic operator","root");

    @Test void exactRecordsScopeRoleAndCurrentEntitlementAreAllRequired() {
        var token=new StoredToken(1,user,Set.of("hr.records.read"));
        when(authorization.canReadGuideTab(user,"human_resources","records")).thenReturn(true);
        when(hr.canAccessManagementTab(user,HrTab.RECORDS)).thenReturn(true);
        assertThat(access.allowed(token,"list_hr_records")).isTrue();
        assertThat(access.allowed(new StoredToken(1,user,Set.of("hr.people:read")),"list_hr_records")).isFalse();
        when(hr.canAccessManagementTab(user,HrTab.RECORDS)).thenReturn(false);
        assertThat(access.allowed(token,"get_hr_record_detail")).isFalse();
        when(hr.canAccessManagementTab(user,HrTab.RECORDS)).thenReturn(true);
        when(authorization.canReadGuideTab(user,"human_resources","records")).thenReturn(false);
        assertThatThrownBy(()->access.require(token,"get_hr_record_detail")).isInstanceOf(SecurityException.class);
    }
}
