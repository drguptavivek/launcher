import cors from "cors";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import {
  createOverrideResponse,
  createPolicyResponse,
  createTelemetryResponse,
  loginResponse,
  whoamiResponse
} from "./mockData.js";

const fetchOrigins = () => {
  const list = process.env.CORS_ALLOWED_ORIGINS;
  if (!list) {
    return "*";
  }
  return list.split(",").map((origin) => origin.trim()).filter(Boolean);
};

const addRequestId = (req, res, next) => {
  const requestId = req.headers["x-request-id"] || uuidv4();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
};

const isMockMode = () => process.env.MOCK_API === "true";
const blockIfDisabled = (req, res, next) => {
  if (!isMockMode() && req.path.startsWith("/api/v1")) {
    return res.status(503).json({
      ok: false,
      error: {
        code: "mock_disabled",
        message: "Enable MOCK_API=true to activate mock endpoints",
        request_id: req.requestId
      }
    });
  }
  next();
};

export function createApp() {
  const app = express();
  app.use(cors({ origin: fetchOrigins() }));
  app.use(express.json());
  app.use(addRequestId);
  app.use(blockIfDisabled);

  const router = express.Router();

  router.post("/auth/login", (_, res) => {
    res.status(200).json(structuredClone(loginResponse));
  });

  router.get("/policy/:deviceId", (req, res) => {
    res.status(200).json(createPolicyResponse(req.params.deviceId));
  });

  router.post("/telemetry", (req, res) => {
    const response = createTelemetryResponse(req.body.events);
    res.status(200).json(response);
  });

  router.get("/auth/whoami", (_, res) => {
    res.status(200).json(whoamiResponse);
  });

  router.post("/supervisor/override/login", (_, res) => {
    res.status(200).json(createOverrideResponse());
  });

  app.use("/api/v1", router);

  app.get("/health", (_, res) =>
    res.status(200).json({ ok: true, ts: new Date().toISOString(), mock: isMockMode() })
  );

  app.use("*", (req, res) => {
    res.status(404).json({
      ok: false,
      error: {
        code: "not_found",
        message: "Endpoint not available",
        request_id: req.requestId
      }
    });
  });

  return app;
}

export default createApp;
