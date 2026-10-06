package com.indice.erp.hr.assistant;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/** The existing HR map boundary expects textual dates, rather than Java temporal objects. */
final class HrAssistantPayload {
    private HrAssistantPayload() { }
    static void put(Map<String,Object> result,String key,Object value) {
        if(value==null)return;
        if(value instanceof LocalDate date)value=date.toString();
        if(value instanceof LocalDateTime date)value=date.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        result.put(key,value);
    }
}
