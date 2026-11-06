# UI tests Phase 3b: organization chart + attendance. python3 tests/ui2.py (needs http server on 8765)
import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765"; res = []
def check(n, c, i=""): res.append(c); print(("  PASS  " if c else "  FAIL  ") + n + ((" " + str(i)) if i and not c else ""))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={"width": 1280, "height": 900}).new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "ERR_NAME_NOT_RESOLVED" not in m.text else None)
    pg.goto(BASE + "/index.html"); pg.evaluate("indexedDB.deleteDatabase('prdhr-v8')"); pg.reload(); pg.wait_for_selector("#ld"); pg.click("#ld"); pg.wait_for_selector("tbody tr[data-id]", timeout=60000)
    pg.click("[data-k=org]"); pg.wait_for_selector("details"); t = pg.inner_text("#v")
    check("org: root shows all 262 with M/F split (234/28)", "262 នាក់" in t and "ប្រុស 234" in t and "ស្រី 28" in t)
    check("org: states data covers one department only", "តែនាយកដ្ឋាននេះ" in t)
    n_off = pg.locator("#v > .two > .glass:first-child > details").count(); check("org: office branches exist and sum to 262", n_off > 1 and sum(int(x) for x in pg.eval_on_selector_all("#v > .two > .glass:first-child > details > summary .chip", "e=>e.map(x=>x.innerText.match(/(\\d+) នាក់/)[1])")) == 262, n_off)
    pg.click("#ea"); check("org: expand all", pg.eval_on_selector_all("details", "e=>e.every(d=>d.open)")); pg.click("#ca"); check("org: collapse all", pg.eval_on_selector_all("details", "e=>e.every(d=>!d.open)"))
    pg.fill("#oq", "PPWSA-0604"); pg.press("#oq", "Enter"); pg.wait_for_function("document.querySelectorAll('details a').length===1"); check("org: search narrows to one employee", True)
    pg.click("details a"); pg.wait_for_selector(".tabs"); check("org: employee link opens the profile", "PPWSA-0604" in pg.inner_text("#v"))
    # attendance
    pg.click("a[href='#emp']"); pg.click("[data-k=att]"); pg.wait_for_selector("#am"); t = pg.inner_text("#v")
    check("attendance: month from data (2024-12)", pg.input_value("#am") == "2024-12"); check("attendance: rate is 'No Data' while codes are unspecified", "No Data" in t and "ត្រូវកំណត់អត្ថន័យកូដ" in t)
    check("attendance: blank cells are not counted as absence", "មិនមែនអវត្តមាន" in t); check("attendance: codes shown as unspecified", "មិនទាន់កំណត់" in t)
    check("attendance: calendar has 31 day cells", pg.locator("#v .two > .glass:nth-child(2) > div:last-child > div").count() >= 31 + 7)
    for c, v in (("ü", "present"), ("N", "absent")): pg.select_option(f".cc[data-c='{c}']", v)
    pg.click("#sc"); pg.wait_for_function("!document.querySelector('#v').innerText.includes('ត្រូវកំណត់អត្ថន័យកូដ')"); t = pg.inner_text("#v")
    import re; m = re.search(r"អត្រាវត្តមានប្រចាំខែ\s*([\d.]+)%", t); check("attendance: rate computed only after HR maps codes", bool(m), t[:300])
    pg.reload(); pg.wait_for_selector("tbody tr[data-id], #am"); pg.goto(BASE + "/index.html#att"); pg.reload(); pg.wait_for_selector("#am"); check("attendance: code settings persist after refresh", re.search(r"អត្រាវត្តមានប្រចាំខែ\s*([\d.]+)%", pg.inner_text("#v")) is not None)
    pg.evaluate("PRDHR.ui.A.p.count('audit_logs')"); n = pg.evaluate("(async()=>(await PRDHR.ui.A.p.list('audit_logs')).filter(x=>x.action==='setting-change').length)()"); check("attendance: setting change audited", n >= 1, n)
    pg.set_viewport_size({"width": 390, "height": 800}); pg.wait_for_timeout(300); check("mobile: attendance has no horizontal overflow", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 2"), pg.evaluate("document.documentElement.scrollWidth"))
    pg.goto(BASE + "/index.html#org"); pg.reload(); pg.wait_for_selector("details"); check("mobile: org has no horizontal overflow", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 2"), pg.evaluate("document.documentElement.scrollWidth"))
    pg.set_viewport_size({"width": 1280, "height": 900}); pg.goto(BASE + "/index.html#att"); pg.reload(); pg.wait_for_selector("#am"); pg.select_option("#role", "employee"); pg.wait_for_function("!document.querySelector('#sc')", timeout=8000)
    check("employee role: no code-config panel, sees only own attendance rows", pg.locator("#sc").count() == 0 and pg.locator("#ae option").count() <= 1, pg.locator("#ae option").count())
    check("no JavaScript errors", not errs, errs[:3]); b.close()
print(f"\n{sum(res)}/{len(res)} UI checks passed"); sys.exit(0 if all(res) else 1)
