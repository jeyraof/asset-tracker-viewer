import { describe, expect, it } from "vitest";
import { CLIENT_JS, STYLES } from "../src/assets";

describe("client assets", () => {
  it("serves syntactically valid client JavaScript", () => {
    expect(() => new Function(CLIENT_JS)).not.toThrow();
  });

  it("wires up tab swiping and its styles", () => {
    expect(CLIENT_JS).toContain("enhanceTabs();");
    expect(STYLES).toContain(".tabs-track.is-animating");
    expect(STYLES).toContain(".tab-pane.is-idle");
  });
});
