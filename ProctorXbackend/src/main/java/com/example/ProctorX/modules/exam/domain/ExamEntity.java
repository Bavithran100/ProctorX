package com.example.ProctorX.Entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "exams")
@Getter
@Setter
public class ExamEntity {

    public enum ExamStatus {
        DRAFT,
        PUBLISHED,
        DISABLED
    }

    public enum ExamType {
        MCQ,
        CODING
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private String description;

    private int duration;

    private int totalMarks;

    // Planned MCQ count used to distribute totalMarks automatically.
    private int questionCount;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    private ExamStatus status;

    // NEW FIELD
    @Enumerated(EnumType.STRING)
    private ExamType examType;

    @OneToOne(mappedBy = "exam", cascade = CascadeType.ALL)
    @JsonManagedReference("exam-instruction")
    private ExamInstructionEntity instruction;

    // MCQ Questions
    @OneToMany(mappedBy = "exam", cascade = CascadeType.ALL)
    @JsonManagedReference("exam-questions")
    private List<QuestionEntity> questions = new ArrayList<>();

    // Coding Questions
    @OneToMany(mappedBy = "exam", cascade = CascadeType.ALL)
    @JsonManagedReference("exam-coding-questions")
    private List<CodingQuestionEntity> codingQuestions = new ArrayList<>();
}
