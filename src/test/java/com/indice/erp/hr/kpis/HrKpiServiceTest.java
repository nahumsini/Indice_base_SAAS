package com.indice.erp.hr.kpis;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.users.HrUserService;
import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.hr.assistant.*;
import com.indice.erp.hr.assistant.HrAssistantContracts.*;
import com.indice.erp.hr.kpis.HrKpiContracts.*;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
class HrKpiServiceTest {
    @Test void fullAssetPopulationAndUnavailableSourcesDoNotBecomeZero(){
        var people=mock(HrUserService.class);var attendance=mock(HrAttendanceService.class);var assets=mock(HrAssistantService.class);var records=mock(HrAssistantRecordsService.class);var permissions=mock(HrAssistantPermissionsService.class);
        var user=new AuthSessionUser(2L,3L,4L,"Synthetic","root");
        when(people.listUsers(user)).thenReturn(Map.of("rows",List.of(Map.of("id",4L,"full_name","Synthetic","status","active","unit_id",8L,"business_id",9L,"department","Operations"))));
        var all=java.util.stream.LongStream.rangeClosed(1,125).mapToObj(id->new AssetView(id,"A-"+id,"Synthetic equipment","equipment","","",8L,"Unit",4L,"Synthetic","assigned",null,"","",0)).toList();
        when(assets.assets(eq(user),any())).thenAnswer(invocation->{var request=(PageRequest)invocation.getArgument(1);int from=(request.page()-1)*request.limit();var items=all.subList(from,Math.min(from+request.limit(),all.size()));boolean more=from+items.size()<all.size();return new Page<>(items,items.size(),125,more,more?request.page()+1:null,more?"next":null);});
        var owner=new HrKpiService(people,attendance,assets,records,permissions);
        var request=new Request(LocalDate.of(2026,10,6),LocalDate.of(2026,10,1),LocalDate.of(2026,10,31),8L,9L,"Operations",null,null);
        var result=owner.measure(user,request,new Availability(true,false,true,false,false));
        assertThat(result.assets().assignedItems()).isEqualTo(125);assertThat(result.assets().assignedPeople()).isEqualTo(1);assertThat(result.workforce().total()).isEqualTo(1);
        assertThat(result.attendance()).isNull();assertThat(result.records()).isNull();assertThat(result.permissions()).isNull();assertThat(result.sources()).filteredOn(s->!s.available()).hasSize(3);
        verify(assets,times(2)).assets(eq(user),any());verifyNoInteractions(attendance,records,permissions);
        var unavailable=owner.measure(user,request,new Availability(false,true,true,true,true));
        assertThat(unavailable.assets()).isNull();assertThat(unavailable.workforce()).isNull();assertThat(unavailable.sources()).noneMatch(Source::available);
    }
    @Test void inconsistentOrRepeatedSourcePagesFailClosed(){
        var people=mock(HrUserService.class);var assets=mock(HrAssistantService.class);
        var user=new AuthSessionUser(2L,3L,4L,"Synthetic","root");when(people.listUsers(user)).thenReturn(Map.of("rows",List.of()));
        var item=new AssetView(1,"A-1","Equipment","equipment","","",null,"",null,"","available",null,"","",0);
        when(assets.assets(eq(user),any())).thenReturn(new Page<>(List.of(item),1,2,true,2,"next"),new Page<>(List.of(item),1,2,false,null,null));
        var owner=new HrKpiService(people,mock(HrAttendanceService.class),assets,mock(HrAssistantRecordsService.class),mock(HrAssistantPermissionsService.class));
        var day=LocalDate.of(2026,10,6);assertThatThrownBy(()->owner.measure(user,new Request(day,day,day,null,null,null,null,null),new Availability(true,false,true,false,false))).isInstanceOf(IllegalStateException.class).hasMessageContaining("incomplete");
    }
}
