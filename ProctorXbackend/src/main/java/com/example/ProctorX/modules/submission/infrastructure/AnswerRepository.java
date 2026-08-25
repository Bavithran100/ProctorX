package com.example.ProctorX.Repository;

import com.example.ProctorX.Entity.AnswerEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnswerRepository
        extends JpaRepository<AnswerEntity, Long> {
}
