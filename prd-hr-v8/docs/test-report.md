# Test Report — Phase 2 (ថ្ងៃទី 06 វិច្ឆិកា 2026)

| Suite | លទ្ធផល | របៀបរត់ |
|---|---|---|
| Node: Core / Data / Import / RBAC / Seed / Adapter | **23/23** (Demo ប៉ុណ្ណោះ) | `node tests/run.js` |
| Node: បូករួមតេស្តលើ Excel ពិត (3 តេស្តបន្ថែម) | **26/26** | `node tests/run.js <real-workbook-fixture.json>` — រត់ក្នុង Sandbox ដែល Fixture មិនត្រូវបានដាក់ក្នុង Project |
| Chromium (IndexedDB ពិត + V7 Baseline) | **17/17** | `python3 tests/browser.py` |

## អ្វីដែលបានបញ្ជាក់
- Preview **មិនសរសេរ** អ្វីក្នុង DB; Commit ចុះ 262 នាក់ + ពិន្ទុ + វត្តមាន; **ទិន្នន័យនៅរស់ក្រោយ Refresh** (IndexedDB ពិត)។
- Import ម្តងទៀត ដោយគ្មាន Confirm → Overwrite 0; ជាមួយ Confirm → Update ហើយ Audit កត់តម្លៃមុន (PII ត្រូវបាន `***`)។
- `audit_logs`៖ Put/Delete/Clear ត្រូវបានបដិសេធ ទាំង Memory និង IndexedDB; `putMany` Rollback ទាំងកញ្ចប់ពេលមាន Record អាក្រក់។
- RBAC ក្នុង Service: និយោជិតឃើញតែខ្លួនឯង; ប្រធានផ្នែកឃើញតែផ្នែកខ្លួន, កែ/Archive ត្រូវ `FORBIDDEN`; PII ត្រូវ Mask។
- Archive/Restore មិនលុប Record; Employee ID មិនអាចកែ។
- V7 ដើម **byte-identical**; Baseline V7 (Chromium): Role 3, Nav 10/9/5, 10 View បង្ហាញខ្លឹមសារ, គ្មាន JS Error។

## លទ្ធផលលើ Excel ពិត (បញ្ជាក់ Phase 1)
Sheet ទាំង 3 ស្គាល់ត្រូវ · 35/35 Column Map · 263 ជួរ → **260 Valid / 3 ត្រូវ HR សម្រេច** (2 ID ស្ទួន + 1 គ្មាន ID) · 54 ID Orphan មិននាំចូល + 1 `PPWSA-C-` ទទេ · ឈ្មោះស្របគ្នាទាំង Sheet (NAME_MISMATCH = 0) · វត្តមាន: 29 ក្រឡា · 145 `TOTAL_MISMATCH` ក្នុង Block 2025 primary · 4 ក្រឡា «មាតុភាព» ត្រូវកត់ជា Status។

## ចំណុចដែលរកឃើញ និងបានជួសជុលពេលតេស្ត
1. ក្រឡាពិន្ទុជាអក្សរ «មាតុភាព» → ពីមុនជា Error; ឥឡូវជា `status`។
2. Resolutions ត្រូវអនុវត្តមុនរាប់ ID ស្ទួន (បើមិនដូច្នេះ ជួរមួយទៀតនៅតែត្រូវទប់)។
3. កំណត់ត្រា Sheet 2–3 ដែលចង្អុលទៅ ID ស្ទួន ត្រូវទប់ (`ID_AMBIGUOUS`) ជំនួសឱ្យការទាយ។
4. Commit ត្រូវកត់ Job `in_progress` មុនសរសេរ ដើម្បីរកឃើញ Import ដែលដាច់កណ្តាលទី។

---
# Phase 3a (Employee Directory · CRUD · Profile 360° ផ្នែកដំបូង)
| Suite | លទ្ធផល | ពាក្យបញ្ជា |
|---|---|---|
| Chromium UI | **24/24** | `python3 tests/ui.py` (ត្រូវការ `python3 -m http.server 8765`) |
| Node (Phase 2, ឡើងវិញ) | **26/26** | `node tests/run.js <fixture>` |
| Chromium Data/V7 (Phase 2, ឡើងវិញ) | **17/17** | `python3 tests/browser.py` |

បានបញ្ជាក់៖ បញ្ជី 262 នាក់ · Pagination 25/ទំព័រ · Filter (ភេទស្រី = 28) · តម្រៀបតាមអាយុ · ស្វែងរកតាម ID · Export CSV (កត់ Audit) · បន្ថែម (ID Normalize) · ID អាក្រក់/ស្ទួនត្រូវបដិសេធ · កែប្រែ + Audit · Archive/Restore (កំណត់ត្រាមិនបាត់) · Tab ព័ត៌មាន/ការងារ/ពិន្ទុ/រង្វាន់/ប្រវត្តិ · តម្លៃគណនាមានស្លាក **Calculated** · "No Data" ជំនួសតម្លៃក្លែងក្លាយ · Role និយោជិតឃើញតែខ្លួនឯង + PII Mask + មិនមានប៊ូតុងកែ · មិនមាន Horizontal Overflow លើ Mobile (390px) · គ្មាន JS Error។
ដំណោះស្រាយ Bug ពេលតេស្ត៖ ការ Render Tab ដែល Async ចាស់ អាចសរសេរជាន់លើ Tab ថ្មី → បានបន្ថែមការមិនអើពើលទ្ធផលហួសសម័យ។

**មិនទាន់ក្នុង Phase 3a (→ 3b)**: Org Chart · Career History/Timeline · Attendance (Calendar) · Leave · Tab ការសិក្សា/វត្តមាន/ឯកសារ ក្នុង Profile។ Tab ទាំងនេះមិនត្រូវបានបង្ហាញ (មិនមានប៊ូតុងស្លាប់)។

---
# Phase 3b-1 (Org Chart · Attendance)
| Suite | លទ្ធផល |
|---|---|
| Node (រួមតេស្ត SettingsService/relatedAll) | **27/27** (ជាមួយ Fixture Excel ពិត) |
| Chromium UI: `tests/ui2.py` (Org + Attendance) | **19/19** |
| Chromium UI: `tests/ui.py` (Directory/CRUD/Profile) | **24/24** |
| Chromium Data/V7: `tests/browser.py` | **17/17** |

**Org Chart**: Office → ផ្នែក → បុគ្គលិក (ពង្រីក/បង្រួម, ស្វែងរក, ចំនួន ប្រុស/ស្រី, ផលបូក = 262), ចំនួនតាមតួនាទី, តំណទៅ Profile។ **Attendance**: ខែពីទិន្នន័យ, បញ្ជីប្រចាំថ្ងៃ, ប្រតិទិនបុគ្គល, សរុបតាមអង្គភាព។ **អត្រាវត្តមាន = "No Data"** រហូតដល់ HR កំណត់អត្ថន័យកូដ (រក្សាទុកក្នុង `system_settings` + Audit, នៅរស់ក្រោយ Refresh); ក្រឡាទទេមិនរាប់ជាអវត្តមាន។
ដែនកំណត់: តេស្ត Role និយោជិតលើ Attendance បញ្ជាក់តែការមិនបង្ហាញផ្ទាំងកំណត់ — Demo បច្ចុប្បន្ន និយោជិតម្នាក់ៗអាចគ្មានកំណត់ត្រាវត្តមាន។ ខែ/ឆ្នាំយកតាមទិន្នន័យ; ថ្ងៃឈប់សម្រាក (publicHolidays) នៅទទេ រហូតដល់ HR កំណត់។
**នៅសល់ក្នុង Phase 3**: Leave Workflow · Career/Promotion Timeline · Tab ការសិក្សា/វត្តមាន/ឯកសារក្នុង Profile។

---
# Phase 3b-2 (Leave Workflow · Career/Promotion)
| Suite | លទ្ធផល |
|---|---|
| Node (រួម Leave/Career 4 តេស្តថ្មី) | **31/31** (ជាមួយ Fixture Excel ពិត) |
| Chromium UI `ui3.py` (Leave + Career) | **20/20** |
| Chromium UI `ui2.py` / `ui.py` / `browser.py` | 19/19 · 24/24 · 17/17 |

**Leave**: ប្រភេទ V7 ទាំង 5 · Workflow Employee → ប្រធានផ្នែក → HR (HR មិនអាចរំលងជំហានប្រធានផ្នែក; ប្រធានផ្នែកមិនអាចអនុម័តជំហាន HR; ប្រធានផ្នែកផ្សេងមិនមានសិទ្ធិ) · ថ្ងៃធ្វើការ (រំលង Sat/Sun + ថ្ងៃឈប់ដែល HR កំណត់) · ទប់ជាន់ថ្ងៃ · Quota ក្នុងមួយប្រភេទ (លំនាំដើម: ប្រចាំឆ្នាំ 18 = តម្លៃ Demo ពី V7; ប្រភេទផ្សេងមិនកំណត់ Quota) កែបានដោយ HR · សំណើរង់ចាំរាប់ក្នុង Balance; បដិសេធបង្ហាញ Balance វិញ · បដិសេធត្រូវមានមូលហេតុ · កត់ Audit គ្រប់សកម្មភាព។
**Career**: Timeline (ថ្ងៃចូលបម្រើ/កាំ-ថ្នាក់ ពី Excel + ការដំឡើងដែលអនុម័ត) · សំណើ Draft → ដាក់ស្នើ → អនុម័ត/បដិសេធ (HR តែម្នាក់) · Draft/Submitted/Rejected **មិនកែ Profile**; ការអនុម័តកត់ `employment_history` ហើយអនុវត្តលើ Profile នៅថ្ងៃមានប្រសិទ្ធភាព (Idempotent)។
Bug ដែលរកឃើញពេលតេស្ត: (1) HR អាចរំលងជំហានប្រធានផ្នែក → ជួសជុល; (2) មតិយោបល់ `//` បានបិទ `route()` ក្នុង app.js → ជួសជុល។
ដែនកំណត់: មិនទាន់មានឯកសារភ្ជាប់ (Attach) លើសំណើច្បាប់/សេចក្តីសម្រេច; ការជូនដំណឹង (Notification) សម្រាប់សំណើរង់ចាំ → Phase 4; ការជ្រើសរើស "ប្រធានផ្នែក" ក្នុង Demo ជា Persona មួយ (ផ្នែកដូចបុគ្គលិក Persona); Tab ការសិក្សា/ឯកសារក្នុង Profile នៅមិនទាន់ធ្វើ។
