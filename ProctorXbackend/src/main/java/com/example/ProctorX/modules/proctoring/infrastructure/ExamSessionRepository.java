package com.example.ProctorX.Repository;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.ExamEntity;
import com.example.ProctorX.Entity.ExamSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
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

    List<ExamSessionEntity> findByStatus(ExamSessionEntity.Status status);
}
