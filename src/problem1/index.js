// Problem 1: Three ways to sum to n
// sum_to_n(n) returns 1 + 2 + 3 + ... + n
//
// Summary:
// | Approach | Technique         | Time | Space | Trade-off                                    |
// |----------|-------------------|------|-------|----------------------------------------------|
// | A        | Gauss formula     | O(1) | O(1)  | Best performance; assumes no integer overflow |
// | B        | Iterative loop    | O(n) | O(1)  | Simple, no recursion depth limit              |
// | C        | Recursion         | O(n) | O(n)  | Elegant but limited by call stack for large n |

// A: Gauss formula — O(1) time, O(1) space
var sum_to_n_a = function(n) {
    return n * (n + 1) / 2;
};

// B: Iterative — O(n) time, O(1) space
var sum_to_n_b = function(n) {
    let sum = 0;
    for (let i = 1; i <= n; i++) {
        sum += i;
    }
    return sum;
};

// C: Recursive — O(n) time, O(n) space (call stack)
var sum_to_n_c = function(n) {
    if (n <= 0) return 0;
    return n + sum_to_n_c(n - 1);
};

// Quick verification
console.log(sum_to_n_a(5)); // 15
console.log(sum_to_n_b(5)); // 15
console.log(sum_to_n_c(5)); // 15
