// Phase 2 test suite (Node). Usage: node tests/run.js [path-to-real-workbook-fixture.json]
// The real-workbook tests only run when a local fixture is supplied (real data is never shipped in this project).
const N = require("./load.js"), fs = require("fs"), path = require("path");
const real = process.argv[2], results = []; let cur = "";
const t = (name, fn) => results.push({ name, fn });
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || "eq") + ": expected " + JSON.stringify(b) + " got " + JSON.stringify(a)); };
const ok = (c, m) => { if (!c) throw new Error("assert: " + (m || "")); };
const rejects = async (fn, re, m) => { try { await fn(); } catch (e) { if (re.test(String(e.message))) return; throw new Error((m || "") + " wrong error: " + e.message); } throw new Error((m || "") + " did not throw"); };
const HR = { id: "u-hr", role: "hr_admin" };
async function fresh() { const p = await N.createProvider({ memory: true }), a = new N.AuditService(p); return { p, a, imp: new N.ImportService(p, a), emp: new N.EmployeeService(p, a) }; }
const demoWb = () => JSON.parse(fs.readFileSync(path.join(__dirname, "../seed/demo-workbook.json"), "utf8"));
N.clock.freeze("2026-11-05");

/* ---- core ---- */
t("calc: age/service/retirement use clock, rule is configurable", async () => {
  eq(N.calc.age("1985-07-23"), 41, "age"); eq(N.calc.age("2000-11-06"), 25, "birthday tomorrow");
  eq(N.dates.iso(N.calc.retirementDate({ dob: "1985-07-23" })), "2045-07-23", "default 60");
  const c = N.defaultConfig(); c.retirement.ageYears = 55; eq(N.dates.iso(N.calc.retirementDate({ dob: "1985-07-23" }, c)), "2040-07-23", "configured 55");
  eq(N.calc.yearsOfService({ start_framework: "2007-02-13", start_contract: "2006-01-01" }), 20, "earliest start");
  eq(N.calc.workingDays("2026-11-04", "2026-11-09"), 4, "Wed..Mon skipping weekend"); ok(N.defaultConfig().retirement.official === false);
});
t("employment type is derived from ID prefix (C/T) as confirmed", async () => { eq(N.calc.employmentType("PPWSA-0604"), "permanent"); eq(N.calc.employmentType("PPWSA-C-1482"), "contract"); eq(N.calc.employmentType("PPWSA-T-1002"), "trial"); eq(N.calc.employmentType("bad"), null); });
t("ID normalisation + validation", async () => {
  const v = N.validators; eq(v.normalizeId("PPWSA- 9999"), "PPWSA-9999"); eq(v.normalizeId(" ppwsa-c-1234 "), "PPWSA-C-1234"); eq(v.normalizeId("PPWSA-c-\u200b0801"), "PPWSA-C-0801");
  ok(v.isValidId("PPWSA-0604") && v.isValidId("PPWSA-C-1482") && v.isValidId("PPWSA-T-1002")); ok(!v.isValidId("PPWSA-C-") && !v.isValidId("") && !v.isValidId("PPWSA-12"));
  ok(v.score(0) && v.score(100) && !v.score(101) && !v.score(-1) && !v.score("90")); ok(v.dateRange("2026-01-01", "2026-01-01") && !v.dateRange("2026-02-01", "2026-01-01"));
});
t("province/text normalisation merges variants", async () => { eq(N.text.province("ភ្នំពេញ"), "រាជធានីភ្នំពេញ"); eq(N.text.province("រាជធានីភ្នំពេញ\u200b"), "រាជធានីភ្នំពេញ"); eq(N.text.province("កណ្ដាល"), "កណ្តាល"); });

/* ---- data layer ---- */
t("schema has all 25 spec entities", async () => eq(N.schema.length, 25));
t("provider contract: put/get/list(index)/count/clear", async () => {
  const { p } = await fresh(); await p.put("employees", { employee_id: "PPWSA-0001", gender: "ប្រុស" }); await p.put("employees", { employee_id: "PPWSA-0002", gender: "ស្រី" });
  eq((await p.get("employees", "PPWSA-0002")).gender, "ស្រី"); eq((await p.list("employees", { index: "gender", value: "ស្រី" })).length, 1); eq(await p.count("employees"), 2);
  eq(await p.get("employees", "nope"), null); await rejects(() => p.put("employees", { gender: "x" }), /KEY_MISSING/); await p.clear("employees"); eq(await p.count("employees"), 0);
});
t("audit_logs is append-only (no overwrite / delete / clear)", async () => {
  const { p, a } = await fresh(); const r = await a.log({ user: HR, action: "x", module: "m" });
  await rejects(() => p.put("audit_logs", r), /APPEND_ONLY/, "overwrite"); await rejects(() => p.delete("audit_logs", r.id), /APPEND_ONLY/, "delete"); await rejects(() => p.clear("audit_logs"), /APPEND_ONLY/, "clear");
  await rejects(() => p.append("employees", { employee_id: "x" }), /NOT_APPEND_STORE/); eq(await p.count("audit_logs"), 1);
});

/* ---- import: synthetic demo workbook (always available) ---- */
t("demo workbook: 262 valid employees, 0 errors, all 3 sheet kinds detected", async () => {
  const { imp } = await fresh(), wb = demoWb(), d = imp.detect(wb); eq(d.map((x) => x.kind), ["unknown", "registry", "flat-performance", "flat-attendance"]);
  const pv = await imp.preview(wb); eq(pv.summary.registryValid, 262); eq(pv.summary.errors, 0, JSON.stringify(pv.issues.slice(0, 3))); eq(pv.summary.orphanIds, 0); ok(pv.summary.performance > 1000 && pv.summary.attendance > 4000, JSON.stringify(pv.summary));
});
t("preview writes NOTHING", async () => { const { p, imp } = await fresh(); await imp.preview(demoWb()); for (const s of ["employees", "performance_records", "attendance_records", "audit_logs", "import_jobs"]) eq(await p.count(s), 0, s); });
t("commit: creates, audits, stores job; original file flagged unmodified", async () => {
  const { p, imp } = await fresh(), pv = await imp.preview(demoWb()), r = await imp.commit(HR, pv, { mode: "full" });
  eq(r.result.employees.created, 262); eq(await p.count("employees"), 262); const job = await p.get("import_jobs", r.jobId); eq(job.original_file_modified, false); eq(job.status, "committed");
  ok((await p.count("audit_logs")) >= 263, "audit rows"); ok((await p.count("performance_records")) > 1000); ok((await p.count("awards")) > 0);
});
t("re-import never overwrites without confirmation", async () => {
  const { p, imp } = await fresh(); await imp.commit(HR, await imp.preview(demoWb()), { mode: "full" });
  const e0 = await p.get("employees", "PPWSA-0604"); await p.put("employees", Object.assign({}, e0, { position: "HR-EDITED" }));
  const r = await imp.commit(HR, await imp.preview(demoWb()), { mode: "full" }); eq(r.result.employees.created, 0); eq(r.result.employees.updated, 0); eq(r.result.employees.skippedExisting, 262);
  eq((await p.get("employees", "PPWSA-0604")).position, "HR-EDITED", "edit preserved");
  const r2 = await imp.commit(HR, await imp.preview(demoWb()), { mode: "full", confirmOverwrite: true }); eq(r2.result.employees.updated, 1); ok((await p.get("employees", "PPWSA-0604")).position !== "HR-EDITED");
  const au = (await p.list("audit_logs")).find((x) => x.action === "import-update"); ok(au && au.previous.position === "HR-EDITED", "audit has previous value");
});
t("update-only mode: skips records not already in the database", async () => {
  const { p, imp } = await fresh(); const r = await imp.commit(HR, await imp.preview(demoWb()), { mode: "update-only", confirmOverwrite: true }); eq(r.result.employees.created, 0); eq(r.result.employees.skippedNotInDb, 262); eq(await p.count("employees"), 0);
});
t("PII is redacted in audit trail and masked in import preview sample", async () => {
  const { p, imp } = await fresh(); await imp.commit(HR, await imp.preview(demoWb()), {}); const e = await p.get("employees", "PPWSA-0604"); await p.put("employees", Object.assign({}, e, { phone: "0XX 000 000" }));
  await imp.commit(HR, await imp.preview(demoWb()), { confirmOverwrite: true }); const au = (await p.list("audit_logs")).filter((x) => x.action === "import-update"); ok(au.every((x) => !x.previous.phone || x.previous.phone === "***"));
  const pv = await imp.preview(demoWb()); ok(pv.sample.every((s) => !s.phone || s.phone === "••••"), "sample masked");
});
t("error list CSV is downloadable text with BOM and header", async () => { const { imp } = await fresh(); const w = demoWb(); w.sheets[1].rows[12][2] = "BAD-ID"; const pv = await imp.preview(w); const csv = imp.errorsToCSV(pv); ok(csv.startsWith("\ufeffSheet,Row,EmployeeID,Severity,Code,Message") && /ID_FORMAT/.test(csv)); });
t("HR resolutions: rename a duplicate ID or skip a row, then it imports", async () => {
  const { imp } = await fresh(), w = demoWb(), rows = w.sheets[1].rows; const idc = rows[0].indexOf("លេខកូដ (Employee ID)"); rows[20][idc] = rows[10][idc]; const dupRow = 21;
  const pv = await imp.preview(w); eq(pv.summary.registryBlocked, 2, "both duplicate rows blocked"); ok(pv.issues.some((i) => i.code === "ID_DUPLICATE"));
  const pv2 = await imp.preview(w, { resolutions: { [w.sheets[1].name + "|" + dupRow]: { employee_id: "PPWSA-1999" } } }); eq(pv2.summary.registryBlocked, 0); ok(!pv2.issues.some((i) => i.code === "ID_DUPLICATE"), "no duplicate error after HR renamed one"); const pv3 = await imp.preview(w, { resolutions: { [w.sheets[1].name + "|" + dupRow]: { skip: true } } }); eq(pv3.summary.registryValid, 261); ok(pv3.issues.some((i) => i.code === "SKIPPED_BY_HR"));
  ok(pv.issues.some((i) => i.code === "ID_AMBIGUOUS"), "records pointing at a duplicated ID are held, not guessed");
});
t("orphan IDs in performance/attendance are reported and NOT imported", async () => {
  const { p, imp } = await fresh(), w = demoWb(), pr = w.sheets[2].rows; pr[5][0] = "PPWSA-C-9876"; const pv = await imp.preview(w); eq(pv.summary.orphanIds, 1); ok(pv.issues.some((i) => i.code === "ORPHAN_ID"));
  await imp.commit(HR, pv, {}); eq((await p.list("performance_records", { index: "employee_id", value: "PPWSA-C-9876" })).length, 0);
});
t("invalid scores are rejected (not stored)", async () => { const { imp } = await fresh(), w = demoWb(), r = w.sheets[2].rows; const c = r[0].indexOf("2024_Q1"); r[3][c] = 140; const pv = await imp.preview(w); ok(pv.issues.some((i) => i.code === "SCORE_INVALID")); });
t("attendance: period must match weekday layout; missing cells are not absences", async () => {
  const { imp } = await fresh(), w = demoWb(), pv = await imp.preview(w); const att = pv.sheets.find((s) => s.kind === "flat-attendance"); eq(att.mapping.period, { year: 2024, month: 12, source: "sheet-name" });
  ok(pv.summary.attendance > 0); const w2 = demoWb(); w2.sheets[3].name = "វត្តមានមិនស្គាល់"; const pv2 = await imp.preview(w2); ok(pv2.issues.some((i) => i.code === "PERIOD_UNKNOWN"), "needs explicit period"); const pv3 = await imp.preview(w2, { attendancePeriod: { year: 2024, month: 12 } }); ok(pv3.summary.attendance > 0);
  ok(!(await imp.preview(demoWb())).issues.some((i) => i.code === "ABSENT")); // engine never creates 'absent' records from blanks
});

/* ---- employee service / RBAC ---- */
async function seeded() { const s = await fresh(); await s.imp.commit(HR, await s.imp.preview(demoWb()), {}); return s; }
t("employee CRUD: create validates, duplicate ID rejected, edit audited, archive/restore (never hard-delete)", async () => {
  const { p, emp } = await seeded(); const base = { employee_id: "PPWSA-1888", name_km: "តេស្ត មួយ", gender: "ស្រី", dob: "1995-05-05", education_level: "បរិញ្ញាបត្រ" };
  eq((await emp.create(HR, base)).ok, true); eq((await emp.create(HR, base)).errors[0].code, "ID_EXISTS"); eq((await emp.create(HR, { employee_id: "bad" , name_km: "x"})).errors[0].code, "ID_FORMAT");
  eq((await emp.create(HR, Object.assign({}, base, { employee_id: "PPWSA-1889", dob: "2099-01-01" }))).errors[0].code, "DOB_FUTURE");
  eq((await emp.update(HR, "PPWSA-1888", { position: "អ្នកបច្ចេកទេស", employee_id: "PPWSA-0000" })).ok, true); eq((await p.get("employees", "PPWSA-1888")).employee_id, "PPWSA-1888", "ID immutable");
  eq((await emp.archive(HR, "PPWSA-1888", "test")).ok, true); ok(await p.get("employees", "PPWSA-1888"), "record still exists"); eq((await emp.list(HR, { search: "PPWSA-1888" })).total, 0, "hidden"); eq((await emp.list(HR, { search: "PPWSA-1888", includeArchived: true })).total, 1);
  await emp.restore(HR, "PPWSA-1888"); eq((await emp.list(HR, { search: "PPWSA-1888" })).total, 1); const acts = (await p.list("audit_logs")).filter((x) => x.employee_id === "PPWSA-1888").map((x) => x.action).sort(); eq(acts, ["archive", "create", "restore", "update"]);
});
t("search (Khmer/English/ID), filter, sort by age, pagination", async () => {
  const { emp } = await seeded(), all = await emp.list(HR, { pageSize: 1000 }); eq(all.total, 262); const one = all.items[10];
  ok((await emp.list(HR, { search: one.name_km })).items.some((x) => x.employee_id === one.employee_id)); ok((await emp.list(HR, { search: one.name_en.toLowerCase() })).total >= 1); eq((await emp.list(HR, { search: one.employee_id })).items[0].employee_id, one.employee_id);
  eq((await emp.list(HR, { gender: "ស្រី", pageSize: 1000 })).total, 28); const pg = await emp.list(HR, { page: 3, pageSize: 25 }); eq(pg.items.length, 25);
  const asc = (await emp.list(HR, { sortBy: "age", pageSize: 1000 })).items.map((x) => x.calc.age); ok(asc.every((v, i) => i === 0 || v >= asc[i - 1]), "age ascending");
});
t("RBAC enforced in the service layer (not just hidden buttons)", async () => {
  const { emp } = await seeded(), all = (await emp.list(HR, { pageSize: 1000 })).items, me = all[3], sec = all.find((x) => x.section), headUser = { id: "h", role: "dept_head", section: sec.section }, selfUser = { id: "e", role: "employee", employee_id: me.employee_id };
  const hv = await emp.list(headUser, { pageSize: 1000 }); ok(hv.total > 0 && hv.total < 262 && hv.items.every((x) => x.section === sec.section), "dept head limited to section");
  eq((await emp.list(selfUser, { pageSize: 1000 })).total, 1); await rejects(() => emp.get(selfUser, all[4].employee_id), /FORBIDDEN/, "employee cannot read others"); await rejects(() => emp.update(headUser, sec.employee_id, { position: "x" }), /FORBIDDEN/, "head cannot edit"); await rejects(() => emp.create(selfUser, { employee_id: "PPWSA-1777", name_km: "x" }), /FORBIDDEN/); await rejects(() => emp.archive(headUser, sec.employee_id), /FORBIDDEN/);
  const raw = await emp.get(HR, me.employee_id), masked = await emp.get(selfUser, me.employee_id); ok(raw.phone && raw.phone !== "••••", "HR sees PII"); eq(masked.phone, "••••"); eq(masked.national_id_no, "••••"); eq(hv.items[0].phone, "••••", "head masked");
  await rejects(() => emp.audit.list(headUser), /FORBIDDEN/); await rejects(() => new N.ImportService(emp.p, emp.audit).commit(headUser, { _payload: {} }, {}), /FORBIDDEN/, "import needs permission");
});
t("calculated values are labelled and never stored in the record", async () => {
  const { p, emp } = await seeded(), e = (await emp.list(HR, { pageSize: 1 })).items[0]; eq(e.calc.origin, "calculated"); ok(/Default/.test(e.calc.retirement_rule)); const raw = await p.get("employees", e.employee_id); ok(!("calc" in raw) && !("age" in raw));
});

t("settings: only users with manageSettings can change rules; changes are audited; relatedAll is scoped", async () => {
  const { p, a, emp } = await seeded(); const st = new N.SettingsService(p, a), head = { id: "h", role: "dept_head", section: "x" };
  await rejects(() => st.set(head, "attendanceCodes", {}), /FORBIDDEN/); await st.set(HR, "attendanceCodes", { "ü": { category: "present" } }); eq((await st.get("attendanceCodes")).ü.category, "present"); eq((await st.get("nope", 7)), 7);
  ok((await p.list("audit_logs")).some((x) => x.action === "setting-change" && x.next && x.previous === null));
  const all = (await emp.list(HR, { pageSize: 1000 })).items, me = { id: "e", role: "employee", employee_id: all[5].employee_id }; const mine = await emp.relatedAll(me, "performance_records"); ok(mine.every((r) => r.employee_id === me.employee_id) && mine.length < (await emp.relatedAll(HR, "performance_records")).length);
});

async function wf() { const s = await seeded(), st = new N.SettingsService(s.p, s.a), all = (await s.emp.list(HR, { pageSize: 1000 })).items, me = all.find((e) => e.section), same = all.filter((e) => e.section === me.section);
  const users = { hr: HR, head: { id: "h", role: "dept_head", section: me.section }, otherHead: { id: "h2", role: "dept_head", section: "ផ្នែកផ្សេង" }, emp: { id: "e", role: "employee", employee_id: me.employee_id }, other: { id: "o", role: "employee", employee_id: all.find((e) => e.section !== me.section).employee_id } };
  return Object.assign(s, { st, me, users, leave: new N.LeaveService(s.p, s.a, s.emp, st), career: new N.CareerService(s.p, s.a, s.emp) }); }
t("leave: working days skip weekends+configured holidays; validation rules", async () => {
  const w = await wf(), u = w.users, mk = (o) => Object.assign({ employee_id: w.me.employee_id, type: "annual", from: "2026-12-07", to: "2026-12-11" }, o);
  const r = await w.leave.submit(u.emp, mk({})); eq(r.days, 5); eq((await w.leave.submit(u.emp, mk({ from: "2026-12-12", to: "2026-12-13" }))).errors[0].code, "NO_WORKING_DAYS"); eq((await w.leave.submit(u.emp, mk({ from: "2026-12-20", to: "2026-12-19" }))).errors[0].code, "DATE_RANGE");
  eq((await w.leave.submit(u.emp, mk({ from: "2026-12-09", to: "2026-12-10" }))).errors[0].code, "OVERLAP"); eq((await w.leave.submit(u.emp, mk({ type: "x", from: "2027-01-04", to: "2027-01-05" }))).errors[0].code, "TYPE");
  await w.st.set(HR, "publicHolidays", ["2027-01-05"]); eq((await w.leave.submit(u.emp, mk({ from: "2027-01-04", to: "2027-01-06" }))).days, 2, "holiday skipped");
  await rejects(() => w.leave.submit(u.emp, mk({ employee_id: w.users.other.employee_id, from: "2027-03-01", to: "2027-03-02" })), /FORBIDDEN/, "employee cannot file for others");
});
t("leave: quota is per type and configurable; pending counts against the balance", async () => {
  const w = await wf(), u = w.users, id = w.me.employee_id, mk = (o) => Object.assign({ employee_id: id, type: "annual", from: "2027-02-01", to: "2027-02-12" }, o);
  eq((await w.leave.submit(u.emp, mk({}))).days, 10); const b = (await w.leave.balance(u.emp, id, 2027)).annual; eq([b.entitlement, b.used, b.pending, b.remaining], [18, 0, 10, 8]);
  eq((await w.leave.submit(u.emp, mk({ from: "2027-03-01", to: "2027-03-12" }))).errors[0].code, "QUOTA_EXCEEDED"); eq((await w.leave.submit(u.emp, mk({ type: "sick", from: "2027-03-01", to: "2027-03-12" }))).ok, true, "sick has no quota assumed");
  await w.st.set(HR, "leaveQuotas", { sick: 3 }); eq((await w.leave.submit(u.emp, mk({ type: "sick", from: "2027-04-05", to: "2027-04-09" }))).errors[0].code, "QUOTA_EXCEEDED", "configured quota enforced"); eq((await w.leave.balance(u.emp, id, 2027)).annual.entitlement, 18, "other types unchanged");
});
t("leave workflow: Employee → Dept Head → HR; order, scope and notes enforced; fully audited", async () => {
  const w = await wf(), u = w.users, id = w.me.employee_id, r = await w.leave.submit(u.emp, { employee_id: id, type: "personal", from: "2027-05-03", to: "2027-05-04" });
  await rejects(() => w.leave.act(u.hr, r.id, "approve"), /FORBIDDEN/, "HR cannot skip the head stage"); await rejects(() => w.leave.act(u.otherHead, r.id, "approve"), /FORBIDDEN/, "other section's head"); await rejects(() => w.leave.act(u.emp, r.id, "approve"), /FORBIDDEN/, "employee cannot approve");
  eq((await w.leave.act(u.head, r.id, "approve")).status, "pending_hr"); await rejects(() => w.leave.act(u.head, r.id, "approve"), /FORBIDDEN/, "head cannot act at HR stage");
  eq((await w.leave.act(u.hr, r.id, "reject", "")).errors[0].code, "NOTE_REQUIRED"); eq((await w.leave.act(u.hr, r.id, "approve", "ok")).status, "approved"); eq((await w.leave.act(u.hr, r.id, "reject", "x")).errors[0].code, "FINAL");
  const rec = await w.p.get("leave_requests", r.id); eq(rec.history.map((h) => h.action), ["submit", "approve", "approve"]); eq((await w.leave.balance(u.emp, id, 2027)).personal.used, 2);
  const r2 = await w.leave.submit(u.emp, { employee_id: id, type: "mission", from: "2027-06-01", to: "2027-06-01" }); await w.leave.act(u.head, r2.id, "reject", "មិនចាំបាច់"); eq((await w.p.get("leave_requests", r2.id)).status, "rejected"); eq((await w.leave.balance(u.emp, id, 2027)).mission.pending, 0, "rejected frees the balance");
  ok((await w.p.list("audit_logs")).filter((x) => x.module === "leave").length === 5, "5 audited leave actions"); eq((await w.leave.list(u.other)).length, 0, "other employee sees none"); ok((await w.leave.list(u.head)).length >= 2); eq((await w.leave.list(u.otherHead)).length, 0);
});
t("career: pending/rejected promotions never change the profile; approval writes history and applies on the effective date", async () => {
  const w = await wf(), u = w.users, id = w.me.employee_id, before = (await w.p.get("employees", id)).position; N.clock.freeze("2026-11-05");
  const c = await w.career.create(u.hr, { employee_id: id, new_position: "ប្រធានក្រុមថ្មី", effective_date: "2027-01-01", decision_ref: "ល.ស.001" }); eq((await w.p.get("employees", id)).position, before, "draft does not change");
  await rejects(() => w.career.act(u.head, c.id, "approve"), /FORBIDDEN/); eq((await w.career.act(u.hr, c.id, "approve")).errors[0].code, "STATE", "must be submitted first"); await w.career.act(u.hr, c.id, "submit"); eq((await w.p.get("employees", id)).position, before, "submitted does not change");
  await w.career.act(u.hr, c.id, "approve"); eq((await w.p.get("employees", id)).position, before, "future effective date waits"); eq((await w.p.list("employment_history")).length, 1); eq(await w.career.applyDue(u.hr), 0);
  N.clock.freeze("2027-01-02"); eq(await w.career.applyDue(u.hr), 1); eq((await w.p.get("employees", id)).position, "ប្រធានក្រុមថ្មី"); eq(await w.career.applyDue(u.hr), 0, "idempotent");
  const tl = await w.career.timeline(u.hr, id); ok(tl.some((x) => x.kind === "promotion") && tl.every((x, i) => i === 0 || tl[i - 1].date <= x.date), "timeline chronological");
  const c2 = await w.career.create(u.hr, { employee_id: id, new_position: "X", effective_date: "2027-02-01" }); await w.career.act(u.hr, c2.id, "submit"); eq((await w.career.act(u.hr, c2.id, "reject", "")).errors[0].code, "NOTE_REQUIRED"); await w.career.act(u.hr, c2.id, "reject", "មិនអនុម័ត"); eq((await w.p.list("employment_history")).length, 1, "rejected leaves no history"); N.clock.freeze("2026-11-05");
});

/* ---- seeding + legacy adapter ---- */
t("V7 seed + adapter returns V7's P rows unchanged (same shape, IDs as keys)", async () => {
  const { p, a } = await fresh(), P = JSON.parse(fs.readFileSync(path.join(__dirname, "../seed/v7-employees.json"), "utf8")), s = new N.SeedService(p, a);
  eq((await s.seedV7(HR, P)).created, 10); eq((await s.seedV7(HR, P)).created, 0, "idempotent"); const rows = await N.legacy.rows(p, P.map((r) => r[0]));
  rows.forEach((r, i) => eq(r.map(String), P[i].map(String), "row " + i));
});

/* ---- real workbook (local only) ---- */
if (real) {
  const rw = () => N.fixture(real);
  t("REAL workbook: all 3 sheets detected; 'ធ្ន' sheet-name variant handled; 35 registry columns mapped", async () => {
    const { imp } = await fresh(), pv = await imp.preview(rw()); eq(pv.sheets.map((s) => s.kind), ["registry", "performance", "attendance"]); const m = pv.sheets[0].mapping; eq(Object.keys(m.fields).length, 35); eq(m.unmapped, []); eq(pv.sheets[1].mapping.blocks, ["2025/primary", "2023/primary", "2024/primary", "2025/alt"]);
  });
  t("REAL workbook: Phase-1 findings reproduced (dup ID, missing ID, orphans, sparse attendance, maternity text)", async () => {
    const { imp } = await fresh(), pv = await imp.preview(rw()), s = pv.summary, c = (code) => pv.issues.filter((i) => i.code === code).length;
    eq(s.registryRows, 263); eq(s.registryValid, 260); eq(s.registryBlocked, 3); eq(c("ID_DUPLICATE") >= 2, true); eq(c("ID_MISSING") >= 1, true); eq(c("ORPHAN_ID") + c("ID_AMBIGUOUS"), 54); console.log("        info: NAME_MISMATCH=" + c("NAME_MISMATCH") + " ID_AMBIGUOUS=" + c("ID_AMBIGUOUS")); eq(c("ATTENDANCE_SPARSE"), 1); ok(c("TOTAL_MISMATCH") > 0);
    eq(pv.issues.filter((i) => i.code === "SCORE_INVALID").length, 0, "maternity text is a status, not an invalid score");
  });
  t("REAL workbook: nothing is written until commit; commit imports exactly the valid rows", async () => {
    const { p, imp } = await fresh(), pv = await imp.preview(rw()); eq(await p.count("employees"), 0); const r = await imp.commit(HR, pv, {}); eq(r.result.employees.created, 260); eq(await p.count("employees"), 260);
    ok((await p.list("performance_records")).some((x) => x.status === "maternity_leave")); eq((await p.list("attendance_records")).every((x) => x.category === "unspecified"), true, "codes stay unspecified");
    const pr = await p.list("employees"); eq(pr.every((e) => !/ ?PPWSA-c-/.test(e.employee_id) && N.validators.isValidId(e.employee_id)), true);
  });
}

(async () => {
  let pass = 0; const fails = [];
  for (const r of results) { try { await r.fn(); pass++; console.log("  PASS  " + r.name); } catch (e) { fails.push(r.name); console.log("  FAIL  " + r.name + "\n        " + e.message); } }
  console.log(`\n${pass}/${results.length} passed` + (real ? " (incl. real-workbook tests)" : " (real-workbook tests skipped)")); process.exit(fails.length ? 1 : 0);
})();
