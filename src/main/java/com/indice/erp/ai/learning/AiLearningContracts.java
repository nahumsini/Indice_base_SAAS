package com.indice.erp.ai.learning;

import java.util.List;

public final class AiLearningContracts {
    private AiLearningContracts() { }
    public record Request(String module, String tab, String locale) { }
    public record Catalog(String version, List<ModuleContent> modules) { }
    public record ModuleContent(String module, String pageId, String locale, String purpose, List<TabContent> tabs) { }
    public record TabContent(String tab, String label, String title, String purpose, String effect, List<Step> steps) { }
    public record Step(String title, String description) { }
    public record Guide(String version, String locale, String systemLogic, List<ModuleGuide> modules) { }
    public record ModuleGuide(String module, String pageId, String purpose, List<TabGuide> tabs) { }
    public record TabGuide(String tab, String label, String title, String purpose, String effect,
        List<Step> steps, String navigation, List<String> availableTools) { }
}
