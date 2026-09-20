package com.example.ProctorX.Repository;

import com.example.ProctorX.Entity.CodingQuestionEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CodingQuestionRepository extends JpaRepository<CodingQuestionEntity, Long> {
    long countByExamId(Long examId);

    @EntityGraph(attributePaths = {"testCases"})
    List<CodingQuestionEntity> findByExamId(Long examId);
}
