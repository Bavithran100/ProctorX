package com.example.ProctorX.Controller;

import com.example.ProctorX.Entity.CodingQuestionEntity;
import com.example.ProctorX.Entity.ExamEntity;
import com.example.ProctorX.Entity.QuestionEntity;

import com.example.ProctorX.Service.Impl.ExamService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("api/admin/exams")
public class ExamController {
@Autowired
    private  ExamService examService;

    // CREATE EXAM
    @PostMapping
    public ExamEntity createExam(@RequestBody ExamEntity exam) {
        return examService.createExam(exam);
    }

    // ADD QUESTION
    @PostMapping("/{examId}/questions")
    public QuestionEntity addQuestion(
            @PathVariable Long examId,
            @RequestBody QuestionEntity question) {

        return examService.addQuestion(examId, question);
    }
    @PostMapping("/{examId}/questions/Publish")
    public String publish(@PathVariable Long examId){
       return examService.publish(examId);




    }
    @PostMapping("/{examId}/coding-questions")
    public CodingQuestionEntity addCodingQuestion(
            @PathVariable Long examId,
            @RequestBody CodingQuestionEntity question) {

        return examService.addCodingQuestion(examId, question);
    }



}