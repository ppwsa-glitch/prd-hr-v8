# UI tests (Chromium) for Phase 3a: directory, CRUD, archive/restore, 360° profile, role scoping. python3 tests/ui.py
import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765"; res = []
def check(n, c, i=""): res.append(c); print(("  PASS  " if c else "  FAIL  ") + n + ((" " + str(i)) if i and not c else ""))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={"width": 1280, "height": 900}).new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "ERR_NAME_NOT_RESOLVED" not in m.text else None)
    pg.goto(BASE + "/index.html"); pg.evaluate("indexedDB.deleteDatabase('prdhr-v8')"); pg.reload()
    pg.wait_for_selector("#ld"); check("empty state offers demo load (no fake data)", "មិនទាន់មានទិន្នន័យ" in pg.inner_text("#v"))
    pg.click("#ld"); pg.wait_for_selector("tbody tr[data-id]", timeout=60000)
    check("directory shows 262 people", "262 នាក់" in pg.inner_text("#v")); check("25 rows per page", pg.locator("tbody tr[data-id]").count() == 25)
    pg.click("#nx"); pg.wait_for_function("document.body.innerText.includes('ទំព័រ 2')"); check("pagination works", "ទំព័រ 2 / 11" in pg.inner_text("#v"))
    pg.select_option("#fg", "ស្រី"); pg.wait_for_function("document.body.innerText.includes('28 នាក់')"); check("gender filter = 28 female (matches source)", True)
    pg.select_option("#fg", ""); pg.wait_for_function("document.body.innerText.includes('262 នាក់')")
    pg.select_option("#so", "age"); pg.wait_for_timeout(300); ages = [int(x) for x in pg.eval_on_selector_all("tbody tr td:nth-child(6)", "e=>e.map(x=>x.innerText)") if x.strip().isdigit()] if False else pg.eval_on_selector_all("tbody tr td:nth-child(6)", "e=>e.map(x=>parseInt(x.innerText)).filter(Number.isFinite)")
    check("sort by age ascending", ages == sorted(ages) and len(ages) > 5, ages[:8])
    pg.select_option("#so", "employee_id"); pg.fill("#q", "PPWSA-0604"); pg.press("#q", "Enter"); pg.wait_for_function("document.body.innerText.includes('1 នាក់')"); check("search by Employee ID", pg.locator("tbody tr[data-id]").count() == 1)
    with pg.expect_download() as d: pg.click("#ex")
    check("export CSV downloads", d.value.suggested_filename == "employees.csv")
    # add
    pg.fill("#q", ""); pg.press("#q", "Enter"); pg.wait_for_function("document.body.innerText.includes('262 នាក់')")
    pg.click("#ad"); pg.fill("[name=employee_id]", "bad"); pg.fill("[name=name_km]", "តេស្ត មួយ"); pg.click("#sv"); check("invalid ID rejected with message", "ទម្រង់ ID" in pg.inner_text("#fe"))
    pg.fill("[name=employee_id]", "ppwsa- 1888"); pg.fill("[name=dob]", "1995-05-05"); pg.select_option("[name=gender]", "ស្រី"); pg.click("#sv"); pg.wait_for_function("document.body.innerText.includes('263 នាក់')"); check("add employee (ID normalised)", True)
    pg.click("#ad"); pg.fill("[name=employee_id]", "PPWSA-1888"); pg.fill("[name=name_km]", "ស្ទួន"); pg.click("#sv"); pg.wait_for_function("document.querySelector('#fe').innerText.length>0"); check("duplicate ID rejected", "មានរួចហើយ" in pg.inner_text("#fe")); pg.click("dialog .x")
    # profile
    pg.fill("#q", "PPWSA-1888"); pg.press("#q", "Enter"); pg.wait_for_selector("tr[data-id]"); pg.click("tr[data-id]"); pg.wait_for_selector(".tabs")
    t = pg.inner_text("#tb"); check("profile personal tab: calculated age labelled", "Calculated" in t and "31" in t, t[:80])
    pg.click("[data-t=employment]"); check("employment tab: retirement rule labelled as default, not official", "មិនមែនច្បាប់ផ្លូវការ" in pg.inner_text("#tb"))
    pg.click("[data-t=perf]"); check("performance tab: No Data for new employee (no fake values)", "No Data" in pg.inner_text("#tb"))
    pg.click("[data-t=activity]"); pg.wait_for_selector("#tb th:has-text('សកម្មភាព')"); check("activity tab records the create", "create" in pg.inner_text("#tb"))
    pg.click("#ed"); pg.fill("[name=position]", "អ្នកបច្ចេកទេស"); pg.click("#sv"); pg.wait_for_function("document.body.innerText.includes('អ្នកបច្ចេកទេស')"); pg.click("[data-t=activity]"); pg.wait_for_selector("#tb th:has-text('សកម្មភាព')"); check("edit saved + audited", "update" in pg.inner_text("#tb"))
    pg.once("dialog", lambda d: d.accept("តេស្ត")); pg.click("#ar"); pg.wait_for_selector("#rs"); check("archive keeps the record (Restore offered)", True); pg.click("#rs"); pg.wait_for_selector("#ar")
    # real imported person profile + role masking
    pid = pg.evaluate("(async()=>{const p=await PRDHR.createProvider();return (await p.list('performance_records',{limit:1}))[0].employee_id})()"); pg.goto(BASE + "/index.html#e/" + pid); pg.wait_for_selector(".tabs"); pg.click("[data-t=perf]"); pg.wait_for_selector("#tb th:has-text('Q1')"); check("imported performance rows render (Q1-Q4, imported total, calculated avg)", "Calculated" in pg.inner_text("#tb") and "20" in pg.inner_text("#tb"), pg.inner_text("#tb")[:120])
    pg.click("[data-t=personal]"); check("HR sees phone", "••••" not in pg.inner_text("#tb"))
    pg.goto(BASE + "/index.html#emp"); pg.reload(); pg.wait_for_selector("tbody tr[data-id]"); pg.select_option("#role", "employee"); pg.wait_for_function("document.querySelectorAll('tbody tr[data-id]').length===1", timeout=8000)
    check("employee role: directory shows only 1 person", pg.locator("tbody tr[data-id]").count() == 1)
    pg.click("tr[data-id]"); pg.wait_for_selector(".tabs"); check("employee role: PII masked, no edit/archive buttons", "••••" in pg.inner_text("#tb") and pg.locator("#ed,#ar").count() == 0)
    pg.click("[data-t=activity]"); check("employee role cannot see activity log", "មានតែ HR" in pg.inner_text("#tb"))
    pg.set_viewport_size({"width": 390, "height": 800}); pg.goto(BASE + "/index.html#emp"); pg.wait_for_timeout(500)
    check("mobile: no horizontal page overflow", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 2"), pg.evaluate("document.documentElement.scrollWidth"))
    check("no JavaScript errors", not errs, errs[:3]); b.close()
print(f"\n{sum(res)}/{len(res)} UI checks passed"); sys.exit(0 if all(res) else 1)
