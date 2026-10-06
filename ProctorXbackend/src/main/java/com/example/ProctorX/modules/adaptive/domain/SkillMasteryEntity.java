package com.example.ProctorX.modules.adaptive.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "skill_masteries", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"learner_model_id", "dimension_key"})
})
public class SkillMasteryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learner_model_id", nullable = false)
    @JsonIgnore
    private LearnerModelEntity learnerModel;

    @Column(nullable = false)
    private String dimensionType; // "DSA_TOPIC" or "BEHAVIORAL"

    @Column(nullable = false)
    private String dimensionKey; // e.g. "ARRAY", "GRAPH", "IMPLEMENTATION", etc.

    private Double mastery = 0.0; // 0.0 - 1.0

    private Double confidence = 0.0; // 0.0 - 1.0

    private Integer evidenceCount = 0;

    private String recentTrend = "STABLE"; // "IMPROVING", "STABLE", "DECLINING"

    private Double growthDelta = 0.0; // e.g. +0.08 for +8% growth

    private Double bktPrior = 0.20; // P(L_t) Bayesian state

    private Double irtTheta = 0.0; // Latent ability on logistic scale [-3.0, +3.0]

    private Integer questionsAttempted = 0;

    private Integer questionsSolved = 0;

    private Integer rankXp = 0; // 0 - 1000 XP

    private String rankTier = "BRONZE"; // "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "OBSIDIAN"

    private Double errorRiskProbability = 0.15; // 0.0 - 1.0 (for ERROR_PROFILE dimensions)

    @Column(columnDefinition = "TEXT", nullable = true)
    private String historyJson; // JSON array of past mastery progress points

    private LocalDateTime lastAssessedAt = LocalDateTime.now();

    public SkillMasteryEntity() {}

    public SkillMasteryEntity(LearnerModelEntity learnerModel, String dimensionType, String dimensionKey, Double mastery) {
        this.learnerModel = learnerModel;
        this.dimensionType = dimensionType;
        this.dimensionKey = dimensionKey;
        this.mastery = mastery;
        this.bktPrior = mastery;
        this.irtTheta = Math.log(Math.max(0.01, mastery) / Math.max(0.01, 1.0 - mastery));
        this.confidence = 0.20;
        this.evidenceCount = 1;
        this.recentTrend = "STABLE";
        this.growthDelta = 0.0;
        this.questionsAttempted = 0;
        this.questionsSolved = 0;
        this.rankXp = (int) Math.round(mastery * 200.0);
        this.rankTier = "BRONZE";
        this.errorRiskProbability = 0.15;
        this.lastAssessedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public LearnerModelEntity getLearnerModel() { return learnerModel; }
    public void setLearnerModel(LearnerModelEntity learnerModel) { this.learnerModel = learnerModel; }

    public String getDimensionType() { return dimensionType != null ? dimensionType : "CONCEPT"; }
    public void setDimensionType(String dimensionType) { this.dimensionType = dimensionType; }

    public String getDimensionKey() { return dimensionKey != null ? dimensionKey : ""; }
    public void setDimensionKey(String dimensionKey) { this.dimensionKey = dimensionKey; }

    public Double getMastery() { return mastery != null ? mastery : 0.20; }
    public void setMastery(Double mastery) { this.mastery = mastery; }

    public Double getConfidence() { return confidence != null ? confidence : 0.20; }
    public void setConfidence(Double confidence) { this.confidence = confidence; }

    public Integer getEvidenceCount() { return evidenceCount != null ? evidenceCount : 0; }
    public void setEvidenceCount(Integer evidenceCount) { this.evidenceCount = evidenceCount; }

    public String getRecentTrend() { return recentTrend != null ? recentTrend : "STABLE"; }
    public void setRecentTrend(String recentTrend) { this.recentTrend = recentTrend; }

    public Double getGrowthDelta() { return growthDelta != null ? growthDelta : 0.0; }
    public void setGrowthDelta(Double growthDelta) { this.growthDelta = growthDelta; }

    public Double getBktPrior() { return bktPrior != null ? bktPrior : (mastery != null ? mastery : 0.20); }
    public void setBktPrior(Double bktPrior) { this.bktPrior = bktPrior; }

    public Double getIrtTheta() { return irtTheta != null ? irtTheta : -1.5; }
    public void setIrtTheta(Double irtTheta) { this.irtTheta = irtTheta; }

    public Integer getQuestionsAttempted() { return questionsAttempted != null ? questionsAttempted : 0; }
    public void setQuestionsAttempted(Integer questionsAttempted) { this.questionsAttempted = questionsAttempted; }

    public Integer getQuestionsSolved() { return questionsSolved != null ? questionsSolved : 0; }
    public void setQuestionsSolved(Integer questionsSolved) { this.questionsSolved = questionsSolved; }

    public Integer getRankXp() { return rankXp != null ? rankXp : 0; }
    public void setRankXp(Integer rankXp) { this.rankXp = rankXp; }

    public String getRankTier() { return rankTier != null ? rankTier : "BRONZE"; }
    public void setRankTier(String rankTier) { this.rankTier = rankTier; }

    public Double getErrorRiskProbability() { return errorRiskProbability != null ? errorRiskProbability : 0.15; }
    public void setErrorRiskProbability(Double errorRiskProbability) { this.errorRiskProbability = errorRiskProbability; }

    public String getHistoryJson() { return historyJson; }
    public void setHistoryJson(String historyJson) { this.historyJson = historyJson; }

    public LocalDateTime getLastAssessedAt() { return lastAssessedAt != null ? lastAssessedAt : LocalDateTime.now(); }
    public void setLastAssessedAt(LocalDateTime lastAssessedAt) { this.lastAssessedAt = lastAssessedAt; }
}
