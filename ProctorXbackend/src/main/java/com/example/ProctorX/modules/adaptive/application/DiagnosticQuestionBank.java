package com.example.ProctorX.modules.adaptive.application;

import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Map;

@Component
public class DiagnosticQuestionBank {

    public static final List<String> DSA_DIMENSIONS = List.of(
            "ARRAY",
            "HASHMAP",
            "TWO_POINTER",
            "SLIDING_WINDOW",
            "SORTING",
            "BINARY_SEARCH",
            "STACK",
            "QUEUE",
            "TREE",
            "GRAPH",
            "GREEDY",
            "DYNAMIC_PROGRAMMING"
    );

    public static final List<String> BEHAVIORAL_DIMENSIONS = List.of(
            "IMPLEMENTATION",
            "PATTERN_RECOGNITION",
            "COMPLEXITY_ANALYSIS",
            "DEBUGGING_ERROR_HANDLING",
            "EDGE_CASE_HANDLING"
    );

    public record DiagnosticQuestion(
            String id,
            String title,
            String description,
            String primaryTopic,
            List<String> secondaryTopics,
            String pattern,
            String difficulty,
            String solutionOutline,
            Map<String, Double> topicWeights,
            List<Map<String, Object>> testCases
    ) {}

    public List<DiagnosticQuestion> getCuratedQuestions() {
        return List.of(
                // Q1: ARRAY & TWO POINTER
                new DiagnosticQuestion(
                        "DIAG_01",
                        "Pair With Target Sum",
                        "Given a sorted array of integers `nums` and an integer `target`, return the 1-based indices of the two numbers such that they add up to `target`. If no pair exists, output `-1 -1`.\n\nInput format:\nFirst line contains integer N.\nSecond line contains N space-separated sorted integers.\nThird line contains target integer.\n\nOutput format:\nTwo 1-based space-separated indices.",
                        "TWO_POINTER",
                        List.of("ARRAY"),
                        "TWO_POINTER_CONVERGING",
                        "EASY",
                        "Use two pointers (left at 0, right at N-1). Compute sum; if sum == target return indices, else adjust pointers.",
                        Map.of("TWO_POINTER", 0.6, "ARRAY", 0.4),
                        List.of(
                                Map.of("input", "4\n2 7 11 15\n9", "expectedOutput", "1 2", "sample", true),
                                Map.of("input", "5\n1 2 3 4 6\n10", "expectedOutput", "4 5", "sample", true),
                                Map.of("input", "3\n1 2 5\n10", "expectedOutput", "-1 -1", "sample", false)
                        )
                ),

                // Q2: HASHMAP & STRING
                new DiagnosticQuestion(
                        "DIAG_02",
                        "First Unique Character Frequency",
                        "Given a string `s`, find the first non-repeating character in it and print its index (0-based). If it does not exist, print `-1`.\n\nInput format:\nA single string `s`.\n\nOutput format:\nThe 0-based index of the first non-repeating character, or -1.",
                        "HASHMAP",
                        List.of("ARRAY"),
                        "FREQUENCY_COUNTING",
                        "EASY",
                        "Count frequency of each character using a frequency array or HashMap in O(N). Iterate through string to find first with count 1.",
                        Map.of("HASHMAP", 0.7, "ARRAY", 0.3),
                        List.of(
                                Map.of("input", "leetcode", "expectedOutput", "0", "sample", true),
                                Map.of("input", "loveleetcode", "expectedOutput", "2", "sample", true),
                                Map.of("input", "aabb", "expectedOutput", "-1", "sample", false)
                        )
                ),

                // Q3: STACK & MATCHING
                new DiagnosticQuestion(
                        "DIAG_03",
                        "Balanced Bracket Sequence",
                        "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\nAn input string is valid if open brackets are closed by the same type of brackets in the correct order.\n\nInput format:\nA single string of brackets.\n\nOutput format:\nPrint `true` if valid, otherwise `false`.",
                        "STACK",
                        List.of("QUEUE"),
                        "MATCHING_STACK",
                        "EASY_MEDIUM",
                        "Push opening brackets to stack. When closing bracket encountered, check stack top for matching pair.",
                        Map.of("STACK", 0.8, "QUEUE", 0.2),
                        List.of(
                                Map.of("input", "()[]{}", "expectedOutput", "true", "sample", true),
                                Map.of("input", "(]", "expectedOutput", "false", "sample", true),
                                Map.of("input", "([{}])", "expectedOutput", "true", "sample", false)
                        )
                ),

                // Q4: BINARY SEARCH & SORTING
                new DiagnosticQuestion(
                        "DIAG_04",
                        "Search Insert Position",
                        "Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order in O(log N) time.\n\nInput format:\nFirst line contains integer N.\nSecond line contains N space-separated integers.\nThird line contains target integer.\n\nOutput format:\nIndex of target or its insert position.",
                        "BINARY_SEARCH",
                        List.of("SORTING", "ARRAY"),
                        "BINARY_SEARCH_LOWER_BOUND",
                        "MEDIUM",
                        "Binary search with low and high pointers. Return low pointer upon loop exit.",
                        Map.of("BINARY_SEARCH", 0.7, "SORTING", 0.3),
                        List.of(
                                Map.of("input", "4\n1 3 5 6\n5", "expectedOutput", "2", "sample", true),
                                Map.of("input", "4\n1 3 5 6\n2", "expectedOutput", "1", "sample", true),
                                Map.of("input", "4\n1 3 5 6\n7", "expectedOutput", "4", "sample", false)
                        )
                ),

                // Q5: SLIDING WINDOW & SUBARRAY
                new DiagnosticQuestion(
                        "DIAG_05",
                        "Maximum Sum Subarray of Size K",
                        "Given an array of integers and a positive number `k`, find the maximum sum of any contiguous subarray of size `k`.\n\nInput format:\nFirst line contains two integers N and k.\nSecond line contains N space-separated integers.\n\nOutput format:\nA single integer representing the maximum sum.",
                        "SLIDING_WINDOW",
                        List.of("ARRAY"),
                        "FIXED_SIZE_SLIDING_WINDOW",
                        "MEDIUM",
                        "Maintain a running sum of the first k elements, then slide the window by adding the next and subtracting the leftmost.",
                        Map.of("SLIDING_WINDOW", 0.7, "ARRAY", 0.3),
                        List.of(
                                Map.of("input", "7 3\n2 1 5 1 3 2 1", "expectedOutput", "9", "sample", true),
                                Map.of("input", "4 2\n2 3 4 1", "expectedOutput", "7", "sample", true),
                                Map.of("input", "5 1\n10 20 30 40 50", "expectedOutput", "50", "sample", false)
                        )
                ),

                // Q6: DYNAMIC PROGRAMMING & GREEDY
                new DiagnosticQuestion(
                        "DIAG_06",
                        "Minimum Cost Climbing Stairs",
                        "You are given an integer array `cost` where `cost[i]` is the cost of `i`-th step on a staircase. Once you pay the cost, you can either climb one or two steps. You can start from index 0 or index 1. Return the minimum cost to reach the top of the floor (past the last step).\n\nInput format:\nFirst line contains integer N.\nSecond line contains N space-separated integers.\n\nOutput format:\nA single integer representing minimum cost.",
                        "DYNAMIC_PROGRAMMING",
                        List.of("GREEDY", "ARRAY"),
                        "1D_DP_OPTIMIZATION",
                        "MEDIUM",
                        "dp[i] = cost[i] + min(dp[i-1], dp[i-2]). Space can be optimized to O(1).",
                        Map.of("DYNAMIC_PROGRAMMING", 0.7, "GREEDY", 0.3),
                        List.of(
                                Map.of("input", "3\n10 15 20", "expectedOutput", "15", "sample", true),
                                Map.of("input", "10\n1 100 1 1 1 100 1 1 100 1", "expectedOutput", "6", "sample", true),
                                Map.of("input", "2\n1 2", "expectedOutput", "1", "sample", false)
                        )
                )
        );
    }
}
