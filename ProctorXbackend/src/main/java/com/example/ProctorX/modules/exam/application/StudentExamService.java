

package com.example.ProctorX.Service.Impl;

import com.example.ProctorX.Entity.ExamEntity;

import com.example.ProctorX.Repository.ExamRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StudentExamService {

    private final ExamRepository examRepository;

    public List<ExamEntity> getTodaysExams() {

        LocalDate today = LocalDate.now();

        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);
        System.out.println(startOfDay);
        System.out.println(endOfDay);

        return examRepository.findTodaysExams(startOfDay, endOfDay);
    }
    public List<ExamEntity> getUpcomingExams() {
        LocalDateTime now = LocalDateTime.now();
        return examRepository.findUpcomingExams(now);
    }
}
