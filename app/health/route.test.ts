import { GET } from "./route";

describe("GET /health", () => {
  it("returns a healthy response body", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("string");
  });
});
