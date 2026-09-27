/** Account/snapshot fields needed to derive the viewer's amounts. */
export interface EvalDeposit {
  securitiesEvalAmount: number | null;
  depositTotal: number | null;
  settlementDeposit: number | null;
}

/** 평가금액: the securities evaluation only (cash excluded). */
export function evalAmount(account: EvalDeposit): number | null {
  return account.securitiesEvalAmount;
}

/**
 * 예수금: cash consistent with same-day holdings. Equity settlement is T+2, so
 * prefer the D+2 deposit and fall back to the D+0 deposit when unavailable
 * (gold/US/Toss never report a D+2 figure).
 */
export function deposit(account: EvalDeposit): number | null {
  return account.settlementDeposit ?? account.depositTotal;
}

/** 순자산: 평가금액 + 예수금. Null only when both parts are missing. */
export function netAsset(account: EvalDeposit): number | null {
  const cash = deposit(account);
  if (account.securitiesEvalAmount == null && cash == null) return null;
  return (account.securitiesEvalAmount ?? 0) + (cash ?? 0);
}
