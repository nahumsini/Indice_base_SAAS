package com.indice.erp.ideasboard;

import com.indice.erp.sales.funneling.IdeasBoardContracts.Node;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Personal owner's closed visual catalog. These labels never create ERP records. */
public final class IdeaCatalogPolicy {
    private IdeaCatalogPolicy() { }
    private static final Map<String,Set<String>> ICONS=Map.of(
        "PERSON",Set.of("PERSON","TEAM","LEADER","WORKER"),
        "PROCESS",Set.of("CHECKLIST","GEAR","FLOW","DELIVERY","PRODUCTION","PURCHASING","STOCK_CONTROL","QUALITY","SERVICE_DELIVERY","SALES_PROCESS","PROSPECTING","MARKETING","CUSTOMER_CARE","AFTER_SALES","BILLING","COLLECTIONS_PROCESS","PAYMENTS_PROCESS","HIRING","ONBOARDING","PAYROLL_PROCESS","MAINTENANCE_PROCESS","ADMINISTRATION"),
        "PRODUCT",Set.of("BOX","SERVICE","COFFEE","FOOD","TOOLS","PHONE","GROCERY","BAKERY","FASHION","FOOTWEAR","BEAUTY","HEALTH","PHARMACY","EDUCATION","PROFESSIONAL","SOFTWARE","CONSTRUCTION","REAL_ESTATE","AUTOMOTIVE","TRANSPORT","TOURISM","EVENTS","FITNESS","HOME_GOODS","AGRICULTURE","PETS","CLEANING","MANUFACTURING","CRM","POS","SALES_FUNNEL","STORE","MARKETPLACE","DISTRIBUTORS","PARTNERS","REFERRALS","ONLINE","SOCIAL","CHAT","EMAIL","WHATSAPP","PHONE_SALES","SEO","GOOGLE_ADS","AI_ADS","META_ADS","TIKTOK_ADS","YOUTUBE","ACTIVATIONS","TRADE_SHOW","INFLUENCERS"),
        "FINANCE",Set.of("BALANCE","INCOME","CASH_FLOW","EQUITY_CHANGES","TRIAL_BALANCE","LEDGER_DETAIL","FINANCIAL_CLOSE","FINANCIAL_PULSE","PROFIT_BRIDGE","CASH_BRIDGE","FINANCIAL_TREND","UNIT_RESULTS","BUDGET","COSTS","EXPENSE_REPORT","EXPENSE_AGING","TAX_REPORT","RECEIVABLE_REPORT","RECEIVABLE_AGING","UPCOMING_COLLECTIONS","PETTY_CASH_STATEMENT","FUND_BALANCES","CASH_RECONCILIATION","SALES_REPORT","POS_CLOSING","PAYROLL_REPORT","SALES_COMMISSION"));
    public static boolean knownIcon(String icon) { return ICONS.values().stream().anyMatch(values->values.contains(icon)); }
    public static void validate(Node node) {
        var catalog=node.catalog();
        if(catalog==null)return;
        boolean valid=ICONS.containsKey(catalog.category())&&knownIcon(catalog.icon())
            && Set.of("TEXT","IMAGE").contains(node.kind())&&!node.text().isBlank();
        if(!valid)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"ideas_board_invalid");
    }
}
