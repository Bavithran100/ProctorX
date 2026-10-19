package com.example.ProctorX.modules.adaptive.domain;

import com.example.ProctorX.Entity.AuthEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "adaptive_training_exams")
public class AdaptiveTrainingExamEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AuthEntity user;

    private String targetSkill; // e.g. "ARRAY", "GRAPH", "DP", or "DIAGNOSTIC"

    private String learningObjective;

    private String difficulty; // "EASY", "MEDIUM", "HARD"

    private boolean completed = false;

    private Double score = 0.0; // 0.0 - 100.0

    private Integer totalQuestions = 3;

    private Integer passedQuestions = 0;

    private LocalDateTime startedAt = LocalDateTime.now();

    private LocalDateTime completedAt;

    private Double oldMastery = 0.0;

    private Double newMastery = 0.0;

    private Double masteryDelta = 0.0;

    private String recentTrend = "STABLE";

    private Integer totalTestCasesPassed = 0;

    private Integer totalTestCasesTotal = 0;

    private String status = "IN_PROGRESS"; // "IN_PROGRESS", "COMPLETED", "TERMINATED_MALPRACTICE", "EXPIRED_ABANDONED"
    private Integer reconnectCount = 0;
    private Integer malpracticeScore = 0;
    private Integer rankXpPenalty = 0;
    private LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(30);

    @Column(columnDefinition = "TEXT", nullable = true)
    private String vectorUpdatesJson; // JSON array of updated vectors and deltas

    @OneToMany(mappedBy = "trainingExam", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<AdaptiveTrainingQuestionEntity> questions = new ArrayList<>();

    public AdaptiveTrainingExamEntity() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public AuthEntity getUser() { return user; }
    public void setUser(AuthEntity user) { this.user = user; }

    public String getTargetSkill() { return targetSkill; }
    public void setTargetSkill(String targetSkill) { this.targetSkill = targetSkill; }

    public String getLearningObjective() { return learningObjective; }
    public void setLearningObjective(String learningObjective) { this.learningObjective = learningObjective; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }

    public String getStatus() { return status != null ? status : (completed ? "COMPLETED" : "IN_PROGRESS"); }
    public void setStatus(String status) { this.status = status; }

    public Integer getReconnectCount() { return reconnectCount != null ? reconnectCount : 0; }
    public void setReconnectCount(Integer reconnectCount) { this.reconnectCount = reconnectCount; }

    public Integer getMalpracticeScore() { return malpracticeScore != null ? malpracticeScore : 0; }
    public void setMalpracticeScore(Integer malpracticeScore) { this.malpracticeScore = malpracticeScore; }

    public Integer getRankXpPenalty() { return rankXpPenalty != null ? rankXpPenalty : 0; }
    public void setRankXpPenalty(Integer rankXpPenalty) { this.rankXpPenalty = rankXpPenalty; }

    public String getVectorUpdatesJson() { return vectorUpdatesJson; }
    public void setVectorUpdatesJson(String vectorUpdatesJson) { this.vectorUpdatesJson = vectorUpdatesJson; }

    public LocalDateTime getExpiresAt() { return expiresAt != null ? expiresAt : startedAt.plusMinutes(30); }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public Integer getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(Integer totalQuestions) { this.totalQuestions = totalQuestions; }

    public Integer getPassedQuestions() { return passedQuestions; }
    public void setPassedQuestions(Integer passedQuestions) { this.passedQuestions = passedQuestions; }

    public Double getOldMastery() { return oldMastery != null ? oldMastery : 0.0; }
    public void setOldMastery(Double oldMastery) { this.oldMastery = oldMastery; }

    public Double getNewMastery() { return newMastery != null ? newMastery : 0.0; }
    public void setNewMastery(Double newMastery) { this.newMastery = newMastery; }

    public Double getMasteryDelta() { return masteryDelta != null ? masteryDelta : 0.0; }
    public void setMasteryDelta(Double masteryDelta) { this.masteryDelta = masteryDelta; }

    public String getRecentTrend() { return recentTrend != null ? recentTrend : "STABLE"; }
    public void setRecentTrend(String recentTrend) { this.recentTrend = recentTrend; }

    public Integer getTotalTestCasesPassed() { return totalTestCasesPassed != null ? totalTestCasesPassed : 0; }
    public void setTotalTestCasesPassed(Integer totalTestCasesPassed) { this.totalTestCasesPassed = totalTestCasesPassed; }

    public Integer getTotalTestCasesTotal() { return totalTestCasesTotal != null ? totalTestCasesTotal : 0; }
    public void setTotalTestCasesTotal(Integer totalTestCasesTotal) { this.totalTestCasesTotal = totalTestCasesTotal; }

    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
        if (this.expiresAt == null) {
            this.expiresAt = startedAt.plusMinutes(30);
        }
    }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public List<AdaptiveTrainingQuestionEntity> getQuestions() { return questions; }
    public void setQuestions(List<AdaptiveTrainingQuestionEntity> questions) { this.questions = questions; }

    public void addQuestion(AdaptiveTrainingQuestionEntity q) {
        questions.add(q);
        q.setTrainingExam(this);
    }
}
