package com.example.ProctorX.Repository;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.ExamEntity;
import com.example.ProctorX.Entity.ExamSubmissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExamSubmissionRepository
        extends JpaRepository<ExamSubmissionEntity, Long> {

    boolean existsByExam_IdAndStudent_Id(Long examId, Long studentId);
    List<ExamSubmissionEntity> findByExamId(Long Id);
    List<ExamSubmissionEntity> findByStudentEmailOrderBySubmittedAtDesc(String email);
}


