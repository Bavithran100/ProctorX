package com.example.ProctorX.Service.Impl;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.ExamEntity;
import com.example.ProctorX.Entity.ExamSessionEntity;
import com.example.ProctorX.Entity.ExamSubmissionEntity;
import com.example.ProctorX.Repository.ExamRepository;
import com.example.ProctorX.Repository.ExamSessionRepository;
import com.example.ProctorX.Repository.ExamSubmissionRepository;
import com.example.ProctorX.Repository.MalPracticeLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminMonitoringService {

    private final ExamSessionRepository sessionRepository;
    private final MalPracticeLogRepository logRepository;
    private final ExamSubmissionService submissionService;
    private final ExamRepository examRepository;
    private final ExamSubmissionRepository submissionRepository;

    public List<Map<String, Object>> getLiveSessions(AuthEntity currentUser) {

        List<ExamSessionEntity> sessions = sessionRepository.findAll();

        LocalDateTime now = LocalDateTime.now();
        List<Map<String, Object>> response = new ArrayList<>();

        for (ExamSessionEntity session : sessions) {
            // If current user is a coordinator, only show sessions for exams created by this coordinator
            if (currentUser != null && currentUser.getRole() == AuthEntity.Role.COORDINATOR) {
                ExamEntity exam = session.getExam();
                boolean matchCreatedBy = exam.getCreatedBy() != null && exam.getCreatedBy().equalsIgnoreCase(currentUser.getEmail());
                boolean matchCoordName = exam.getCoordinatorName() != null && exam.getCoordinatorName().equalsIgnoreCase(currentUser.getName());
                if (!matchCreatedBy && !matchCoordName) {
                    continue;
                }
            }

            if (session.getStatus() == ExamSessionEntity.Status.ACTIVE
                    && (isSessionTimeOver(session, now)
                    || (session.getLastHeartbeat() != null
                    && session.getLastHeartbeat().isBefore(now.minusMinutes(10))))) {
                submissionService.forceSubmit(session, isSessionTimeOver(session, now)
                        ? "Your exam time ended and the current progress was submitted."
                        : "Your exam was inactive for more than 10 minutes and the current progress was submitted.");
            }

            long malpracticeCount =
                    logRepository.countBySession(session);
            long videoRiskCount = logRepository.sumVideoRiskBySession(session);

            boolean inactive =
                    session.getLastHeartbeat() == null ||
                            session.getLastHeartbeat()
                                    .isBefore(now.minusSeconds(30));

            int riskScore = calculateRiskScore(malpracticeCount, inactive);

            // Event-wise breakdown
            Map<String, Long> eventBreakdown = new HashMap<>();

            List<Object[]> groupedEvents =
                    logRepository.countByEventType(session);

            for (Object[] row : groupedEvents) {
                String eventType = row[0].toString();
                Long count = (Long) row[1];
                eventBreakdown.put(eventType, count);
            }

            Map<String, Object> data = new HashMap<>();
            data.put("sessionId", session.getId());
            data.put("studentId", session.getStudent().getId());
            data.put("studentName", session.getStudent().getName());
            data.put("studentEmail", session.getStudent().getEmail());
            data.put("username", session.getStudent().getUsername());
            data.put("institution", session.getStudent().getInstitution());
            data.put("department", session.getStudent().getDepartment());
            data.put("examId", session.getExam().getId());
            data.put("examTitle", session.getExam().getTitle());
            data.put("coordinatorName", session.getExam().getCoordinatorName());
            data.put("startTime", session.getStartTime());
            data.put("lastHeartbeat", session.getLastHeartbeat());
            data.put("status", session.getStatus());
            data.put("disconnectCount", session.getDisconnectCount());
            data.put("currentScore", session.getCurrentScore());
            data.put("remainingSeconds", remainingSeconds(session, now));
            data.put("statusMessage", session.getStatusMessage());

            data.put("malpracticeCount", malpracticeCount);
            data.put("videoRiskCount", videoRiskCount);
            data.put("riskScore", riskScore);
            data.put("inactive", inactive);
            data.put("events", eventBreakdown);

            response.add(data);
        }

        return response;
    }

    public List<Map<String, Object>> getCoordinatorExamHistory(AuthEntity coordinator) {
        List<ExamEntity> allExams = examRepository.findAll();

        return allExams.stream()
                .filter(exam -> {
                    if (coordinator != null && coordinator.getRole() == AuthEntity.Role.COORDINATOR) {
                        boolean matchCreatedBy = exam.getCreatedBy() != null && exam.getCreatedBy().equalsIgnoreCase(coordinator.getEmail());
                        boolean matchCoordName = exam.getCoordinatorName() != null && exam.getCoordinatorName().equalsIgnoreCase(coordinator.getName());
                        return matchCreatedBy || matchCoordName;
                    }
                    return true; // Admin sees all
                })
                .sorted(Comparator.comparing(ExamEntity::getStartTime, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(exam -> {
                    List<ExamSubmissionEntity> submissions = submissionRepository.findByExamId(exam.getId());

                    List<Map<String, Object>> attendeeList = submissions.stream().map(sub -> {
                        Map<String, Object> subMap = new HashMap<>();
                        AuthEntity student = sub.getStudent();
                        int total = exam.getTotalMarks() > 0 ? exam.getTotalMarks() : 100;
                        int score = sub.getScore() != null ? sub.getScore() : 0;
                        int percentage = Math.round(((float) score / total) * 100);

                        subMap.put("submissionId", sub.getId());
                        subMap.put("studentId", student.getId());
                        subMap.put("studentName", student.getName());
                        subMap.put("studentEmail", student.getEmail());
                        subMap.put("username", student.getUsername());
                        subMap.put("institution", student.getInstitution());
                        subMap.put("department", student.getDepartment());
                        subMap.put("score", score);
                        subMap.put("totalMarks", total);
                        subMap.put("percentage", percentage);
                        subMap.put("isPass", score >= (total / 2));
                        subMap.put("submittedAt", sub.getSubmittedAt());
                        return subMap;
                    }).toList();

                    int totalScore = attendeeList.stream().mapToInt(a -> (int) a.get("score")).sum();
                    int avgScore = attendeeList.isEmpty() ? 0 : Math.round((float) totalScore / attendeeList.size());

                    Map<String, Object> examMap = new HashMap<>();
                    examMap.put("examId", exam.getId());
                    examMap.put("title", exam.getTitle());
                    examMap.put("description", exam.getDescription());
                    examMap.put("examType", exam.getExamType() != null ? exam.getExamType().name() : "MCQ");
                    examMap.put("duration", exam.getDuration());
                    examMap.put("totalMarks", exam.getTotalMarks());
                    examMap.put("questionCount", exam.getQuestionCount());
                    examMap.put("startTime", exam.getStartTime());
                    examMap.put("endTime", exam.getEndTime());
                    examMap.put("status", exam.getStatus() != null ? exam.getStatus().name() : "DRAFT");
                    examMap.put("coordinatorName", exam.getCoordinatorName());
                    examMap.put("createdBy", exam.getCreatedBy());
                    examMap.put("totalAttended", attendeeList.size());
                    examMap.put("averageScore", avgScore);
                    examMap.put("submissions", attendeeList);
                    return examMap;
                })
                .toList();
    }

    private boolean isSessionTimeOver(ExamSessionEntity session, LocalDateTime now) {
        LocalDateTime durationDeadline = session.getStartTime().plusMinutes(session.getExam().getDuration());
        LocalDateTime scheduledDeadline = session.getExam().getEndTime();
        LocalDateTime deadline = scheduledDeadline.isBefore(durationDeadline)
                ? scheduledDeadline : durationDeadline;
        return !now.isBefore(deadline);
    }

    private long remainingSeconds(ExamSessionEntity session, LocalDateTime now) {
        LocalDateTime durationDeadline = session.getStartTime().plusMinutes(session.getExam().getDuration());
        LocalDateTime scheduledDeadline = session.getExam().getEndTime();
        LocalDateTime deadline = scheduledDeadline.isBefore(durationDeadline)
                ? scheduledDeadline : durationDeadline;
        return Math.max(0, java.time.Duration.between(now, deadline).getSeconds());
    }


    private int calculateRiskScore(
            long malpracticeCount,
            boolean inactive
    ) {
        int score = (int) malpracticeCount;
        if (inactive) score += 3;
        return score;
    }
}
