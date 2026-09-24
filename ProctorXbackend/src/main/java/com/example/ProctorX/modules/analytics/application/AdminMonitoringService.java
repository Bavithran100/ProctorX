package com.example.ProctorX.Service.Impl;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.ExamEntity;
import com.example.ProctorX.Entity.ExamSessionEntity;
import com.example.ProctorX.Entity.ExamSubmissionEntity;
import com.example.ProctorX.Entity.MalPracticeLogEntity;
import com.example.ProctorX.Repository.ExamRepository;
import com.example.ProctorX.Repository.ExamSessionRepository;
import com.example.ProctorX.Repository.ExamSubmissionRepository;
import com.example.ProctorX.Repository.MalPracticeLogRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminMonitoringService {

    private static final Logger log = LoggerFactory.getLogger(AdminMonitoringService.class);

    private final ExamSessionRepository sessionRepository;
    private final MalPracticeLogRepository logRepository;
    private final ExamSubmissionService submissionService;
    private final ExamRepository examRepository;
    private final ExamSubmissionRepository submissionRepository;

    /**
     * Retrieves currently active exam sessions for live monitoring.
     * Strictly filters for ACTIVE and WAITING candidates currently taking exams.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getLiveSessions(AuthEntity currentUser) {
        List<ExamSessionEntity> sessions;
        try {
            sessions = sessionRepository.findAllWithStudentAndExam();
        } catch (Exception e) {
            sessions = sessionRepository.findAll();
        }

        LocalDateTime now = LocalDateTime.now();
        List<Map<String, Object>> response = new ArrayList<>();

        if (sessions.isEmpty()) {
            return response;
        }

        if (currentUser != null && currentUser.getRole() != AuthEntity.Role.ADMIN && Boolean.FALSE.equals(currentUser.getApproved())) {
            return Collections.emptyList();
        }

        // Filter sessions: strictly coordinator-owned AND strictly LIVE (active/waiting/interrupted before time ends)
        List<ExamSessionEntity> filteredSessions = new ArrayList<>();
        for (ExamSessionEntity session : sessions) {
            if (session.getExam() == null || session.getStudent() == null) {
                continue;
            }

            // Case 1: If student submitted/finished exam, drop from live control room
            if (session.getStatus() == ExamSessionEntity.Status.SUBMITTED) {
                continue;
            }

            // Case 2: If allocated exam time is finished, drop from live control room
            if (isSessionTimeOver(session, now)) {
                continue;
            }

            if (currentUser != null && currentUser.getRole() == AuthEntity.Role.COORDINATOR) {
                ExamEntity exam = session.getExam();
                boolean matchCreatedBy = exam.getCreatedBy() != null && exam.getCreatedBy().equalsIgnoreCase(currentUser.getEmail());
                boolean matchCoordName = exam.getCoordinatorName() != null && (
                        exam.getCoordinatorName().equalsIgnoreCase(currentUser.getName()) ||
                        (currentUser.getName() != null && !currentUser.getName().isBlank() && exam.getCoordinatorName().equalsIgnoreCase(currentUser.getName())) ||
                        (currentUser.getEmail() != null && currentUser.getEmail().toLowerCase().startsWith(exam.getCoordinatorName().toLowerCase()))
                );

                if (!matchCreatedBy && !matchCoordName) {
                    continue;
                }
            }
            filteredSessions.add(session);
        }

        if (filteredSessions.isEmpty()) {
            return response;
        }

        // Batch aggregate all malpractice events for active sessions in 1 single fast query
        List<Long> sessionIds = filteredSessions.stream().map(ExamSessionEntity::getId).toList();
        Map<Long, Long> totalMalpracticeMap = new HashMap<>();
        Map<Long, Long> videoRiskMap = new HashMap<>();
        Map<Long, Map<String, Long>> eventBreakdownMap = new HashMap<>();

        try {
            List<Object[]> aggregated = logRepository.findAggregatedEventsForSessions(sessionIds);
            Set<String> videoRiskTypes = Set.of("MULTIPLE_PERSON", "MOBILE_PHONE", "CAMERA_UNAVAILABLE", "FULLSCREEN_EXIT");

            for (Object[] row : aggregated) {
                Long sId = (Long) row[0];
                String eventType = row[1] != null ? row[1].toString() : "OTHER";
                Long count = ((Number) row[2]).longValue();
                Long occurrenceSum = ((Number) row[3]).longValue();

                totalMalpracticeMap.put(sId, totalMalpracticeMap.getOrDefault(sId, 0L) + count);
                eventBreakdownMap.computeIfAbsent(sId, k -> new HashMap<>()).put(eventType, count);

                if (videoRiskTypes.contains(eventType)) {
                    videoRiskMap.put(sId, videoRiskMap.getOrDefault(sId, 0L) + (occurrenceSum > 0 ? occurrenceSum : count));
                }
            }
        } catch (Exception e) {
            log.warn("Error batch loading malpractice aggregations: {}", e.getMessage());
        }

        for (ExamSessionEntity session : filteredSessions) {
            long malpracticeCount = totalMalpracticeMap.getOrDefault(session.getId(), 0L);
            long videoRiskCount = videoRiskMap.getOrDefault(session.getId(), 0L);

            boolean inactive = session.getLastHeartbeat() == null ||
                    session.getLastHeartbeat().isBefore(now.minusSeconds(30));

            int riskScore = calculateRiskScore(malpracticeCount, inactive);
            Map<String, Long> eventBreakdown = eventBreakdownMap.getOrDefault(session.getId(), Collections.emptyMap());

            Map<String, Object> data = new HashMap<>();
            data.put("sessionId", session.getId());
            data.put("studentId", session.getStudent().getId());
            data.put("studentName", session.getStudent().getName() != null ? session.getStudent().getName() : session.getStudent().getUsername());
            data.put("studentEmail", session.getStudent().getEmail());
            data.put("username", session.getStudent().getUsername());
            data.put("institution", session.getStudent().getInstitution());
            data.put("department", session.getStudent().getDepartment());
            data.put("examId", session.getExam().getId());
            data.put("examTitle", session.getExam().getTitle());
            data.put("coordinatorName", session.getExam().getCoordinatorName());
            data.put("startTime", session.getStartTime());
            data.put("lastHeartbeat", session.getLastHeartbeat());
            data.put("status", session.getStatus() != null ? session.getStatus().name() : "ACTIVE");
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

    /**
     * Retrieves the complete examination history (active, completed, past/outdated)
     * authored by the coordinator, along with all attending candidates and their results.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCoordinatorExamHistory(AuthEntity coordinator) {
        List<ExamEntity> allExams = examRepository.findAll();

        List<ExamEntity> filteredExams = allExams.stream()
                .filter(exam -> {
                    if (coordinator == null) return true;
                    if (coordinator.getRole() == AuthEntity.Role.ADMIN) return true;

                    // Strict coordinator matching
                    boolean matchCreatedBy = exam.getCreatedBy() != null && exam.getCreatedBy().equalsIgnoreCase(coordinator.getEmail());
                    boolean matchCoordName = exam.getCoordinatorName() != null && (
                            exam.getCoordinatorName().equalsIgnoreCase(coordinator.getName()) ||
                            (coordinator.getName() != null && !coordinator.getName().isBlank() && exam.getCoordinatorName().equalsIgnoreCase(coordinator.getName())) ||
                            (coordinator.getEmail() != null && coordinator.getEmail().toLowerCase().startsWith(exam.getCoordinatorName().toLowerCase()))
                    );

                    return matchCreatedBy || matchCoordName;
                })
                .sorted(Comparator.comparing(ExamEntity::getStartTime, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        List<ExamEntity> targetExams = filteredExams;
        if (targetExams.isEmpty()) {
            return Collections.emptyList();
        }

        // BATCH LOAD all submissions and sessions in 2 single queries, eliminating the N+1 remote DB roundtrips
        List<ExamSubmissionEntity> allSubmissions;
        try {
            allSubmissions = submissionRepository.findAllWithStudentAndExam();
        } catch (Exception e) {
            allSubmissions = submissionRepository.findAll();
        }

        List<ExamSessionEntity> allSessions;
        try {
            allSessions = sessionRepository.findAllWithStudentAndExam();
        } catch (Exception e) {
            allSessions = sessionRepository.findAll();
        }

        Map<Long, List<ExamSubmissionEntity>> submissionsByExam = allSubmissions.stream()
                .filter(s -> s.getExam() != null && s.getExam().getId() != null)
                .collect(java.util.stream.Collectors.groupingBy(s -> s.getExam().getId()));

        Map<Long, List<ExamSessionEntity>> sessionsByExam = allSessions.stream()
                .filter(s -> s.getExam() != null && s.getExam().getId() != null)
                .collect(java.util.stream.Collectors.groupingBy(s -> s.getExam().getId()));

        return targetExams.stream()
                .map(exam -> {
                    List<ExamSubmissionEntity> submissions = submissionsByExam.getOrDefault(exam.getId(), Collections.emptyList());
                    List<ExamSessionEntity> sessions = sessionsByExam.getOrDefault(exam.getId(), Collections.emptyList());

                    // Merge into a comprehensive attendee map keyed by student ID
                    Map<Long, Map<String, Object>> attendeeMap = new LinkedHashMap<>();
                    int total = exam.getTotalMarks() > 0 ? exam.getTotalMarks() : 100;

                    // 1. First add all official submissions
                    for (ExamSubmissionEntity sub : submissions) {
                        AuthEntity student = sub.getStudent();
                        if (student == null) continue;

                        int score = sub.getScore() != null ? sub.getScore() : 0;
                        int percentage = Math.round(((float) score / total) * 100);

                        Map<String, Object> subMap = new HashMap<>();
                        subMap.put("submissionId", sub.getId());
                        subMap.put("studentId", student.getId());
                        subMap.put("studentName", student.getName() != null ? student.getName() : student.getUsername());
                        subMap.put("studentEmail", student.getEmail());
                        subMap.put("username", student.getUsername());
                        subMap.put("institution", student.getInstitution());
                        subMap.put("department", student.getDepartment());
                        subMap.put("score", score);
                        subMap.put("totalMarks", total);
                        subMap.put("percentage", percentage);
                        subMap.put("isPass", score >= (total / 2));
                        subMap.put("status", "SUBMITTED");
                        subMap.put("submittedAt", sub.getSubmittedAt());
                        subMap.put("disconnectCount", 0);

                        attendeeMap.put(student.getId(), subMap);
                    }

                    // 2. Add or enrich with all exam sessions (including in-progress, disconnected, or terminated attempts)
                    for (ExamSessionEntity session : sessions) {
                        AuthEntity student = session.getStudent();
                        if (student == null) continue;

                        if (!attendeeMap.containsKey(student.getId())) {
                            int score = session.getCurrentScore();
                            int percentage = Math.round(((float) score / total) * 100);

                            Map<String, Object> subMap = new HashMap<>();
                            subMap.put("submissionId", null);
                            subMap.put("sessionId", session.getId());
                            subMap.put("studentId", student.getId());
                            subMap.put("studentName", student.getName() != null ? student.getName() : student.getUsername());
                            subMap.put("studentEmail", student.getEmail());
                            subMap.put("username", student.getUsername());
                            subMap.put("institution", student.getInstitution());
                            subMap.put("department", student.getDepartment());
                            subMap.put("score", score);
                            subMap.put("totalMarks", total);
                            subMap.put("percentage", percentage);
                            subMap.put("isPass", score >= (total / 2));
                            subMap.put("status", session.getStatus() != null ? session.getStatus().name() : "ATTENDING");
                            subMap.put("submittedAt", session.getLastHeartbeat() != null ? session.getLastHeartbeat() : session.getStartTime());
                            subMap.put("disconnectCount", session.getDisconnectCount());

                            attendeeMap.put(student.getId(), subMap);
                        } else {
                            Map<String, Object> subMap = attendeeMap.get(student.getId());
                            subMap.put("sessionId", session.getId());
                            subMap.put("disconnectCount", session.getDisconnectCount());
                            if (session.getStatus() == ExamSessionEntity.Status.TERMINATED) {
                                subMap.put("status", "TERMINATED");
                            }
                        }
                    }

                    List<Map<String, Object>> attendeeList = new ArrayList<>(attendeeMap.values());
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
        if (session.getExam() == null || session.getStartTime() == null) return false;
        LocalDateTime durationDeadline = session.getStartTime().plusMinutes(session.getExam().getDuration());
        LocalDateTime scheduledDeadline = session.getExam().getEndTime();
        LocalDateTime deadline = (scheduledDeadline != null && scheduledDeadline.isBefore(durationDeadline))
                ? scheduledDeadline : durationDeadline;
        return !now.isBefore(deadline);
    }

    private long remainingSeconds(ExamSessionEntity session, LocalDateTime now) {
        if (session.getExam() == null || session.getStartTime() == null) return 0;
        LocalDateTime durationDeadline = session.getStartTime().plusMinutes(session.getExam().getDuration());
        LocalDateTime scheduledDeadline = session.getExam().getEndTime();
        LocalDateTime deadline = (scheduledDeadline != null && scheduledDeadline.isBefore(durationDeadline))
                ? scheduledDeadline : durationDeadline;
        return Math.max(0, java.time.Duration.between(now, deadline).getSeconds());
    }

    private int calculateRiskScore(long malpracticeCount, boolean inactive) {
        int score = (int) malpracticeCount;
        if (inactive) score += 3;
        return score;
    }
}
