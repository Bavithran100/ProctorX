package com.example.ProctorX.Repository;

import com.example.ProctorX.Entity.ExamSessionEntity;
import com.example.ProctorX.Entity.MalPracticeLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MalPracticeLogRepository
        extends JpaRepository<MalPracticeLogEntity, Long> {

    List<MalPracticeLogEntity> findBySession(ExamSessionEntity session);

    long countBySession(ExamSessionEntity session);

    // Group by event type for single session
    @Query("""
        SELECT l.eventType, COUNT(l)
        FROM MalPracticeLogEntity l
        WHERE l.session = :session
        GROUP BY l.eventType
    """)
    List<Object[]> countByEventType(@Param("session") ExamSessionEntity session);

    @Query("""
        SELECT COALESCE(SUM(l.occurrenceCount), 0)
        FROM MalPracticeLogEntity l
        WHERE l.session = :session
          AND l.eventType IN ('MULTIPLE_PERSON', 'MOBILE_PHONE', 'CAMERA_UNAVAILABLE', 'FULLSCREEN_EXIT')
    """)
    Long sumVideoRiskBySession(@Param("session") ExamSessionEntity session);

    // Batch aggregate for all sessions in a single fast query
    @Query("""
        SELECT l.session.id, l.eventType, COUNT(l), COALESCE(SUM(l.occurrenceCount), 0)
        FROM MalPracticeLogEntity l
        WHERE l.session.id IN :sessionIds
        GROUP BY l.session.id, l.eventType
    """)
    List<Object[]> findAggregatedEventsForSessions(@Param("sessionIds") List<Long> sessionIds);

    List<MalPracticeLogEntity> findBySessionOrderByTimestampAsc(ExamSessionEntity session);

    List<MalPracticeLogEntity> findAllByOrderByTimestampDesc();

    @Query("SELECT l FROM MalPracticeLogEntity l LEFT JOIN FETCH l.session s LEFT JOIN FETCH s.student LEFT JOIN FETCH s.exam ORDER BY l.timestamp DESC")
    List<MalPracticeLogEntity> findAllWithSessionStudentAndExam();
}
