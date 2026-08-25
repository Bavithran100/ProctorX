package com.example.ProctorX.Entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "coding_questions")
@Getter
@Setter
public class CodingQuestionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private int marks;

    private String difficulty; // EASY, MEDIUM, HARD

    private String allowedLanguage; // Java, Python, C++

    // 🔗 Link to Exam
    @ManyToOne
    @JoinColumn(name = "exam_id")
    @JsonBackReference("exam-coding-questions")
    private ExamEntity exam;

    // 🔗 Test cases
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("coding-question-testcases")
    private List<TestCaseEntity> testCases = new ArrayList<>();
}