package com.example.ProctorX.modules.adaptive.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "adaptive_training_questions")
public class AdaptiveTrainingQuestionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "training_exam_id", nullable = false)
    @JsonIgnore
    private AdaptiveTrainingExamEntity trainingExam;

    private String title;

    @Column(columnDefinition = "LONGTEXT")
    private String description;

    private String topic; // e.g. "ARRAY", "GRAPH"

    private String pattern; // e.g. "PREFIX_SUM", "BFS"

    private String difficulty; // "EASY", "MEDIUM", "HARD"

    private String allowedLanguage = "java,cpp,c,python";

    private Integer marks = 100;

    @Column(columnDefinition = "LONGTEXT")
    private String testCasesJson; // JSON array of 3 test cases: [{ "input": "...", "expectedOutput": "...", "sample": true }]

    @Column(columnDefinition = "TEXT")
    private String solutionOutline;

    private boolean passed = false;

    @Column(columnDefinition = "LONGTEXT")
    private String userCode;

    public AdaptiveTrainingQuestionEntity() {}

    public Long getId() { return id; }
    public AdaptiveTrainingExamEntity getTrainingExam() { return trainingExam; }
    public void setTrainingExam(AdaptiveTrainingExamEntity trainingExam) { this.trainingExam = trainingExam; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public String getPattern() { return pattern; }
    public void setPattern(String pattern) { this.pattern = pattern; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public String getAllowedLanguage() { return allowedLanguage; }
    public void setAllowedLanguage(String allowedLanguage) { this.allowedLanguage = allowedLanguage; }

    public Integer getMarks() { return marks; }
    public void setMarks(Integer marks) { this.marks = marks; }

    public String getTestCasesJson() { return testCasesJson; }
    public void setTestCasesJson(String testCasesJson) { this.testCasesJson = testCasesJson; }

    public String getSolutionOutline() { return solutionOutline; }
    public void setSolutionOutline(String solutionOutline) { this.solutionOutline = solutionOutline; }

    public boolean isPassed() { return passed; }
    public void setPassed(boolean passed) { this.passed = passed; }

    public String getUserCode() { return userCode; }
    public void setUserCode(String userCode) { this.userCode = userCode; }
}
