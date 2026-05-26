package com.indice.erp.sales;

import java.util.List;
import java.util.Map;

record SalesEntityDefinition(
        String collectionName,
        String entityType,
        String tableName,
        String idApiName,
        String codeApiName,
        String codeColumnName,
        String codePrefix,
        List<SalesField> fields,
        List<String> requiredOnCreate,
        List<String> searchFields,
        String defaultOrder) {

    Map<String, SalesField> fieldMap() {
        return fields.stream().collect(java.util.stream.Collectors.toMap(
                SalesField::apiName,
                field -> field,
                (first, second) -> first,
                java.util.LinkedHashMap::new));
    }
}
