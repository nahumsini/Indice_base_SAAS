package com.indice.erp.learning;
import com.indice.erp.ai.learning.AiLearningContracts.Step;
import java.time.Instant;
import java.util.List;

public final class LearningProgressContracts {
    private LearningProgressContracts() { }
    @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
    public record Change(String chapterId,int version,String operation,String locale) {
        public Change(String chapterId,int version,String operation) { this(chapterId,version,operation,null); }
        public String learningLocale() { return locale==null?"es-MX":locale; }
        @com.fasterxml.jackson.annotation.JsonAnySetter
        public void reject(String field,com.fasterxml.jackson.databind.JsonNode value) { throw new IllegalArgumentException("Unknown learning field: "+field); }
    }
    public record ChapterProgress(String chapterId,int version,int stage,String module,String tab,String pageId,String label,
        String status,Instant understoodAt,Instant appliedAt,boolean journey,boolean companion,List<Step> steps) { }
    public record StageProgress(int stage,int total,int understood,int applied) { }
    public record Snapshot(String catalogVersion,String currentChapterId,List<StageProgress> stages,List<ChapterProgress> chapters,
        ChapterProgress nextMission) { }
}
