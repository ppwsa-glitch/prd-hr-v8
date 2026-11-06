# UI tests Phase 3b-2: leave workflow + career. python3 tests/ui3.py (needs http server on 8765)
import sys, re
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765"; res = []
def check(n, c, i=""): res.append(c); print(("  PASS  " if c else "  FAIL  ") + n + ((" " + str(i)) if i and not c else ""))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={"width": 1280, "height": 900}).new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "ERR_NAME_NOT_RESOLVED" not in m.text else None)
    pg.on("dialog", lambda d: d.accept("តេស្ត" if "មូលហេតុ" in d.message else ""))
    pg.goto(BASE + "/index.html"); pg.evaluate("indexedDB.deleteDatabase('prdhr-v8')"); pg.reload(); pg.wait_for_selector("#ld"); pg.click("#ld"); pg.wait_for_selector("tbody tr[data-id]", timeout=60000)
    def role(r, view): pg.select_option("#role", r); pg.wait_for_timeout(400); pg.evaluate(f"location.hash='#{view}'"); pg.wait_for_timeout(100); pg.evaluate("PRDHR.ui.views['%s']()" % view); pg.wait_for_timeout(500)
    role("employee", "leave"); check("employee: leave form visible, quota panel hidden", pg.locator("#ls").count() == 1 and pg.locator("#qs").count() == 0)
    check("balance cards for all 5 V7 leave types", pg.locator(".grid .pan").count() == 5)
    pg.fill("#lf", "2027-02-01"); pg.fill("#ll", "2027-02-12"); pg.dispatch_event("#ll", "change"); pg.wait_for_function("document.querySelector('#ld2').innerText.includes('10')"); check("live working-day calculation (10)", True)
    pg.click("#ls"); pg.wait_for_selector("text=រង់ចាំប្រធានផ្នែក"); check("request submitted → waiting for department head", True)
    check("employee cannot approve (no action buttons)", pg.locator("button[data-a]").count() == 0)
    pg.fill("#lf", "2027-02-03"); pg.fill("#ll", "2027-02-04"); pg.click("#ls"); pg.wait_for_timeout(500); check("overlapping request rejected", pg.locator("tbody tr").count() == 1)
    role("hr_admin", "leave"); check("HR cannot skip the head stage (no buttons yet)", pg.locator("button[data-a]").count() == 0)
    role("dept_head", "leave"); pg.click("button[data-a=approve]"); pg.wait_for_selector("text=រង់ចាំ HR"); check("head approves → waiting for HR", True)
    role("hr_admin", "leave"); pg.click("button[data-a=approve]"); pg.wait_for_selector("tbody .chip:has-text('អនុម័ត')"); check("HR gives final approval", True)
    u = pg.evaluate("(async()=>{const A=PRDHR.ui.A, e=(await A.emp.list({role:'hr_admin'},{pageSize:1000})).items.find(x=>x.employee_id===PRDHR.ui.user().employee_id)||null; const id=(await A.p.list('leave_requests'))[0].employee_id; const b=await A.leave.balance({role:'hr_admin'}, id, 2027); return [b.annual.used,b.annual.pending,b.annual.remaining]})()"); check("annual balance after final approval: used 10, pending 0, remaining 8", u == [10, 0, 8], u)
    role("hr_admin", "leave"); pg.fill(".qi[data-k=sick]", "3"); pg.click("#qs"); pg.wait_for_timeout(600); check("HR can configure a quota; it shows on the card", "សិទ្ធិ 3" in pg.inner_text(".grid"))
    # career
    role("hr_admin", "career"); pg.fill("#np", "ប្រធានក្រុមថ្មី"); pg.select_option("#nc", "A"); pg.fill("#ne", "2020-01-01"); pg.fill("#nr", "ល.ស.001"); pg.click("#cp"); pg.wait_for_selector("tbody .chip:has-text('ព្រាង')"); check("promotion proposal created as draft", True)
    pid = pg.evaluate("document.querySelector('#ce').value"); pos0 = pg.evaluate("(async()=>(await PRDHR.ui.A.p.get('employees', document.querySelector('#ce').value)).position)()")
    check("draft does not change the profile", pos0 != "ប្រធានក្រុមថ្មី"); pg.click("button[data-a=submit]"); pg.wait_for_selector("tbody .chip:has-text('ដាក់ស្នើ')")
    role("dept_head", "career"); check("dept head cannot approve promotions", pg.locator("button[data-a=approve]").count() == 0)
    role("hr_admin", "career"); pg.click("button[data-a=approve]"); pg.wait_for_selector("tbody .chip:has-text('អនុម័ត')"); pos1 = pg.evaluate("(async()=>(await PRDHR.ui.A.p.get('employees', document.querySelector('#ce').value)).position)()")
    check("approved + effective date passed → profile updated", pos1 == "ប្រធានក្រុមថ្មី", pos1); check("timeline shows the promotion with decision ref", "ល.ស.001" in pg.inner_text("#tlh"))
    pg.goto(BASE + "/index.html#e/" + pid); pg.reload(); pg.wait_for_selector(".tabs"); pg.click("[data-t=career]"); pg.wait_for_selector("#tb li"); check("profile Career tab shows the timeline", "ប្រធានក្រុមថ្មី" in pg.inner_text("#tb"))
    pg.set_viewport_size({"width": 390, "height": 800})
    for v in ("leave", "career"): pg.goto(BASE + "/index.html#" + v); pg.reload(); pg.wait_for_selector("#v table"); check(f"mobile: {v} has no horizontal overflow", pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 2"), pg.evaluate("document.documentElement.scrollWidth"))
    check("no JavaScript errors", not errs, errs[:3]); b.close()
print(f"\n{sum(res)}/{len(res)} UI checks passed"); sys.exit(0 if all(res) else 1)
