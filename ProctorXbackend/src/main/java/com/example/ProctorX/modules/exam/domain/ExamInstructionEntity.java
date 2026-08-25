package com.example.ProctorX.Entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "exam_instructions")
@Getter
@Setter
public class ExamInstructionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Lob
    private String instructions;

    @Lob
    private String rules;

    @OneToOne
    @JoinColumn(name = "exam_id")
    @JsonBackReference("exam-instruction")
    private ExamEntity exam;
}

