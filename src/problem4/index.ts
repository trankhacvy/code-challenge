// Problem 4: Three ways to sum to n (TypeScript)
// sum_to_n(n) returns 1 + 2 + 3 + ... + n
//
// | Approach | Technique         | Time | Space | Trade-off                                    |
// |----------|-------------------|------|-------|----------------------------------------------|
// | A        | Gauss formula     | O(1) | O(1)  | Best performance; assumes no integer overflow |
// | B        | Iterative loop    | O(n) | O(1)  | Simple, no recursion depth limit              |
// | C        | Recursion         | O(n) | O(n)  | Elegant but limited by call stack for large n |

function sum_to_n_a(n: number): number {
  return n * (n + 1) / 2;
}

function sum_to_n_b(n: number): number {
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += i;
  }
  return sum;
}

function sum_to_n_c(n: number): number {
  if (n <= 0) return 0;
  return n + sum_to_n_c(n - 1);
}

// Quick verification
console.log(sum_to_n_a(5)); // 15
console.log(sum_to_n_b(5)); // 15
console.log(sum_to_n_c(5)); // 15
