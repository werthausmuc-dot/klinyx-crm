const store = require("../lib/store");
const { requireAuth } = require("../lib/auth");
const { sendJson, readJsonBody } = require("../lib/http-utils");
const notify = require("../lib/notify");

const STATUSES = ["scheduled", "done", "cancelled"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---- Крок 4: повторювані завдання ----
// No server-side cron (Render's free plan sleeps the app, so a scheduled
// job would just never fire). Instead, occurrences are generated lazily —
// every GET /api/jobs "catches up" any series to a rolling horizon. A job
// becomes a recurrence "anchor" the moment it has a truthy `recurrence`
// field; every job it generates shares its `seriesId` (defaulting to the
// anchor's own id) but is a perfectly ordinary job otherwise — editable,
// reassignable, deletable individually without touching the rest of the
// series. Deleting the anchor, or clearing its `recurrence`, stops future
// generation but leaves already-generated occurrences in place.
const RECUR_FREQS = ["weekly", "biweekly", "monthly"];
const RECUR_HORIZON_DAYS = 60;

function pad2(n) { return n < 10 ? "0" + n : "" + n; }
function parseDateUTC(s) {
    const p = s.split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2]));
}
function fmtDateUTC(d) { return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate()); }
function addDays(dateStr, days) {
    const d = parseDateUTC(dateStr);
    d.setUTCDate(d.getUTCDate() + days);
    return fmtDateUTC(d);
}
function addMonthsClamped(dateStr, months) {
    const p = dateStr.split("-").map(Number);
    const idx = (p[1] - 1) + months;
    const targetYear = p[0] + Math.floor(idx / 12);
    const targetMonth = ((idx % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    return targetYear + "-" + pad2(targetMonth + 1) + "-" + pad2(Math.min(p[2], lastDay));
}
function stepDate(dateStr, freq) {
    if (freq === "weekly") return addDays(dateStr, 7);
    if (freq === "biweekly") return addDays(dateStr, 14);
    if (freq === "monthly") return addMonthsClamped(dateStr, 1);
    return null;
}

async function ensureRecurringInstances() {
    const jobs = await store.list("jobs");
    const horizon = addDays(fmtDateUTC(new Date()), RECUR_HORIZON_DAYS);
    const anchors = jobs.filter((j) => j.recurrence && RECUR_FREQS.includes(j.recurrence.freq));

  for (const anchor of anchors) {
        let seriesId = anchor.seriesId;
        if (!seriesId) {
                seriesId = anchor.id;
                await store.update("jobs", anchor.id, { seriesId });
        }

      const seriesDates = jobs.filter((j) => (j.seriesId || j.id) === seriesId).map((j) => j.date);
        const lastDate = seriesDates.slice().sort().pop() || anchor.date;
        let nextDate = stepDate(lastDate, anchor.recurrence.freq);

      while (nextDate && nextDate <= horizon && (!anchor.recurrence.until || nextDate <= anchor.recurrence.until)) {
              if (seriesDates.indexOf(nextDate) === -1) {
                        const created = await store.create("jobs", {
                                    clientId: anchor.clientId,
                                    date: nextDate,
                                    time: anchor.time || "",
                                    service: anchor.service || "",
                                    address: anchor.address || "",
                                    price: anchor.price != null ? anchor.price : null,
                                    status: "scheduled",
                                    notes: anchor.notes || "",
                                    assignedTo: anchor.assignedTo || null,
                                    paid: false,
                                    recurrence: null,
                                    seriesId,
                                    createdBy: anchor.createdBy
                        });
                        seriesDates.push(created.date);
                        // Deliberately no notify.onJobCreated here — generating up to two
                // months of occurrences at once would otherwise spam Telegram.
              }
              nextDate = stepDate(nextDate, anchor.recurrence.freq);
      }
  }
}

function clean(body, existing) {
    const data = {};
    if (typeof body.clientId === "string") data.clientId = body.clientId;
    if (typeof body.date === "string" && DATE_RE.test(body.date)) data.date = body.date;
    if (typeof body.time === "string") data.time = body.time.trim();
    if (typeof body.service === "string") data.service = body.service.trim();
    if (typeof body.address === "string") data.address = body.address.trim();
    if (body.price === null || body.price === "") data.price = null;
    else if (typeof body.price === "number") data.price = body.price;
    else if (typeof body.price === "string" && body.price.trim() !== "" && !Number.isNaN(Number(body.price))) data.price = Number(body.price);
    if (typeof body.notes === "string") data.notes = body.notes.trim();
    if (STATUSES.includes(body.status)) data.status = body.status;
    if (!existing && !data.status) data.status = "scheduled";
    if (typeof body.assignedTo === "string" || body.assignedTo === null) data.assignedTo = body.assignedTo || null;
    if (typeof body.paid === "boolean") data.paid = body.paid;
    if (!existing && data.paid === undefined) data.paid = false;
    if (body.recurrence === null) {
          data.recurrence = null;
    } else if (body.recurrence && typeof body.recurrence === "object" && RECUR_FREQS.includes(body.recurrence.freq)) {
          data.recurrence = {
                  freq: body.recurrence.freq,
                  until: typeof body.recurrence.until === "string" && DATE_RE.test(body.recurrence.until) ? body.recurrence.until : null
          };
    }
    return data;
}

module.exports = function registerJobRoutes(router) {
    router.get("/api/jobs", async (req, res) => {
          if (!requireAuth(req, res)) return;
          await ensureRecurringInstances();
          sendJson(res, 200, await store.list("jobs"));
    });

    router.post("/api/jobs", async (req, res) => {
          if (!requireAuth(req, res)) return;
          const body = await readJsonBody(req);
          const data = clean(body, null);
          if (!data.clientId) return sendJson(res, 400, { error: "invalid_input", message: "Оберіть клієнта." });
          if (!(await store.get("clients", data.clientId))) return sendJson(res, 400, { error: "invalid_input", message: "Клієнта не знайдено." });
          if (!data.date) return sendJson(res, 400, { error: "invalid_input", message: "Вкажіть дату у форматі РРРР-ММ-ДД." });
          data.createdBy = req.user.id;
          const created = await store.create("jobs", data);
          sendJson(res, 201, created);
          notify.onJobCreated(created, req.user);
    });

    router.patch("/api/jobs/:id", async (req, res, params) => {
          if (!requireAuth(req, res)) return;
          const existing = await store.get("jobs", params.id);
          if (!existing) return sendJson(res, 404, { error: "not_found" });
          const body = await readJsonBody(req);
          const patch = clean(body, existing);
          if (patch.clientId && !(await store.get("clients", patch.clientId))) {
                  return sendJson(res, 400, { error: "invalid_input", message: "Клієнта не знайдено." });
          }
          const updated = await store.update("jobs", params.id, patch);
          sendJson(res, 200, updated);
          if ("assignedTo" in patch) notify.onJobAssigned(updated, existing.assignedTo || null);
    });

    router.delete("/api/jobs/:id", async (req, res, params) => {
          if (!requireAuth(req, res)) return;
          const existing = await store.get("jobs", params.id);
          if (!existing) return sendJson(res, 404, { error: "not_found" });
          await store.remove("jobs", params.id);
          sendJson(res, 200, { ok: true });
    });
};
