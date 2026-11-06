# Browser tests (Playwright/Chromium): IndexedDB persistence + V7 baseline regression. Run: python3 tests/browser.py [base_url]
import sys, json
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765"
res = []
def check(name, cond, info=""):
    res.append((name, bool(cond))); print(("  PASS  " if cond else "  FAIL  ") + name + (("   " + str(info)) if info and not cond else ""))
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 1280, "height": 900}); pg = ctx.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    # ---------- harness: IndexedDB ----------
    pg.goto(BASE + "/phase2-harness.html"); pg.wait_for_function("window.__h && window.__h.p")
    check("harness uses the IndexedDB provider", pg.evaluate("__h.p.kind") == "indexeddb")
    pg.evaluate("indexedDB.deleteDatabase(PRDHR.DB_NAME)"); pg.reload(); pg.wait_for_function("window.__h && window.__h.p")
    pg.click("#demo"); pg.wait_for_function("document.querySelector('#commit') && !document.querySelector('#commit').disabled")
    check("bundled demo previews 262 valid / 0 errors", pg.evaluate("JSON.stringify([!!document.body.innerText.match(/registryValid:\\s*262/), !!document.body.innerText.match(/errors:\\s*0/)])") == "[true,true]")
    check("preview wrote nothing to IndexedDB", pg.evaluate("__h.p.count('employees')") == 0)
    pg.click("#commit"); pg.wait_for_function("document.querySelector('#log').innerText.includes('commit:')", timeout=90000)
    n_att = pg.evaluate("__h.p.count('attendance_records')"); n_perf = pg.evaluate("__h.p.count('performance_records')")
    check("commit stored 262 employees + performance + attendance", n_att > 4000 and n_perf > 1000, (n_att, n_perf))
    before = pg.evaluate("__h.p.get('employees','PPWSA-0604')")
    pg.reload(); pg.wait_for_function("window.__h && window.__h.p")
    check("data survives page refresh (persistence)", pg.evaluate("__h.p.count('employees')") == 262 and pg.evaluate("__h.p.get('employees','PPWSA-0604')") == before)
    check("audit log survived refresh and is non-empty", pg.evaluate("__h.p.count('audit_logs')") >= 263)
    # append-only enforced by the real IndexedDB provider
    r = pg.evaluate("""async()=>{const a=(await __h.p.list('audit_logs'))[0];const out={};
       for (const [k,f] of Object.entries({put:()=>__h.p.put('audit_logs',a),del:()=>__h.p.delete('audit_logs',a.id),clr:()=>__h.p.clear('audit_logs')})) { try{await f();out[k]='allowed'}catch(e){out[k]=/APPEND_ONLY/.test(e.message)?'blocked':e.message} } return out}""")
    check("IndexedDB audit_logs is append-only", r == {"put": "blocked", "del": "blocked", "clr": "blocked"}, r)
    # unique primary key + transaction rollback on a bad batch
    r = pg.evaluate("""async()=>{const n0=await __h.p.count('employees');try{await __h.p.putMany('employees',[{employee_id:'PPWSA-1111',name_km:'x'},{name_km:'no key'}])}catch(e){}return [n0, await __h.p.count('employees')]}""")
    check("putMany is all-or-nothing (bad record rolls back the batch)", r[0] == r[1], r)
    # RBAC through the page
    pg.select_option("#role", "employee"); pg.wait_for_timeout(300)
    check("employee role sees only their own row, PII masked", pg.evaluate("document.querySelector('#emps').innerText") .count("PPWSA-") == 1 and "••••" in pg.inner_text("#emps"))
    pg.select_option("#role", "hr_admin"); pg.wait_for_timeout(300)
    check("HR role sees unmasked phone numbers", "••••" not in pg.inner_text("#emps"))
    # import re-run must not overwrite without the confirm checkbox
    pg.click("#demo"); pg.wait_for_function("!document.querySelector('#commit').disabled"); pg.click("#commit"); pg.wait_for_function("document.querySelector('#log').innerText.includes('skippedExisting')")
    check("re-import without confirmation overwrites nothing", '"created":0,"updated":0,"skippedExisting":262' in pg.inner_text("#log"))
    check("no JavaScript errors in harness", not errs, errs[:3])
    # ---------- V7 baseline (legacy file untouched) ----------
    e7 = []; v7 = ctx.new_page(); v7.on("pageerror", lambda e: e7.append(str(e))); v7.on("console", lambda m: e7.append(m.text) if m.type == "error" and "ERR_NAME_NOT_RESOLVED" not in m.text else None)
    v7.goto(BASE + "/legacy/PRD-HR-Glassy-Dashboard-V7-Premium.html"); v7.wait_for_selector("#nav button")
    roles = v7.evaluate("[...document.querySelectorAll('#role option')].map(o=>o.textContent)")
    check("V7: 3 roles present", roles == ["អ្នកគ្រប់គ្រង HR", "ប្រធានផ្នែក", "និយោជិត"], roles)
    exp = {"អ្នកគ្រប់គ្រង HR": 10, "ប្រធានផ្នែក": 9, "និយោជិត": 5}; seen = {}
    for role, n in exp.items():
        v7.select_option("#role", role); v7.wait_for_timeout(150); seen[role] = v7.evaluate("document.querySelectorAll('#nav button').length")
    check("V7: navigation per role matches R[role].v (10/9/5)", seen == exp, seen)
    v7.select_option("#role", "អ្នកគ្រប់គ្រង HR"); ok_all = True; bad = []
    for k in ["home", "staff", "attend", "leave", "remind", "train", "perf", "org", "docs", "access"]:
        v7.click(f'#nav button[data-k="{k}"]'); v7.wait_for_timeout(120)
        if len(v7.inner_text("#v").strip()) < 20: ok_all = False; bad.append(k)
    check("V7: all 10 views render content for HR admin", ok_all, bad)
    v7.click('#nav button[data-k="home"]'); t = v7.inner_text("#v")
    check("V7 baseline recorded: home KPI shows hard-coded 90% attendance & 10 employees", "90%" in t and "10" in t)
    check("V7: no JavaScript errors across all views", not e7, e7[:3])
    b.close()
passed = sum(1 for _, c in res if c); print(f"\n{passed}/{len(res)} browser checks passed"); sys.exit(0 if passed == len(res) else 1)
