package com.example.ProctorX.modules.adaptive.application;

import org.springframework.stereotype.Component;
import java.util.*;

@Component
public class DiagnosticQuestionBank {

    public record DiagnosticQuestion(
            String id,
            String title,
            String description,
            String primaryConcept,
            String pattern,
            List<String> secondaryConcepts,
            String difficulty,
            String solutionOutline,
            String canonicalSolution,
            Map<String, Double> conceptWeights,
            Map<String, Double> patternWeights,
            List<String> errorTraps,
            List<Map<String, Object>> testCases
    ) {}

    private static Map<String, Object> tc(int id, String category, String name, boolean sample, String input, String expectedOutput) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", id);
        map.put("category", category);
        map.put("name", name);
        map.put("sample", sample);
        map.put("input", input);
        map.put("expectedOutput", expectedOutput);
        return map;
    }

    private static String generateTwoSumScaleInput(int n) {
        StringBuilder sb = new StringBuilder(n * 7 + 32);
        sb.append(n).append("\n");
        for (int i = 1; i <= n; i++) {
            if (i > 1) sb.append(' ');
            sb.append(i);
        }
        sb.append("\n").append(2 * n - 1);
        return sb.toString();
    }

    private static String generateSlidingWindowScaleInput(int n, int k) {
        StringBuilder sb = new StringBuilder(n * 3 + 32);
        sb.append(n).append(' ').append(k).append("\n");
        for (int i = 1; i <= n; i++) {
            if (i > 1) sb.append(' ');
            sb.append('1');
        }
        return sb.toString();
    }

    private static String generateNestedParens(int pairs) {
        StringBuilder sb = new StringBuilder(pairs * 2);
        for (int i = 0; i < pairs; i++) sb.append('(');
        for (int i = 0; i < pairs; i++) sb.append(')');
        return sb.toString();
    }

    private static String generateBinarySearchScaleInput(int n, int target) {
        StringBuilder sb = new StringBuilder(n * 7 + 32);
        sb.append(n).append("\n");
        for (int i = 0; i < n; i++) {
            if (i > 0) sb.append(' ');
            sb.append(i * 2);
        }
        sb.append("\n").append(target);
        return sb.toString();
    }

    private static String generateKadaneScaleInput(int n) {
        StringBuilder sb = new StringBuilder(n * 3 + 32);
        sb.append(n).append("\n");
        for (int i = 1; i <= n; i++) {
            if (i > 1) sb.append(' ');
            sb.append('1');
        }
        return sb.toString();
    }

    public List<DiagnosticQuestion> getCuratedQuestions() {
        return List.of(
                // =========================================================================
                // PROBE 1: ARRAYS_STRINGS + TWO_POINTERS
                // =========================================================================
                new DiagnosticQuestion(
                        "DIAG_01",
                        "Pair With Target Sum",
                        "Given a sorted array of integers and a target integer T, determine if there exists any pair of distinct elements that add up to T. Print YES if a pair exists, otherwise print NO.\n\nInput format:\nFirst line contains integer N.\nSecond line contains N space-separated sorted integers.\nThird line contains target integer T.\n\nOutput format:\nPrint YES or NO.",
                        "ARRAYS_STRINGS",
                        "TWO_POINTERS",
                        List.of("BINARY_SEARCH"),
                        "EASY",
                        "Use two pointers (left at 0, right at N-1). Compute sum; if sum == target return YES, else advance left if sum < target, or decrement right if sum > target in O(N) time.",
                        """
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null || line.trim().isEmpty()) { System.out.println("NO"); return; }
        int n = Integer.parseInt(line.trim());
        if (n < 2) { System.out.println("NO"); return; }
        StringTokenizer st = new StringTokenizer(br.readLine());
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = Integer.parseInt(st.nextToken());
        int t = Integer.parseInt(br.readLine().trim());
        int l = 0, r = n - 1;
        while (l < r) {
            int sum = a[l] + a[r];
            if (sum == t) { System.out.println("YES"); return; }
            else if (sum < t) l++;
            else r--;
        }
        System.out.println("NO");
    }
}
""",
                        Map.of("ARRAYS_STRINGS", 1.0),
                        Map.of("TWO_POINTERS", 1.0),
                        List.of("OFF_BY_ONE", "BOUNDARY_CONDITION", "TIME_LIMIT_EXCEEDED"),
                        List.of(
                                tc(1, "SAMPLE_1", "Sample 1", true, "4\n2 7 11 15\n9", "YES"),
                                tc(2, "SAMPLE_2", "Sample 2", true, "5\n1 2 3 4 6\n10", "YES"),
                                tc(3, "BOUNDARY", "Boundary Minimal Array", false, "3\n1 2 5\n10", "NO"),
                                tc(4, "SCALE_STRESS", "Scale Stress (N=25,000)", false, generateTwoSumScaleInput(25000), "YES"),
                                tc(5, "DEFECT_TRAP", "Defect Trap (Negative Values)", false, "4\n-10 -3 0 5\n-5", "YES")
                        )
                ),

                // =========================================================================
                // PROBE 2: HASH_TABLES + SLIDING_WINDOW
                // =========================================================================
                new DiagnosticQuestion(
                        "DIAG_02",
                        "Maximum Sum Subarray of Size K",
                        "Given an array of N integers and a positive integer K (1 <= K <= N), calculate the maximum sum of any contiguous subarray of size K.\n\nInput format:\nFirst line contains two integers N and K.\nSecond line contains N space-separated integers.\n\nOutput format:\nPrint a single integer representing the maximum contiguous subarray sum of size K.",
                        "HASH_TABLES",
                        "SLIDING_WINDOW",
                        List.of("INTERVALS_GREEDY"),
                        "EASY",
                        "Compute the sum of the first K elements, then slide the window by adding a[i] and subtracting a[i-K] in O(N) time.",
                        """
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null || line.trim().isEmpty()) return;
        StringTokenizer st = new StringTokenizer(line);
        int n = Integer.parseInt(st.nextToken());
        int k = Integer.parseInt(st.nextToken());
        st = new StringTokenizer(br.readLine());
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = Integer.parseInt(st.nextToken());
        if (n < k || k <= 0) { System.out.println(0); return; }
        long cur = 0;
        for (int i = 0; i < k; i++) cur += a[i];
        long max = cur;
        for (int i = k; i < n; i++) {
            cur += a[i] - a[i - k];
            if (cur > max) max = cur;
        }
        System.out.println(max);
    }
}
""",
                        Map.of("HASH_TABLES", 1.0),
                        Map.of("SLIDING_WINDOW", 1.0),
                        List.of("OFF_BY_ONE", "BOUNDARY_CONDITION", "TIME_LIMIT_EXCEEDED"),
                        List.of(
                                tc(1, "SAMPLE_1", "Sample 1", true, "7 3\n2 1 5 1 3 2 1", "9"),
                                tc(2, "SAMPLE_2", "Sample 2", true, "4 2\n2 3 4 1", "7"),
                                tc(3, "BOUNDARY", "Boundary K=1", false, "5 1\n10 20 30 40 50", "50"),
                                tc(4, "SCALE_STRESS", "Scale Stress (N=25,000, K=1,000)", false, generateSlidingWindowScaleInput(25000, 1000), "1000"),
                                tc(5, "DEFECT_TRAP", "Defect Trap (All Negative Elements)", false, "4 2\n-5 -2 -3 -1", "-4")
                        )
                ),

                // =========================================================================
                // PROBE 3: STACKS_QUEUES + MONOTONIC_QUEUE_STACK
                // =========================================================================
                new DiagnosticQuestion(
                        "DIAG_03",
                        "Valid Parentheses Sequence",
                        "Given a string containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. Open brackets must be closed by the same type of brackets in the correct order.\n\nInput format:\nA single string of brackets.\n\nOutput format:\nPrint true if valid, otherwise false.",
                        "STACKS_QUEUES",
                        "MONOTONIC_QUEUE_STACK",
                        List.of("RECURSION_BACKTRACKING"),
                        "EASY",
                        "Push opening brackets to stack. When closing bracket is encountered, check stack underflow and matching pair at stack top in O(N) time.",
                        """
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String s = br.readLine();
        if (s == null || s.trim().isEmpty()) { System.out.println("true"); return; }
        s = s.trim();
        Deque<Character> st = new ArrayDeque<>();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '(' || c == '{' || c == '[') {
                st.push(c);
            } else {
                if (st.isEmpty()) { System.out.println("false"); return; }
                char top = st.pop();
                if (c == ')' && top != '(') { System.out.println("false"); return; }
                if (c == '}' && top != '{') { System.out.println("false"); return; }
                if (c == ']' && top != '[') { System.out.println("false"); return; }
            }
        }
        System.out.println(st.isEmpty() ? "true" : "false");
    }
}
""",
                        Map.of("STACKS_QUEUES", 1.0),
                        Map.of("MONOTONIC_QUEUE_STACK", 1.0),
                        List.of("BOUNDARY_CONDITION", "NULL_EMPTY_COLLECTION", "STATE_CORRUPTION"),
                        List.of(
                                tc(1, "SAMPLE_1", "Sample 1", true, "()[]{}", "true"),
                                tc(2, "SAMPLE_2", "Sample 2", true, "(]", "false"),
                                tc(3, "BOUNDARY", "Boundary Single Bracket", false, "(", "false"),
                                tc(4, "SCALE_STRESS", "Scale Stress (N=20,000 Nested)", false, generateNestedParens(10000), "true"),
                                tc(5, "DEFECT_TRAP", "Defect Trap (Closing First / Underflow)", false, "]", "false")
                        )
                ),

                // =========================================================================
                // PROBE 4: TREES_BST + BINARY_SEARCH
                // =========================================================================
                new DiagnosticQuestion(
                        "DIAG_04",
                        "Search Insert Position",
                        "Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order in O(log N) runtime.\n\nInput format:\nFirst line contains integer N.\nSecond line contains N space-separated sorted integers.\nThird line contains target integer.\n\nOutput format:\nPrint the 0-based index.",
                        "TREES_BST",
                        "BINARY_SEARCH",
                        List.of("TOP_K_HEAP"),
                        "EASY",
                        "Binary search with low and high pointers. Update mid = low + (high-low)/2. Return low pointer upon loop exit in O(log N) time.",
                        """
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null || line.trim().isEmpty()) return;
        int n = Integer.parseInt(line.trim());
        StringTokenizer st = new StringTokenizer(br.readLine());
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = Integer.parseInt(st.nextToken());
        int t = Integer.parseInt(br.readLine().trim());
        int l = 0, r = n - 1;
        while (l <= r) {
            int mid = l + (r - l) / 2;
            if (a[mid] == t) { System.out.println(mid); return; }
            else if (a[mid] < t) l = mid + 1;
            else r = mid - 1;
        }
        System.out.println(l);
    }
}
""",
                        Map.of("TREES_BST", 1.0),
                        Map.of("BINARY_SEARCH", 1.0),
                        List.of("OFF_BY_ONE", "BOUNDARY_CONDITION", "TIME_LIMIT_EXCEEDED"),
                        List.of(
                                tc(1, "SAMPLE_1", "Sample 1", true, "4\n1 3 5 6\n5", "2"),
                                tc(2, "SAMPLE_2", "Sample 2", true, "4\n1 3 5 6\n2", "1"),
                                tc(3, "BOUNDARY", "Boundary Single Element Not Found", false, "1\n5\n2", "0"),
                                tc(4, "SCALE_STRESS", "Scale Stress (N=25,000 Sorted Search)", false, generateBinarySearchScaleInput(25000, 24998), "12499"),
                                tc(5, "DEFECT_TRAP", "Defect Trap (Target Greater Than All)", false, "4\n1 3 5 6\n7", "4")
                        )
                ),

                // =========================================================================
                // PROBE 5: DYNAMIC_PROGRAMMING + INTERVALS_GREEDY
                // =========================================================================
                new DiagnosticQuestion(
                        "DIAG_05",
                        "Maximum Contiguous Subarray Sum",
                        "Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum (Kadane's Algorithm).\n\nInput format:\nFirst line contains integer N.\nSecond line contains N space-separated integers.\n\nOutput format:\nPrint a single integer representing the maximum contiguous subarray sum.",
                        "DYNAMIC_PROGRAMMING",
                        "INTERVALS_GREEDY",
                        List.of("RECURSION_BACKTRACKING"),
                        "EASY",
                        "Kadane's dynamic programming: Maintain currMax = max(nums[i], currMax + nums[i]) and maxSoFar = max(maxSoFar, currMax) in O(N) time and O(1) space.",
                        """
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null || line.trim().isEmpty()) return;
        int n = Integer.parseInt(line.trim());
        StringTokenizer st = new StringTokenizer(br.readLine());
        long maxSoFar = Long.MIN_VALUE;
        long currMax = 0;
        for (int i = 0; i < n; i++) {
            long val = Long.parseLong(st.nextToken());
            if (i == 0) {
                maxSoFar = val;
                currMax = val;
            } else {
                currMax = Math.max(val, currMax + val);
                maxSoFar = Math.max(maxSoFar, currMax);
            }
        }
        System.out.println(maxSoFar);
    }
}
""",
                        Map.of("DYNAMIC_PROGRAMMING", 1.0),
                        Map.of("INTERVALS_GREEDY", 1.0),
                        List.of("BOUNDARY_CONDITION", "STATE_CORRUPTION", "TIME_LIMIT_EXCEEDED"),
                        List.of(
                                tc(1, "SAMPLE_1", "Sample 1", true, "9\n-2 1 -3 4 -1 2 1 -5 4", "6"),
                                tc(2, "SAMPLE_2", "Sample 2", true, "5\n5 4 -1 7 8", "23"),
                                tc(3, "BOUNDARY", "Boundary Single Negative Element", false, "1\n-5", "-5"),
                                tc(4, "SCALE_STRESS", "Scale Stress (N=25,000 Ones)", false, generateKadaneScaleInput(25000), "25000"),
                                tc(5, "DEFECT_TRAP", "Defect Trap (All Negative Elements)", false, "5\n-8 -3 -6 -2 -5", "-2")
                        )
                )
        );
    }
}
