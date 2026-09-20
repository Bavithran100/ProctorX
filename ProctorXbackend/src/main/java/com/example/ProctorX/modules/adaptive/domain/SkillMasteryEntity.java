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

    private LocalDateTime lastAssessedAt = LocalDateTime.now();

    public SkillMasteryEntity() {}

    public SkillMasteryEntity(LearnerModelEntity learnerModel, String dimensionType, String dimensionKey, Double mastery) {
        this.learnerModel = learnerModel;
        this.dimensionType = dimensionType;
        this.dimensionKey = dimensionKey;
        this.mastery = mastery;
        this.confidence = 0.20;
        this.evidenceCount = 1;
        this.recentTrend = "STABLE";
        this.lastAssessedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public LearnerModelEntity getLearnerModel() { return learnerModel; }
    public void setLearnerModel(LearnerModelEntity learnerModel) { this.learnerModel = learnerModel; }

    public String getDimensionType() { return dimensionType; }
    public void setDimensionType(String dimensionType) { this.dimensionType = dimensionType; }

    public String getDimensionKey() { return dimensionKey; }
    public void setDimensionKey(String dimensionKey) { this.dimensionKey = dimensionKey; }

    public Double getMastery() { return mastery; }
    public void setMastery(Double mastery) { this.mastery = mastery; }

    public Double getConfidence() { return confidence; }
    public void setConfidence(Double confidence) { this.confidence = confidence; }

    public Integer getEvidenceCount() { return evidenceCount; }
    public void setEvidenceCount(Integer evidenceCount) { this.evidenceCount = evidenceCount; }

    public String getRecentTrend() { return recentTrend; }
    public void setRecentTrend(String recentTrend) { this.recentTrend = recentTrend; }

    public LocalDateTime getLastAssessedAt() { return lastAssessedAt; }
    public void setLastAssessedAt(LocalDateTime lastAssessedAt) { this.lastAssessedAt = lastAssessedAt; }
}
