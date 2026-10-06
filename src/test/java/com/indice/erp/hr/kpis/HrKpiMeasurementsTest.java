package com.indice.erp.hr.kpis;
import static org.assertj.core.api.Assertions.*;
import static com.indice.erp.hr.kpis.HrKpiMeasurements.*;
import java.util.*;
import org.junit.jupiter.api.Test;
class HrKpiMeasurementsTest {
    @Test void attendanceDistinguishesCompletedSamplesFromPendingRestLeaveAndNoSchedule(){
        var result=attendance(List.of(new AttendanceSignal("on_time",true,false),new AttendanceSignal("late",true,false),new AttendanceSignal("absence",true,false),new AttendanceSignal("pending",true,false),new AttendanceSignal("rest",true,true),new AttendanceSignal("leave",true,false),new AttendanceSignal("not_scheduled",false,false)));
        assertThat(result.scheduled()).isEqualTo(4);assertThat(result.completedSample()).isEqualTo(3);assertThat(result.present()).isEqualTo(2);
        assertThat(result.attendanceRate()).isEqualTo(67);assertThat(result.punctualityRate()).isEqualTo(50);assertThat(result.absence()).isEqualTo(1);
        assertThat(attendance(List.of(new AttendanceSignal("pending",true,false))).attendanceRate()).isNull();assertThat(attendance(List.of()).punctualityRate()).isNull();
    }
    @Test void recordsAndAssetsUseOpenSeverityAndDistinctVisibleResponsiblePeople(){
        var records=records(List.of(new RecordSignal("pending","high"),new RecordSignal("reviewed","high"),new RecordSignal("resolved","high"),new RecordSignal("pending","low")));
        assertThat(records.criticalOpen()).isEqualTo(2);assertThat(records.open()).isEqualTo(3);assertThat(records.resolved()).isEqualTo(1);
        var assets=assets(List.of(new AssetSignal("assigned",4L),new AssetSignal("custody",4L),new AssetSignal("assigned",9L),new AssetSignal("available",null),new AssetSignal("maintenance",null)),Set.of(4L));
        assertThat(assets.assignedItems()).isEqualTo(3);assertThat(assets.assignedPeople()).isEqualTo(1);assertThat(assets.available()).isEqualTo(1);assertThat(assets.maintenance()).isEqualTo(1);
    }
}
