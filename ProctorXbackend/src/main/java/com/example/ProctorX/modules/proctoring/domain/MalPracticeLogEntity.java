package com.example.ProctorX.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "malpractice_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MalPracticeLogEntity {

    public enum EventType {
        TAB_SWITCH,
        WINDOW_BLUR,
        PAGE_REFRESH,
        COPY,
        PASTE,
        RIGHT_CLICK,
        MULTIPLE_PERSON,
        MOBILE_PHONE,
        CAMERA_UNAVAILABLE,
        FULLSCREEN_EXIT
    }

    public enum Severity {
        LOW,
        MEDIUM,
        HIGH
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "session_id", nullable = false)
    private ExamSessionEntity session;

    @Enumerated(EnumType.STRING)
    private EventType eventType;

    @Enumerated(EnumType.STRING)
    private Severity severity;

    private LocalDateTime timestamp;

    // Used for aggregated browser-AI detections instead of storing every video frame.
    private int occurrenceCount = 1;
}
