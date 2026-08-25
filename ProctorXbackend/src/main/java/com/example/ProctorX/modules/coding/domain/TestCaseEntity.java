package com.example.ProctorX.Entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "test_cases")
@Getter
@Setter
public class TestCaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String input;

    @Column(columnDefinition = "TEXT")
    private String expectedOutput;

    private boolean sample; // true = visible example test case

    // 🔗 Link to coding question
    @ManyToOne
    @JoinColumn(name = "coding_question_id")
    @JsonBackReference("coding-question-testcases")
    private CodingQuestionEntity question;
}