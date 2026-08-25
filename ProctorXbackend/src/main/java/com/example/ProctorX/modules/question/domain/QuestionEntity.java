package com.example.ProctorX.Entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "questions")
@Getter @Setter
public class QuestionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Lob
    private String questionText;

    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;

    private String correctOption; // A / B / C / D

    private Integer marks;

    @ManyToOne
    @JoinColumn(name = "exam_id")
    @JsonBackReference("exam-questions")
    private ExamEntity exam;
}

