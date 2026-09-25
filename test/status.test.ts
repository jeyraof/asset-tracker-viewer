import { describe, expect, it } from "vitest";
import { parseRunDetails } from "../src/db/status";
import { formatDurationMs, formatKst } from "../src/lib/format";
import { statusPage } from "../src/views/status";

describe("formatKst", () => {
  it("shifts a stored UTC timestamp to KST", () => {
    expect(formatKst("2026-09-24 22:01:20")).toBe("2026-09-25 07:01");
  });

  it("handles missing values", () => {
    expect(formatKst(null)).toBe("-");
  });
});

describe("formatDurationMs", () => {
  it("formats milliseconds, seconds, and minutes", () => {
    expect(formatDurationMs(500)).toBe("500ms");
    expect(formatDurationMs(3494)).toBe("3.5s");
    expect(formatDurationMs(11041)).toBe("11.0s");
    expect(formatDurationMs(65000)).toBe("1m 5s");
    expect(formatDurationMs(null)).toBe("-");
  });
});

describe("parseRunDetails", () => {
  it("extracts duration and error count", () => {
    expect(parseRunDetails('{"durationMs":11041,"errors":[1,2]}')).toEqual({ durationMs: 11041, errorCount: 2 });
  });

  it("handles null and invalid JSON", () => {
    expect(parseRunDetails(null)).toEqual({ durationMs: null, errorCount: 0 });
    expect(parseRunDetails("not json")).toEqual({ durationMs: null, errorCount: 0 });
  });
});

describe("statusPage", () => {
  it("renders runs, fx fetches, and errors", () => {
    const page = statusPage({
      runs: [
        { runId: "r1", provider: null, source: "cron", status: "success", startedAt: "2026-09-24 22:01:20", finishedAt: "2026-09-24 22:01:31", durationMs: 11041, errorCount: 0 },
        { runId: "r2", provider: "toss", source: "http", status: "failed", startedAt: "2026-09-24 21:00:00", finishedAt: null, durationMs: null, errorCount: 3 },
      ],
      errors: [
        { provider: "kiwoom", market: "KRX", symbol: "005930", scope: "quotes", code: "500", message: "boom", createdAt: "2026-09-24 21:00:00" },
      ],
      fxFetches: [
        { provider: "koreaexim", source: "koreaexim-deal-bas-r", fetchedAt: "2026-09-24 21:00:00", date: "2026-09-24", rate: 1299 },
      ],
      fx: { base: "USD", quote: "KRW", date: "2026-09-24", rate: 1299 },
    }).value;

    expect(page).toContain("수집 현황");
    expect(page).toContain("전체");
    expect(page).toContain("토스증권");
    expect(page).toContain("실패");
    expect(page).toContain("11.0s");
    expect(page).toContain("수출입은행");
    expect(page).toContain("₩1,299");
    expect(page).toContain("boom");
    expect(page).toContain('<a class="nav-button" href="/status">상태</a>');
    expect(page).toContain('<a class="nav-fx" href="/fx">USD/KRW');
  });

  it("shows empty states", () => {
    const page = statusPage({ runs: [], errors: [], fxFetches: [], fx: null }).value;
    expect(page).toContain("수집 기록이 없습니다.");
    expect(page).toContain("환율 수집 기록이 없습니다.");
    expect(page).toContain("오류 없음");
  });
});
