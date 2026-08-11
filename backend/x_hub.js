const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const app = express();

app.use(express.json());

// L6 — HERITAGE (DUY NHẤT ĐƯỢC PHÉP THÊM)
function logEvent(event, result) {
  const log = {
    ts: Date.now(),
    event,
    result
  };
  fs.appendFileSync("heritage.log", JSON.stringify(log) + "\n");
}

// L2 (Attestation)
function verifyEvent(event) {
  if (!event || !event.type) return false;
  const raw = JSON.stringify(event.data || "");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return hash.length > 0;
}

let STATE = "IDLE"; // L7 (State)

function updateState(event) {
  if (event.type === "payment_received" || event.type === "telegram_message") {
    STATE = "PROCESSING";
  } else if (event.type === "browser_probe") {
    STATE = "OBSERVING";
  }
  console.log("STATE:", STATE);
}

// L_C (Clone)
function spawnClone(type, event) {
  console.log("SPAWN:", type, "EVENT:", event.type);
  return {
    status: "clone_spawned",
    type,
    ts: Date.now()
  };
}

// L_B (Control)
app.post("/event", (req, res) => {
  const event = req.body;
  if (!verifyEvent(event)) return res.status(400).json({ error: "ATTESTATION_FAIL" });

  updateState(event);

  let result;
  switch (event.type) {
    case "payment_received":
      result = spawnClone("C6_payment_worker", event);
      break;
    case "browser_probe":
      result = spawnClone("C6_orchestration_worker", event);
      break;
    default:
      result = { status: "ignored" };
  }

  logEvent(event, result); // Trigger L6
  res.json(result);
});

// 4.2 TELEGRAM BRIDGE (KHÔNG TẠO SERVER MỚI)
app.post("/telegram", (req, res) => {
  const update = req.body;
  const event = {
    type: "telegram_message",
    data: update
  };

  if (!verifyEvent(event)) return res.sendStatus(400);

  updateState(event);
  const result = spawnClone("C1_bot_clone", event);
  logEvent(event, result); // Trigger L6

  res.sendStatus(200);
});

app.get("/state", (req, res) => {
  res.json({ state: STATE });
});

app.listen(5050, () => {
  console.log("X_HUB FULL ACTIVE 5050");
});
