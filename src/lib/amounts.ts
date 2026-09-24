/** Account/snapshot fields needed to derive the viewer's amounts. */
export interface EvalDeposit {
  securitiesEvalAmount: number | null;
  depositTotal: number | null;
}

/** 평가금액: the securities evaluation only (cash excluded). */
export function evalAmount(account: EvalDeposit): number | null {
  return account.securitiesEvalAmount;
}

/** 순자산: 평가금액 + 예수금. Null only when both parts are missing. */
export function netAsset(account: EvalDeposit): number | null {
  if (account.securitiesEvalAmount == null && account.depositTotal == null) return null;
  return (account.securitiesEvalAmount ?? 0) + (account.depositTotal ?? 0);
}
