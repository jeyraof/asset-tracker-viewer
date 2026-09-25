import { describe, expect, it } from "vitest";
import { parseRunDetails } from "../src/db/status";
import { formatDurationMs, formatKst } from "../src/lib/format";
import { statusPage } from "../src/views/status";

const EMPTY_COUNTS = { accounts: 0, holdings: 0, trades: 0, instruments: 0, quotes: 0, rates: 0 };

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
  it("extracts duration, errors, providers, and counts", () => {
    const json = JSON.stringify({
      durationMs: 11041,
      errors: [1, 2],
      accounts: [
        { provider: "kiwoom", holdings: 2, trades: 10 },
        { provider: "toss", holdings: 0, trades: 0 },
      ],
      quotes: [{ provider: "kiwoom", instruments: 2, quotes: 10 }],
    });
    expect(parseRunDetails(json)).toEqual({
      durationMs: 11041,
      errorCount: 2,
      providers: ["kiwoom", "toss"],
      counts: { accounts: 2, holdings: 2, trades: 10, instruments: 2, quotes: 10, rates: 0 },
    });
  });

  it("parses fx runs", () => {
    const parsed = parseRunDetails(JSON.stringify({ durationMs: 5675, errors: [], rates: [{ source: "koreaexim" }] }));
    expect(parsed.counts.rates).toBe(1);
    expect(parsed.providers).toEqual([]);
  });

  it("handles null and invalid JSON", () => {
    expect(parseRunDetails(null)).toEqual({ durationMs: null, errorCount: 0, providers: [], counts: EMPTY_COUNTS });
    expect(parseRunDetails("not json")).toEqual({ durationMs: null, errorCount: 0, providers: [], counts: EMPTY_COUNTS });
  });
});

describe("statusPage", () => {
  it("renders runs with task, real providers, counts, and errors", () => {
    const page = statusPage({
      runs: [
        { runId: "r1", provider: null, source: "cron", task: "sync", status: "success", startedAt: "2026-09-24 22:01:20", finishedAt: "2026-09-24 22:01:31", durationMs: 11041, errorCount: 0, providers: ["kiwoom", "toss"], counts: { accounts: 3, holdings: 2, trades: 10, instruments: 2, quotes: 10, rates: 0 } },
        { runId: "r2", provider: "koreaexim", source: "http", task: "fx", status: "success", startedAt: "2026-09-25 04:30:28", finishedAt: null, durationMs: 5675, errorCount: 0, providers: [], counts: { ...EMPTY_COUNTS, rates: 1 } },
        { runId: "r3", provider: "toss", source: "http", task: "sync", status: "failed", startedAt: "2026-09-24 21:00:00", finishedAt: null, durationMs: null, errorCount: 3, providers: ["toss"], counts: EMPTY_COUNTS },
      ],
      errors: [
        { provider: "kiwoom", market: "KRX", symbol: "005930", scope: "quotes", code: "500", message: "boom", createdAt: "2026-09-24 21:00:00" },
      ],
      fx: { base: "USD", quote: "KRW", date: "2026-09-24", rate: 1299 },
    }).value;

    expect(page).toContain("수집 현황");
    expect(page).toContain("동기화");
    expect(page).toContain("환율");
    expect(page).toContain("키움증권, 토스증권");
    expect(page).toContain("계좌 3");
    expect(page).toContain("보유 2");
    expect(page).toContain("체결 10");
    expect(page).toContain("시세 10");
    expect(page).toContain("수출입은행");
    expect(page).toContain("환율 1건");
    expect(page).toContain("실패");
    expect(page).toContain("11.0s");
    expect(page).toContain("boom");
    expect(page).not.toContain("환율 수집");
    expect(page).toContain('<a class="nav-button" href="/status">상태</a>');
    expect(page).toContain('<a class="nav-button nav-fx" href="/fx">USD/KRW');
  });

  it("shows empty states", () => {
    const page = statusPage({ runs: [], errors: [], fx: null }).value;
    expect(page).toContain("수집 기록이 없습니다.");
    expect(page).toContain("오류 없음");
  });
});
