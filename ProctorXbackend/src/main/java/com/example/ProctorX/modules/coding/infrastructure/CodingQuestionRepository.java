package com.example.ProctorX.Repository;

import com.example.ProctorX.Entity.CodingQuestionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CodingQuestionRepository extends JpaRepository<CodingQuestionEntity, Long> {
    long countByExamId(Long examId);
}
