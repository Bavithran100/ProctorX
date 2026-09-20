package com.example.ProctorX.modules.adaptive.domain;

import com.example.ProctorX.Entity.AuthEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "learner_models")
public class LearnerModelEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private AuthEntity user;

    @Column(nullable = false)
    private boolean diagnosticCompleted = false;

    private Double overallReadiness = 0.0;

    private Integer totalQuestionsSolved = 0;

    private Integer totalSessionsCompleted = 0;

    private Integer streakDays = 0;

    private LocalDateTime lastPracticedAt;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "learnerModel", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<SkillMasteryEntity> skillMasteries = new ArrayList<>();

    public LearnerModelEntity() {}

    public LearnerModelEntity(AuthEntity user) {
        this.user = user;
        this.diagnosticCompleted = false;
        this.overallReadiness = 0.0;
        this.totalQuestionsSolved = 0;
        this.totalSessionsCompleted = 0;
        this.streakDays = 0;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public AuthEntity getUser() { return user; }
    public void setUser(AuthEntity user) { this.user = user; }

    public boolean isDiagnosticCompleted() { return diagnosticCompleted; }
    public void setDiagnosticCompleted(boolean diagnosticCompleted) { this.diagnosticCompleted = diagnosticCompleted; }

    public Double getOverallReadiness() { return overallReadiness; }
    public void setOverallReadiness(Double overallReadiness) { this.overallReadiness = overallReadiness; }

    public Integer getTotalQuestionsSolved() { return totalQuestionsSolved; }
    public void setTotalQuestionsSolved(Integer totalQuestionsSolved) { this.totalQuestionsSolved = totalQuestionsSolved; }

    public Integer getTotalSessionsCompleted() { return totalSessionsCompleted; }
    public void setTotalSessionsCompleted(Integer totalSessionsCompleted) { this.totalSessionsCompleted = totalSessionsCompleted; }

    public Integer getStreakDays() { return streakDays; }
    public void setStreakDays(Integer streakDays) { this.streakDays = streakDays; }

    public LocalDateTime getLastPracticedAt() { return lastPracticedAt; }
    public void setLastPracticedAt(LocalDateTime lastPracticedAt) { this.lastPracticedAt = lastPracticedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<SkillMasteryEntity> getSkillMasteries() { return skillMasteries; }
    public void setSkillMasteries(List<SkillMasteryEntity> skillMasteries) { this.skillMasteries = skillMasteries; }

    public void addSkillMastery(SkillMasteryEntity sm) {
        skillMasteries.add(sm);
        sm.setLearnerModel(this);
    }
}
