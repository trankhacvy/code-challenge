// Problem 3: Messy React — Issues & Refactored Version
//
// ISSUES FOUND (ordered by severity)
//
// ── Show-stoppers ───────────────────────────────────────────
//
// 1. BUG: Undeclared variable `lhsPriority`
//    Line: `if (lhsPriority > -99)`
//    Should be `balancePriority`, which is declared on the line above.
//    This causes a ReferenceError at runtime.
//
// 2. BUG: Filter logic is inverted
//    The filter returns `true` when `balance.amount <= 0`, meaning it
//    KEEPS zero/negative balances and REMOVES positive ones.
//    Should keep `balance.amount > 0`.
//
// 3. BUG: `formattedBalances` is computed but never used
//    `formattedBalances` maps `sortedBalances` to add `formatted`, but
//    then `rows` iterates over `sortedBalances` (not `formattedBalances`).
//    This means:
//    - `formattedBalances` is wasted computation
//    - `balance.formatted` in the `rows` map is undefined at runtime
//
// 4. BUG: Type mismatch in `rows` mapping
//    `rows` maps over `sortedBalances` (type `WalletBalance[]`) but
//    annotates the parameter as `FormattedWalletBalance`. The `formatted`
//    property doesn't exist on `WalletBalance`, so `balance.formatted`
//    is undefined.
//
// 5. BUG: `key={index}` — array index as React key
//    When the list is filtered/sorted, indices shift and React can't
//    correctly reconcile elements — causes stale UI and broken animations.
//
// 6. BUG: `key={balance.currency}` is ALSO not unique
//    The same currency can exist on multiple blockchains (e.g. USDC on
//    Ethereum + Arbitrum). React will throw duplicate key warnings and
//    have incorrect reconciliation. Key must be truly unique, e.g.
//    `${balance.blockchain}-${balance.currency}`.
//
// 7. BUG: `prices[balance.currency]` can be undefined → NaN
//    If the currency is missing from the prices map, the lookup returns
//    `undefined`, and `undefined * balance.amount` = NaN. WalletRow
//    receives NaN for usdValue and likely displays garbage.
//
// 8. BUG: No guard against hooks returning undefined/null
//    If `useWalletBalances()` returns undefined during loading,
//    calling `.filter()` on it throws a TypeError. Same risk for prices.
//
// ── Compile errors ──────────────────────────────────────────
//
// 9. Missing imports: `useWalletBalances`, `usePrices`, `WalletRow`,
//    `BoxProps`, and `classes` are all used but never imported.
//    The component won't compile as written.
//
// 10. TYPE ERROR: `blockchain` is missing from `WalletBalance`
//     The code accesses `balance.blockchain` but the `WalletBalance`
//     interface only defines `currency` and `amount`.
//
// 11. TYPE ISSUE: `getPriority(blockchain: any)`
//     Using `any` defeats TypeScript's purpose. Should use the
//     Blockchain union type derived from the priority map.
//
// ── Anti-patterns ───────────────────────────────────────────
//
// 12. `Props extends BoxProps {}` is empty
//     An empty interface extending another provides no value.
//
// 13. `React.FC<Props>` is generally discouraged in modern React
//     It adds implicit `children` typing and has other minor drawbacks.
//     Prefer explicit props typing on the function parameter.
//
// 14. Spreading `...props` onto `<div>` while also accepting children
//     If a parent passes `children` via props, it silently conflicts
//     with the component's own children.
//
// ── Inefficiencies ──────────────────────────────────────────
//
// 15. `useMemo` depends on `prices` but doesn't use it
//     `prices` is in the dependency array but never referenced in the
//     computation. Causes unnecessary recalculations when prices update.
//
// 16. `getPriority` defined inside the component
//     Pure function with no dependency on state/props — gets recreated
//     every render. Should be outside the component. Also missing from
//     the useMemo dependency array (ESLint exhaustive-deps would flag).
//
// 17. `formattedBalances` not memoized
//     Even if it were used correctly, it recalculates on every render
//     since it's a plain `.map()` outside of `useMemo`.
//
// 18. Sort comparator calls `getPriority` twice per comparison
//     Minor, but avoidable by pre-computing priorities.
//
// ── Minor / style ───────────────────────────────────────────
//
// 19. Sort returns `undefined` for equal priorities
//     When priorities are equal, the comparator has no return statement.
//
// 20. `balance.amount.toFixed()` — no argument
//     Defaults to 0 decimal places (`1.5` → `"2"`). For crypto amounts
//     this loses precision. Consider `Intl.NumberFormat` for display.
//
// 21. `children` destructured from props but never used
//
// 22. `classes.row` referenced but never defined
//     No `useStyles()` or CSS module import is visible.
//
// 23. Magic number `-99` used as sentinel in multiple places
//     Should be a named constant for clarity.
//
// 24. No loading/error states
//     If hooks are still fetching, the component renders an empty list
//     with no feedback to the user.
//
// REFACTORED VERSION

import React, { useMemo } from "react";
// These would be imported from their respective modules:
// import { useWalletBalances, usePrices } from "./hooks";
// import { WalletRow } from "./components/WalletRow";
// import type { BoxProps } from "./ui";
// import styles from "./WalletPage.module.css";

// Single source of truth for blockchain priorities.
// Adding a new blockchain here automatically updates the type.
const BLOCKCHAIN_PRIORITY = {
  Osmosis: 100,
  Ethereum: 50,
  Arbitrum: 30,
  Zilliqa: 20,
  Neo: 20,
} as const;

type Blockchain = keyof typeof BLOCKCHAIN_PRIORITY;

const UNKNOWN_PRIORITY = -99;

function getPriority(blockchain: Blockchain): number {
  return BLOCKCHAIN_PRIORITY[blockchain] ?? UNKNOWN_PRIORITY;
}

interface WalletBalance {
  currency: string;
  amount: number;
  blockchain: Blockchain;
}

interface FormattedWalletBalance extends WalletBalance {
  formatted: string;
}

// Explicit props typing instead of React.FC
interface WalletPageProps extends BoxProps {}

const WalletPage = ({ ...rest }: WalletPageProps) => {
  const balances: WalletBalance[] = useWalletBalances();
  const prices: Record<string, number> = usePrices();

  const formattedBalances = useMemo((): FormattedWalletBalance[] => {
    if (!balances) return [];

    return balances
      .filter((balance) => {
        const priority = getPriority(balance.blockchain);
        return priority > UNKNOWN_PRIORITY && balance.amount > 0;
      })
      .sort((a, b) => getPriority(b.blockchain) - getPriority(a.blockchain))
      .map((balance) => ({
        ...balance,
        formatted: new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        }).format(balance.amount),
      }));
  }, [balances]);

  return (
    <div {...rest}>
      {formattedBalances.map((balance) => {
        const price = prices?.[balance.currency] ?? 0;
        return (
          <WalletRow
            className={styles.row}
            key={`${balance.blockchain}-${balance.currency}`}
            amount={balance.amount}
            usdValue={price * balance.amount}
            formattedAmount={balance.formatted}
          />
        );
      })}
    </div>
  );
};

export default WalletPage;
