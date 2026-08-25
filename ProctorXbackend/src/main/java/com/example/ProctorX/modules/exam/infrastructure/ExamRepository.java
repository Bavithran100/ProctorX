package com.example.ProctorX.Repository;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.ExamEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ExamRepository  extends JpaRepository<ExamEntity,Long> {
    @Query("""
SELECT e FROM ExamEntity e
WHERE e.status = 'PUBLISHED'
AND e.startTime <= :endOfDay
AND e.endTime >= :startOfDay
""")
    List<ExamEntity> findTodaysExams(
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay
    );

    @Query("""
        SELECT e FROM ExamEntity e
        WHERE e.startTime > :now
        AND e.status = com.example.ProctorX.Entity.ExamEntity$ExamStatus.PUBLISHED
        ORDER BY e.startTime ASC
    """)
    List<ExamEntity> findUpcomingExams(LocalDateTime now);
}
