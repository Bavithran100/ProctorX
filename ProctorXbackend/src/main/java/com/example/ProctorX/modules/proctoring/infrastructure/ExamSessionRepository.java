package com.example.ProctorX.Repository;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.ExamEntity;
import com.example.ProctorX.Entity.ExamSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamSessionRepository
        extends JpaRepository<ExamSessionEntity, Long> {

    boolean existsByExamAndStudent(ExamEntity exam, AuthEntity student);

    Optional<ExamSessionEntity> findByExamAndStudent(
            ExamEntity exam,
            AuthEntity student
    );

    Optional<ExamSessionEntity> findByExam_IdAndStudent_Id(Long examId, Long studentId);

    List<ExamSessionEntity> findByStatus(ExamSessionEntity.Status status);

    List<ExamSessionEntity> findByExam_Id(Long examId);

    @Query("SELECT s FROM ExamSessionEntity s LEFT JOIN FETCH s.student LEFT JOIN FETCH s.exam ORDER BY s.startTime DESC")
    List<ExamSessionEntity> findAllWithStudentAndExam();

    @Query("SELECT s FROM ExamSessionEntity s LEFT JOIN FETCH s.student LEFT JOIN FETCH s.exam WHERE s.exam.id = :examId")
    List<ExamSessionEntity> findByExamIdWithStudent(@Param("examId") Long examId);
}
