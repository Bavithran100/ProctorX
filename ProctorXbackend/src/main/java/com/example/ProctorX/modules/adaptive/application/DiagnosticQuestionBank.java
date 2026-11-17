package com.example.ProctorX.modules.adaptive.application;

import com.example.ProctorX.modules.adaptive.domain.AdaptiveConstants;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Map;

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

    public List<DiagnosticQuestion> getCuratedQuestions() {
        return List.of(
                // Probe 1: ARRAYS_STRINGS + TWO_POINTERS (Opposite End Convergence)
                new DiagnosticQuestion(
                        "DIAG_01",
                        "Pair With Target Sum",
                        "Given a sorted array of integers and a target integer T, determine if there exists any pair of numbers that add up to T. Print YES if a pair exists, otherwise print NO.\n\nInput format:\nFirst line contains integer N.\nSecond line contains N space-separated sorted integers.\nThird line contains target integer T.\n\nOutput format:\nPrint YES or NO.",
                        "ARRAYS_STRINGS",
                        "TWO_POINTERS",
                        List.of("BINARY_SEARCH"),
                        "EASY",
                        "Use two pointers (left at 0, right at N-1). Compute sum; if sum == target return YES, else advance left if sum < target, or decrement right if sum > target in O(N) time.",
                        """
import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) { System.out.println("NO"); return; }
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) if (sc.hasNextInt()) a[i] = sc.nextInt();
        int t = sc.hasNextInt() ? sc.nextInt() : 0;
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
                        Map.of("ARRAYS_STRINGS", 0.7, "BINARY_SEARCH", 0.3),
                        Map.of("TWO_POINTERS", 0.9, "INTERVALS_GREEDY", 0.1),
                        List.of("OFF_BY_ONE", "BOUNDARY_CONDITION", "STATE_CORRUPTION"),
                        List.of(
                                Map.of("input", "4\n2 7 11 15\n9", "expectedOutput", "YES", "sample", true),
                                Map.of("input", "5\n1 2 3 4 6\n10", "expectedOutput", "YES", "sample", true),
                                Map.of("input", "3\n1 2 5\n10", "expectedOutput", "NO", "sample", false)
                        )
                ),

                // Probe 2: ARRAYS_STRINGS + TWO_POINTERS (Read/Write Partitioning)
                new DiagnosticQuestion(
                        "DIAG_02",
                        "Move Zeroes to End",
                        "Given an array of integers, rearrange the elements in-place so all non-zero numbers appear before zeroes while maintaining relative order.\n\nInput format:\nFirst line contains integer N.\nSecond line contains N space-separated integers.\n\nOutput format:\nPrint the modified array with numbers separated by single spaces.",
                        "ARRAYS_STRINGS",
                        "TWO_POINTERS",
                        List.of("INTERVALS_GREEDY"),
                        "EASY",
                        "Use read and write indices. For each non-zero element at read, swap or copy to write index and advance write index in O(N) time and O(1) space.",
                        """
import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) if (sc.hasNextInt()) a[i] = sc.nextInt();
        int w = 0;
        for (int r = 0; r < n; r++) {
            if (a[r] != 0) {
                int tmp = a[w]; a[w] = a[r]; a[r] = tmp;
                w++;
            }
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) {
            if (i > 0) sb.append(' ');
            sb.append(a[i]);
        }
        System.out.println(sb.toString());
    }
}
""",
                        Map.of("ARRAYS_STRINGS", 0.8),
                        Map.of("TWO_POINTERS", 0.9),
                        List.of("OFF_BY_ONE", "BOUNDARY_CONDITION", "STATE_CORRUPTION"),
                        List.of(
                                Map.of("input", "5\n0 1 0 3 12", "expectedOutput", "1 3 12 0 0", "sample", true),
                                Map.of("input", "4\n0 0 0 1", "expectedOutput", "1 0 0 0", "sample", true),
                                Map.of("input", "3\n1 2 3", "expectedOutput", "1 2 3", "sample", false)
                        )
                ),

                // Probe 3: ARRAYS_STRINGS + SLIDING_WINDOW (Fixed Window Accumulation)
                new DiagnosticQuestion(
                        "DIAG_03",
                        "Maximum Sum Subarray of Size K",
                        "Given an array of N integers and positive integer K (1 <= K <= N), calculate the maximum sum of any contiguous subarray of size K.\n\nInput format:\nFirst line contains two integers N and K.\nSecond line contains N space-separated integers.\n\nOutput format:\nPrint a single integer representing the maximum sum.",
                        "ARRAYS_STRINGS",
                        "SLIDING_WINDOW",
                        List.of("INTERVALS_GREEDY"),
                        "EASY",
                        "Compute the sum of the first K elements, then slide the window by adding a[i] and subtracting a[i-K] in O(N) time.",
                        """
import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int k = sc.hasNextInt() ? sc.nextInt() : 1;
        int[] a = new int[n];
        for (int i = 0; i < n; i++) if (sc.hasNextInt()) a[i] = sc.nextInt();
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
                        Map.of("ARRAYS_STRINGS", 0.7, "HASH_TABLES", 0.3),
                        Map.of("SLIDING_WINDOW", 0.9, "TWO_POINTERS", 0.1),
                        List.of("OFF_BY_ONE", "BOUNDARY_CONDITION", "TIME_LIMIT_EXCEEDED"),
                        List.of(
                                Map.of("input", "7 3\n2 1 5 1 3 2 1", "expectedOutput", "9", "sample", true),
                                Map.of("input", "4 2\n2 3 4 1", "expectedOutput", "7", "sample", true),
                                Map.of("input", "5 1\n10 20 30 40 50", "expectedOutput", "50", "sample", false)
                        )
                ),

                // Probe 4: ARRAYS_STRINGS + BINARY_SEARCH (Logarithmic Halving)
                new DiagnosticQuestion(
                        "DIAG_04",
                        "Search Insert Position",
                        "Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order in O(log N) time.\n\nInput format:\nFirst line contains integer N.\nSecond line contains N space-separated sorted integers.\nThird line contains target integer.\n\nOutput format:\nPrint the 0-based index.",
                        "ARRAYS_STRINGS",
                        "BINARY_SEARCH",
                        List.of("TWO_POINTERS"),
                        "EASY",
                        "Binary search with low and high pointers. Update mid = low + (high-low)/2. Return low pointer upon loop exit in O(log N) time.",
                        """
import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) if (sc.hasNextInt()) a[i] = sc.nextInt();
        int t = sc.hasNextInt() ? sc.nextInt() : 0;
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
                        Map.of("ARRAYS_STRINGS", 0.6, "BINARY_SEARCH", 0.4),
                        Map.of("BINARY_SEARCH", 0.9),
                        List.of("OFF_BY_ONE", "BOUNDARY_CONDITION", "TIME_LIMIT_EXCEEDED"),
                        List.of(
                                Map.of("input", "4\n1 3 5 6\n5", "expectedOutput", "2", "sample", true),
                                Map.of("input", "4\n1 3 5 6\n2", "expectedOutput", "1", "sample", true),
                                Map.of("input", "4\n1 3 5 6\n7", "expectedOutput", "4", "sample", false)
                        )
                ),

                // Probe 5: STACKS_QUEUES + MONOTONIC_QUEUE_STACK (LIFO State Matching)
                new DiagnosticQuestion(
                        "DIAG_05",
                        "Valid Parentheses Sequence",
                        "Given a string containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. Open brackets must be closed by the same type of brackets in the correct order.\n\nInput format:\nA single string of brackets.\n\nOutput format:\nPrint true if valid, otherwise false.",
                        "STACKS_QUEUES",
                        "MONOTONIC_QUEUE_STACK",
                        List.of("ARRAYS_STRINGS"),
                        "EASY",
                        "Push opening brackets to stack. When closing bracket is encountered, check stack underflow and matching pair at stack top in O(N) time.",
                        """
import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNext()) { System.out.println("true"); return; }
        String s = sc.next();
        Deque<Character> st = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '{' || c == '[') st.push(c);
            else {
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
                        Map.of("STACKS_QUEUES", 0.8, "ARRAYS_STRINGS", 0.2),
                        Map.of("MONOTONIC_QUEUE_STACK", 0.9),
                        List.of("BOUNDARY_CONDITION", "NULL_EMPTY_COLLECTION", "STATE_CORRUPTION"),
                        List.of(
                                Map.of("input", "()[]{}", "expectedOutput", "true", "sample", true),
                                Map.of("input", "(]", "expectedOutput", "false", "sample", true),
                                Map.of("input", "([{}])", "expectedOutput", "true", "sample", false)
                        )
                )
        );
    }
}
