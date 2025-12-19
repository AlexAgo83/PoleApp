import { getHealth } from "./health";

describe("getHealth", () => {
  it("returns an ok payload with timestamp and uptime", () => {
    const result = getHealth();

    expect(result.status).toBe("ok");
    expect(typeof result.timestamp).toBe("string");
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
