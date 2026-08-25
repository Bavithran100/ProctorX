package com.example.ProctorX.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;


@Entity
@Table(
        name = "exam_submissions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"exam_id", "user_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ExamSubmissionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private AuthEntity student;

    @ManyToOne
    @JoinColumn(name = "exam_id", nullable = false)
    private ExamEntity exam;



    private Integer score;

    private LocalDateTime submittedAt;

    @OneToMany(mappedBy = "submission", cascade = CascadeType.ALL)
    private List<AnswerEntity> answers = new ArrayList<>();
}
