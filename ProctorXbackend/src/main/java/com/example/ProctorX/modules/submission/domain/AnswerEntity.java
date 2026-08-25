package com.example.ProctorX.Entity;
import jakarta.persistence.*;
import lombok.*;
@Entity
@Table(name = "answers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AnswerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "submission_id")
    private ExamSubmissionEntity submission;

    @ManyToOne
    @JoinColumn(name = "question_id")
    private QuestionEntity question;

    private String selectedOption;
}
