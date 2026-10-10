package com.indice.erp.hr.assets;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import java.util.*;
import org.springframework.stereotype.Service;

/** HR-owned minimal technical projection; custody and personal information remain private to HR. */
@Service
public class HrAssetMaintenanceContract {
    public record Asset(long id,String code,String name,Long unitId,String status) {}
    public record Page(List<Asset> items,long total,int page,int pageSize) {}
    private final HrAssetService assets;
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    public HrAssetMaintenanceContract(HrAssetService assets,ModuleAccessService modules,TabPermissionAccessService tabs){this.assets=assets;this.modules=modules;this.tabs=tabs;}
    private void require(AuthSessionUser actor){if(!modules.canAccess(actor,"human_resources")||!tabs.canAccess(actor,new TabPermissionRequirement(List.of("human_resources.assets"))))throw new SecurityException();}
    @SuppressWarnings("unchecked") public Asset read(AuthSessionUser actor,long id){require(actor);var row=(Map<String,Object>)assets.assetDetails(actor,id).get("asset");return project(row);}
    @SuppressWarnings("unchecked") public Page search(AuthSessionUser actor,String search,int page,int size){require(actor);var data=assets.listAssets(actor,Map.of("search",search,"page",page,"size",size));return new Page(((List<Map<String,Object>>)data.get("rows")).stream().map(HrAssetMaintenanceContract::project).toList(),((Number)data.get("total_count")).longValue(),page,size);}
    private static Asset project(Map<String,Object> row){return new Asset(((Number)row.get("id")).longValue(),String.valueOf(row.get("asset_code")),String.valueOf(row.get("name")),row.get("unit_id")==null?null:((Number)row.get("unit_id")).longValue(),String.valueOf(row.get("status")));}
}
