package com.indice.erp.hr.assistant;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.records.HrRecordService;
import com.indice.erp.hr.assistant.HrAssistantContracts.PageRequest;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class HrAssistantRecordsServiceTest {
    final HrRecordService records = mock(HrRecordService.class);
    final HrAssistantRecordsService service = new HrAssistantRecordsService(records);
    final AuthSessionUser user = new AuthSessionUser(1L,2L,3L,"Synthetic operator","root");

    @Test void keepsAuthorizedMetadataAndHistoryWithoutPrivateMaterial() throws Exception {
        var row = Map.<String,Object>of("id",7L,"record_number","A-7","user",Map.of("id",9L,"name","Synthetic employee"),
            "attachments",List.of(Map.of("id",11L,"original_filename","test.pdf","mime_type","application/pdf","size_bytes",42L,"object_key","private-key","download_url","private-url")),
            "activity",List.of(Map.of("activity_type","status_changed","to_status","resolved","actor_name","Synthetic operator","actor_user_id",999L)));
        when(records.getRecordDetails(user,7)).thenReturn(Map.of("record",row));
        var result = service.detail(user,7);
        assertThat(result.attachments().getFirst().fileName()).isEqualTo("test.pdf");
        assertThat(result.history().getFirst().toStatus()).isEqualTo("resolved");
        assertThat(new ObjectMapper().writeValueAsString(result)).doesNotContain("private-key","private-url","actor_user_id","999");
        when(records.getRecordDetails(user,8)).thenThrow(new NoSuchElementException());
        assertThatThrownBy(()->service.detail(user,8)).isInstanceOf(NoSuchElementException.class);
    }

    @Test void continuesTheSameOwnerFilterAndRejectsCrossActorToolAndFilterCursors() {
        when(records.listRecords(eq(user),anyMap())).thenReturn(Map.of("rows",List.of(),"total_count",3L));
        var first = service.list(user,new PageRequest("test","pending",4L,null,null,1));
        assertThat(first.hasMore()).isTrue();assertThat(first.nextCursor()).isNotBlank();
        service.list(user,new PageRequest("test","pending",4L,null,null,1,first.nextCursor()));
        verify(records).listRecords(user,Map.of("page",2,"size",1,"search","test","status","pending","unit_id",4L));
        assertThatThrownBy(()->service.list(user,new PageRequest("other","pending",4L,null,null,1,first.nextCursor()))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->service.list(new AuthSessionUser(1L,5L,3L,"Other","root"),new PageRequest("test","pending",4L,null,null,1,first.nextCursor()))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->HrAssistantPages.window(user,"list_hr_assets",new PageRequest("test","pending",4L,null,null,1,first.nextCursor()))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->service.list(user,new PageRequest(null,null,null,null,Integer.MAX_VALUE,100))).isInstanceOf(IllegalArgumentException.class);
    }
}
