package com.indice.erp.dashboard;

public record ModuleListItem(
    String slug,
    String name,
    String desc,
    String category,
    String plan,
    String icon,
    String image,
    boolean favorite,
    boolean locked,
    String url
) {
}
