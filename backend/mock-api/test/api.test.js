import { afterAll, beforeAll, describe, expect, it } from "vitest";
import createApp from "../src/app.js";

process.env.MOCK_API = "true";

const app = createApp();
let server;
let baseUrl;

const jsonHeaders = { "content-type": "application/json" };

describe("SurveyLauncher mock API", () => {
  beforeAll(async () => {
    await new Promise((resolve, reject) => {
      server = app.listen({ port: 0, host: "127.0.0.1" }, () => {
        const address = server.address();
        if (!address || typeof address.port !== "number") {
          reject(new Error("Failed to determine mock server port"));
          return;
        }
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it("serves login response with tokens", async () => {
    console.log("baseUrl during login test", baseUrl);
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      body: JSON.stringify({}),
      headers: jsonHeaders
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.session?.session_id).toBe("sess-mock-001");
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("returns policy payload scoped to device", async () => {
    const res = await fetch(`${baseUrl}/api/v1/policy/dev-custom`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.mock_jws).toBe(true);
    expect(body.payload.device_id).toBe("dev-custom");
    expect(body.payload.session?.allowed_windows?.length).toBeGreaterThan(0);
  });

  it("accepts telemetry batches and caps at 50", async () => {
    const events = Array.from({ length: 60 }, (_, idx) => ({
      t: "gps",
      ts: "2025-11-12T10:03:00Z",
      idx
    }));
    const res = await fetch(`${baseUrl}/api/v1/telemetry`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ events })
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.accepted).toBe(50);
    expect(body.dropped).toBe(10);
  });

  it("exposes whoami snapshot", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/whoami`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.user?.code).toBe("u001");
    expect(body.session?.session_id).toBe("sess-mock-001");
  });

  it("returns override token", async () => {
    const res = await fetch(`${baseUrl}/api/v1/supervisor/override/login`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ pin: "000000" })
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.token).toBe("override-mock");
    expect(new Date(body.override_until).getTime()).toBeGreaterThan(Date.now());
  });

  it("health endpoint exists", async () => {
    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
