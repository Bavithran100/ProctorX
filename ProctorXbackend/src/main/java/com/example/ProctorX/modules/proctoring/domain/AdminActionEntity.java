package com.example.ProctorX.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin_actions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AdminActionEntity {

    public enum ActionType {
        WARN,
        WAITING,
        NORMAL,
        LOCK,
        TERMINATE,
        REVOKE_SUBMISSION,
        RESET_ATTEMPT
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "admin_id", nullable = false)
    private AuthEntity admin;

    @ManyToOne
    @JoinColumn(name = "session_id", nullable = false)
    private ExamSessionEntity session;

    @Enumerated(EnumType.STRING)
    private ActionType action;

    private String remark;

    private LocalDateTime timestamp;
}
