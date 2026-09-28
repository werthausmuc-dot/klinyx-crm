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
        // Dates the user explicitly deleted a generated occurrence for — see
        // the DELETE route below. Without this, deleting the most recent
        // occurrence would just make it look like the "next" date to
        // generate again, and it would reappear on the very next GET.
        const excluded = Array.isArray(anchor.recurrence.excluded) ? anchor.recurrence.excluded : [];
        const lastDate = seriesDates.slice().sort().pop() || anchor.date;
        let nextDate = stepDate(lastDate, anchor.recurrence.freq);

      while (nextDate && nextDate <= horizon && (!anchor.recurrence.until || nextDate <= anchor.recurrence.until)) {
              if (seriesDates.indexOf(nextDate) === -1 && excluded.indexOf(nextDate) === -1) {
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

// ---- auto-invoice on completion ----
// The moment a job's status is "done", its price should show up as money
// owed: we create an unpaid invoice for the client automatically so nobody
// has to remember to raise one by hand.
function invoiceNoteForJob(job) {
  const parts = [];
  if (job.service) parts.push(job.service);
  if (job.address) parts.push(job.address);
  return parts.join(", ");
}

async function createInvoiceForJob(job, amount, createdBy) {
  const today = fmtDateUTC(new Date());
  return store.create("invoices", {
    clientId: job.clientId,
    amount,
    issueDate: today,
    dueDate: today,
    status: "unpaid",
    note: invoiceNoteForJob(job),
    jobId: job.id,
    createdBy: createdBy || job.createdBy || null
  });
}

// Called right after a job is created/updated. Only fires when the job
// actually has a positive price (an invoice for €0 would just get
// rejected by the invoices API anyway), no invoice already references it
// (that second check is what makes this safe to call on every single save
// of an already-done job, not just the moment it first becomes done), and
// the job isn't flagged noAutoInvoice — see the DELETE /api/invoices/:id
// route for why that flag exists.
// Returns the created invoice, or null if nothing was created.
async function maybeAutoInvoiceForDoneJob(job) {
  if (!job || job.status !== "done" || job.noAutoInvoice) return null;
  const price = Number(job.price);
  if (!price || price <= 0) return null;
  const invoices = await store.list("invoices");
  if (invoices.some((inv) => inv.jobId === job.id)) return null;
  return createInvoiceForJob(job, price, job.createdBy);
}

// Catch-up pass, run on every GET /api/jobs (same lazy-generation pattern
// as ensureRecurringInstances — no server-side cron on Render's free
// plan). Covers jobs that were marked "done" before this feature existed,
// or through any path that doesn't go through the PATCH handler below, so
// they don't sit forever showing "рахунок не виставлено" until somebody
// happens to re-save them. Skips jobs flagged noAutoInvoice — otherwise
// deleting an auto-created invoice would just have this catch-up silently
// recreate it the moment the page reloads the job list.
async function ensureInvoicesForDoneJobs(jobs) {
  const candidates = jobs.filter((j) => j.status === "done" && !j.noAutoInvoice && Number(j.price) > 0);
  if (!candidates.length) return;
  const invoices = await store.list("invoices");
  const invoiced = new Set(invoices.map((i) => i.jobId).filter(Boolean));
  for (const job of candidates) {
    if (invoiced.has(job.id)) continue;
    await createInvoiceForJob(job, Number(job.price), job.createdBy);
    invoiced.add(job.id);
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
    if (STATUSES.includes(body.status)) {
        data.status = body.status;
        // Leaving the "cancelled" status behind clears any decline reason it
        // carried, unless the caller is explicitly setting a new one in the
        // same request (e.g. re-declining with a different reason).
        if (body.status !== "cancelled" && body.cancelReason === undefined) data.cancelReason = "";
    }
    if (!existing && !data.status) data.status = "scheduled";
    if (typeof body.cancelReason === "string") data.cancelReason = body.cancelReason.trim();
    if (typeof body.assignedTo === "string" || body.assignedTo === null) data.assignedTo = body.assignedTo || null;
    if (typeof body.paid === "boolean") data.paid = body.paid;
    if (!existing && data.paid === undefined) data.paid = false;
    if (body.recurrence === null) {
          data.recurrence = null;
    } else if (body.recurrence && typeof body.recurrence === "object" && RECUR_FREQS.includes(body.recurrence.freq)) {
          // The client only ever sends {freq, until} — it doesn't know about
          // `excluded` (dates whose occurrence was individually deleted), so
          // carry that list over from the existing record or it would be
          // wiped out, and deleted occurrences would come back to life, on
          // every single save of the anchor job.
          const prevExcluded = existing && existing.recurrence && Array.isArray(existing.recurrence.excluded) ? existing.recurrence.excluded : [];
          data.recurrence = {
                  freq: body.recurrence.freq,
                  until: typeof body.recurrence.until === "string" && DATE_RE.test(body.recurrence.until) ? body.recurrence.until : null,
                  excluded: prevExcluded
          };
    }
    return data;
}

module.exports = function registerJobRoutes(router) {
    router.get("/api/jobs", async (req, res) => {
          if (!requireAuth(req, res)) return;
          await ensureRecurringInstances();
          const jobs = await store.list("jobs");
          await ensureInvoicesForDoneJobs(jobs);
          sendJson(res, 200, jobs);
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
          const autoInvoice = await maybeAutoInvoiceForDoneJob(created);
          sendJson(res, 201, Object.assign({}, created, { autoInvoiceCreated: !!autoInvoice }));
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
          const autoInvoice = await maybeAutoInvoiceForDoneJob(updated);
          sendJson(res, 200, Object.assign({}, updated, { autoInvoiceCreated: !!autoInvoice }));
          if ("assignedTo" in patch) notify.onJobAssigned(updated, existing.assignedTo || null);
    });

    router.delete("/api/jobs/:id", async (req, res, params) => {
          if (!requireAuth(req, res)) return;
          const existing = await store.get("jobs", params.id);
          if (!existing) return sendJson(res, 404, { error: "not_found" });
          // Deleting one occurrence of a recurring series: if we don't record
          // which date was removed, the lazy catch-up generator in
          // ensureRecurringInstances() can mistake the now-later "last date"
          // gap for one it still needs to fill, and silently recreate the
          // very job that was just deleted. Deleting the anchor itself needs
          // no such bookkeeping — with the anchor gone, nothing generates
          // more occurrences for this series at all.
          if (existing.seriesId && existing.seriesId !== existing.id) {
                const anchor = await store.get("jobs", existing.seriesId);
                if (anchor && anchor.recurrence) {
                      const excluded = Array.isArray(anchor.recurrence.excluded) ? anchor.recurrence.excluded.slice() : [];
                      if (excluded.indexOf(existing.date) === -1) {
                            excluded.push(existing.date);
                            await store.update("jobs", anchor.id, { recurrence: Object.assign({}, anchor.recurrence, { excluded }) });
                      }
                }
          }
          await store.remove("jobs", params.id);
          sendJson(res, 200, { ok: true });
    });

    // Quick one-click invoice creation for a job the automatic flow hasn't
    // billed yet — e.g. a done job that had no price at the time, or one
    // completed before auto-invoicing existed. Uses the job's own price
    // unless the caller supplies an amount (for jobs with no price set).
    router.post("/api/jobs/:id/invoice", async (req, res, params) => {
          if (!requireAuth(req, res)) return;
          const job = await store.get("jobs", params.id);
          if (!job) return sendJson(res, 404, { error: "not_found" });
          const invoices = await store.list("invoices");
          if (invoices.some((inv) => inv.jobId === job.id)) {
                return sendJson(res, 400, { error: "invalid_input", message: "Рахунок для цього завдання вже виставлено." });
          }
          const body = await readJsonBody(req);
          let amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
          if (!amount || amount <= 0) amount = Number(job.price);
          if (!amount || amount <= 0) return sendJson(res, 400, { error: "invalid_input", message: "Вкажіть суму рахунку." });
          const invoice = await createInvoiceForJob(job, amount, req.user.id);
          // An explicit "issue it now" click overrides any earlier deletion
          // of this job's invoice, so the automatic flow can pick it back up
          // normally if this one is ever deleted too.
          if (job.noAutoInvoice) await store.update("jobs", job.id, { noAutoInvoice: false });
          sendJson(res, 201, invoice);
    });
};
