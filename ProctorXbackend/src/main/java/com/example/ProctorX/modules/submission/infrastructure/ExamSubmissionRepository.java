package com.example.ProctorX.Repository;

import com.example.ProctorX.Entity.ExamSubmissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ExamSubmissionRepository
        extends JpaRepository<ExamSubmissionEntity, Long> {

    boolean existsByExam_IdAndStudent_Id(Long examId, Long studentId);

    java.util.Optional<ExamSubmissionEntity> findByExam_IdAndStudent_Id(Long examId, Long studentId);

    void deleteByExam_IdAndStudent_Id(Long examId, Long studentId);

    List<ExamSubmissionEntity> findByExam_Id(Long examId);

    List<ExamSubmissionEntity> findByExamId(Long examId);

    @Query("SELECT s FROM ExamSubmissionEntity s LEFT JOIN FETCH s.student LEFT JOIN FETCH s.exam")
    List<ExamSubmissionEntity> findAllWithStudentAndExam();

    @Query("SELECT s FROM ExamSubmissionEntity s LEFT JOIN FETCH s.student LEFT JOIN FETCH s.exam WHERE s.exam.id = :examId")
    List<ExamSubmissionEntity> findAllByExamIdWithStudent(@Param("examId") Long examId);

    List<ExamSubmissionEntity> findByStudentEmailOrderBySubmittedAtDesc(String email);
}
