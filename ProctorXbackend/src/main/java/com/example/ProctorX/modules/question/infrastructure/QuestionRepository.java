package com.example.ProctorX.Repository;

import com.example.ProctorX.Entity.QuestionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<QuestionEntity, Long> {
    long countByExamId(Long examId);
    List<QuestionEntity> findByExamId(Long examId);
}
