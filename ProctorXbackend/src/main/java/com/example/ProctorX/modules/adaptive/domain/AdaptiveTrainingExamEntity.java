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

    @OneToMany(mappedBy = "trainingExam", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<AdaptiveTrainingQuestionEntity> questions = new ArrayList<>();

    public AdaptiveTrainingExamEntity() {}

    public Long getId() { return id; }
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

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public Integer getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(Integer totalQuestions) { this.totalQuestions = totalQuestions; }

    public Integer getPassedQuestions() { return passedQuestions; }
    public void setPassedQuestions(Integer passedQuestions) { this.passedQuestions = passedQuestions; }

    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public List<AdaptiveTrainingQuestionEntity> getQuestions() { return questions; }
    public void setQuestions(List<AdaptiveTrainingQuestionEntity> questions) { this.questions = questions; }

    public void addQuestion(AdaptiveTrainingQuestionEntity q) {
        questions.add(q);
        q.setTrainingExam(this);
    }
}
