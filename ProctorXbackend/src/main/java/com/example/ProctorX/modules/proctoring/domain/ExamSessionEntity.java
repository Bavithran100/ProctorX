package com.example.ProctorX.Entity;

import jakarta.persistence.*;

import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "exam_sessions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"exam_id", "user_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ExamSessionEntity {

    public enum Status {
        ACTIVE,
        WAITING,
        LOCKED,
        TERMINATED,
        SUBMITTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Student
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private AuthEntity student;

    // Exam
    @ManyToOne
    @JoinColumn(name = "exam_id", nullable = false)
    private ExamEntity exam;

    private LocalDateTime startTime;

    private LocalDateTime lastHeartbeat;

    // Number of confirmed disconnects after the first successful exam entry.
    private int disconnectCount;

    // Set when a reconnect happens after the 10-minute inactivity limit.
    private boolean inactiveOverLimit;

    // Latest server-calculated MCQ answers, kept so a timeout/admin termination can submit the attempt.
    @Lob
    private String savedAnswersJson;

    private int currentScore;

    @Column(columnDefinition = "TEXT")
    private String statusMessage;

    @Enumerated(EnumType.STRING)
    private Status status;

    private String warning="";
}
