package com.indice.erp.hr.assistant;

import static com.indice.erp.hr.assistant.HrAssistantContracts.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.records.HrRecordService;
import java.util.*;
import org.springframework.stereotype.Service;

/** HR records read projection; file keys, private URLs and raw account IDs never cross this boundary. */
@Service
public class HrAssistantRecordsService {
    private final HrRecordService records;
    public HrAssistantRecordsService(HrRecordService records) { this.records=records; }
    public RecordView detail(AuthSessionUser user,long id) { return view(map(records.getRecordDetails(user,id).get("record"))); }
    public Page<RecordView> list(AuthSessionUser user,PageRequest request) {
        var args=request==null?new PageRequest(null,null,null,null,1,25):request;
        var window=HrAssistantPages.window(user,"list_hr_records",args);
        int page=window.page(),size=window.size();
        var filters=new LinkedHashMap<String,Object>();filters.put("page",page);filters.put("size",size);
        put(filters,"search",args.query());put(filters,"status",args.status());put(filters,"unit_id",args.unitId());put(filters,"business_id",args.businessId());
        var result=records.listRecords(user,filters);
        var items=rows(result.get("rows")).stream().map(HrAssistantRecordsService::view).toList();
        long total=((Number)result.get("total_count")).longValue();
        return window.result(items,total);
    }
    private static RecordView view(Map<String,Object> row) {
        var user=map(row.get("user")); var unit=map(row.get("unit")); var business=map(row.get("business"));
        var attachments=rows(row.get("attachments")).stream().map(file->new DocumentView(number(file.get("id")),"record_attachment",text(file.get("original_filename")),text(file.get("mime_type")),number(file.get("size_bytes")))).toList();
        var history=rows(row.get("activity")).stream().map(event->new RecordActivity(text(event.get("activity_type")),text(event.get("from_status")),text(event.get("to_status")),text(event.get("note")),text(event.get("actor_name")),text(event.get("created_at")))).toList();
        return new RecordView(number(row.get("id")),text(row.get("record_number")),number(user.get("id")),text(user.get("name")),number(unit.get("id")),text(unit.get("name")),number(business.get("id")),text(business.get("name")),text(row.get("type")),text(row.get("severity")),text(row.get("status")),text(row.get("title")),text(row.get("description")),text(row.get("actions_taken")),text(row.get("event_date")),attachments,history,rows(row.get("witnesses")).stream().map(w->new Witness(number(w.get("user_company_id")),text(w.get("name")))).toList());
    }
    private static void put(Map<String,Object> result,String key,Object value){if(value!=null)result.put(key,value);}
    private static String text(Object value){return value==null?"":value.toString();}
    private static Long number(Object value){return value instanceof Number n?n.longValue():null;}
    private static Map<String,Object> map(Object value){var result=new LinkedHashMap<String,Object>();if(value instanceof Map<?,?> input)input.forEach((key,item)->result.put(String.valueOf(key),item));return result;}
    private static List<Map<String,Object>> rows(Object value){return value instanceof List<?> list?list.stream().map(HrAssistantRecordsService::map).toList():List.of();}
}
