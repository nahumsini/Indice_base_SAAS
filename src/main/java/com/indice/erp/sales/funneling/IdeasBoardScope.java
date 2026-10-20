package com.indice.erp.sales.funneling;

/** Server-selected namespaces for the bounded creative-canvas contract. Never derived from input. */
public enum IdeasBoardScope {
    FUNNEL("crm", "sales_funnel_idea_boards", "sales_funnel_idea_assets", "sales_funnel_idea_board_audit", "funneling/ideas", "SALES", ""),
    PERSONAL("ideas_board", "personal_idea_boards", "personal_idea_assets", "personal_idea_board_audit", "ideas-board", "IDEAS_BOARD", "ideas_board:");

    private final String module, boards, assets, audit, storagePrefix, storageOwner, actorPrefix;
    IdeasBoardScope(String module,String boards,String assets,String audit,String storagePrefix,String storageOwner,String actorPrefix) {
        this.module=module;this.boards=boards;this.assets=assets;this.audit=audit;this.storagePrefix=storagePrefix;this.storageOwner=storageOwner;this.actorPrefix=actorPrefix;
    }
    public String module(){return module;}
    public String boards(){return boards;}
    public String assets(){return assets;}
    public String audit(){return audit;}
    public String storagePrefix(){return storagePrefix;}
    public String storageOwner(){return storageOwner;}
    public String actorPrefix(){return actorPrefix;}
}
