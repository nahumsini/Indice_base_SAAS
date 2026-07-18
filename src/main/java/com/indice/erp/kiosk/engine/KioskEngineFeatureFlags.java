package com.indice.erp.kiosk.engine;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class KioskEngineFeatureFlags {

    private final boolean registryEnabled;
    private final boolean sessionsEnabled;
    private final boolean auditEnabled;
    private final boolean hrAdapterEnabled;
    private final boolean processTasksAdapterEnabled;
    private final boolean pettyCashAdapterEnabled;
    private final boolean payablesAdapterEnabled;
    private final boolean procurementAdapterEnabled;
    private final boolean pointOfSaleAdapterEnabled;
    private final boolean salesAdapterEnabled;
    private final boolean globalCenterEnabled;
    private final boolean multiDashboardEnabled;

    public KioskEngineFeatureFlags(
            @Value("${kiosk.engine.registry.enabled:true}") boolean registryEnabled,
            @Value("${kiosk.engine.sessions.enabled:true}") boolean sessionsEnabled,
            @Value("${kiosk.engine.audit.enabled:true}") boolean auditEnabled,
            @Value("${kiosk.engine.adapter.hr.enabled:true}") boolean hrAdapterEnabled,
            @Value("${kiosk.engine.adapter.process-tasks.enabled:true}") boolean processTasksAdapterEnabled,
            @Value("${kiosk.engine.adapter.petty-cash.enabled:false}") boolean pettyCashAdapterEnabled,
            @Value("${kiosk.engine.adapter.payables.enabled:false}") boolean payablesAdapterEnabled,
            @Value("${kiosk.engine.adapter.procurement.enabled:true}") boolean procurementAdapterEnabled,
            @Value("${kiosk.engine.adapter.point-of-sale.enabled:true}") boolean pointOfSaleAdapterEnabled,
            @Value("${kiosk.engine.adapter.sales.enabled:true}") boolean salesAdapterEnabled,
            @Value("${kiosk.global-center.enabled:false}") boolean globalCenterEnabled,
            @Value("${kiosk.multi-dashboard.enabled:false}") boolean multiDashboardEnabled) {
        this.registryEnabled = registryEnabled;
        this.sessionsEnabled = sessionsEnabled;
        this.auditEnabled = auditEnabled;
        this.hrAdapterEnabled = hrAdapterEnabled;
        this.processTasksAdapterEnabled = processTasksAdapterEnabled;
        this.pettyCashAdapterEnabled = pettyCashAdapterEnabled;
        this.payablesAdapterEnabled = payablesAdapterEnabled;
        this.procurementAdapterEnabled = procurementAdapterEnabled;
        this.pointOfSaleAdapterEnabled = pointOfSaleAdapterEnabled;
        this.salesAdapterEnabled = salesAdapterEnabled;
        this.globalCenterEnabled = globalCenterEnabled;
        this.multiDashboardEnabled = multiDashboardEnabled;
    }

    public boolean registryEnabled() {
        return registryEnabled;
    }

    public boolean sessionsEnabled() {
        return sessionsEnabled;
    }

    public boolean auditEnabled() {
        return auditEnabled;
    }

    public boolean adapterEnabled(String ownerModule) {
        return switch (ownerModule) {
            case "HUMAN_RESOURCES" -> hrAdapterEnabled;
            case "PROCESS_TASKS" -> processTasksAdapterEnabled;
            case "PETTY_CASH" -> pettyCashAdapterEnabled;
            case "EXPENSES" -> payablesAdapterEnabled;
            case "PROCUREMENT" -> procurementAdapterEnabled;
            case "POINT_OF_SALE" -> pointOfSaleAdapterEnabled;
            case "SALES" -> salesAdapterEnabled;
            default -> false;
        };
    }

    public boolean globalCenterEnabled() {
        return globalCenterEnabled;
    }

    public boolean multiDashboardEnabled() {
        return multiDashboardEnabled;
    }
}
