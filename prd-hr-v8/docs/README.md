# PRD-HR V8.0 — Phase 2: Core Foundation

**ស្ថានភាព:** Phase 2 រួចរាល់ (Data Layer · Import Engine · Audit · RBAC service). UI របស់ V7 **មិនបានកែ** (`legacy/`).
ទិន្នន័យទាំងអស់ក្នុង Project នេះជា Demo/សិប្បនិម្មិត — មិនមានទិន្នន័យបុគ្គលិកពិតទេ។

## ចាប់ផ្តើម UI V8 (Phase 3a)
បើក `index.html` តាម http(s) → ចុច «ផ្ទុក Demo 262» → បញ្ជីបុគ្គលិក/Profile។ V7 ដើមនៅតែបើកបានតាមតំណ «V7 (ដើម)»។

## របៀបសាកល្បង Data Layer (Phase 2)
```
cd prd-hr-v8
python3 -m http.server 8765        # ឬ Host ក្នុង Static Hosting ណាក៏បាន
# បើក http://localhost:8765/phase2-harness.html
```
1. ចុច **Import Demo 262 (bundled)** → មើល Preview (មិនទាន់សរសេរអ្វី) → **Commit**។
2. Refresh Page → ទិន្នន័យនៅដដែល (IndexedDB)។
3. ប្តូរ Role (HR / ប្រធានផ្នែក / និយោជិត) → ឃើញការកំណត់ Scope និង Masking។
4. ដាក់ Excel ពិត (.xlsx) តាម File Picker (ត្រូវការ Internet ដើម្បីទាញ SheetJS ពី cdnjs) → Preview → Error list CSV។
5. Import ម្តងទៀត → គ្មានអ្វីត្រូវបាន Overwrite លុះត្រាតែ Tick «បញ្ជាក់ Overwrite»។

`file://` ប្រើបាន ប៉ុន្តែប៊ូតុង "bundled" (fetch) ត្រូវការ http(s)។

## រចនាសម្ព័ន្ធ
```
js/core/core.js              clock, config (rules ដែលកែបាន), calc, text, validators
js/data/schema.js            25 Entities (Employee ID = Foreign Key)
js/data/providers.js         DataProvider contract + MemoryProvider + IndexedDBProvider
js/services/core-services.js RBAC policy (can/mask) · AuditService (append-only) · EmployeeService (CRUD/Archive)
js/services/import-service.js detect → map → parse → validate → preview → commit → error CSV
js/services/seed-service.js  V7 seed
js/legacy-adapter.js         ផ្តល់ទិន្នន័យទៅ V7 View តាមទម្រង់ `P[]` ដើម
seed/                        v7-employees.json · demo-workbook.json (262, សិប្បនិម្មិត) · demo-employees-262.json
tests/                       run.js (Node) · browser.py (Chromium/IndexedDB + V7 baseline)
legacy/                      V7 ដើម (byte-identical)
```
ប្តូរទៅ Firebase ក្នុងអនាគត៖ សរសេរ `FirebaseProvider` ដែលមាន Method ដូច `IndexedDBProvider` (open/get/put/putMany/delete/list/count/clear/append) — UI និង Service មិនត្រូវកែ។

## ច្បាប់ Config ដែលបានកំណត់ (កែបានក្នុង `defaultConfig()` → System Settings ក្នុង Phase 6)
- និវត្តន៍ = ថ្ងៃកំណើត + 60 ឆ្នាំ (**លំនាំដើម មិនមែនច្បាប់ផ្លូវការ** — ស្លាកនេះបង្ហាញជាមួយតម្លៃគណនា)
- កូដវត្តមាន `ü`, `N` = **មិនទាន់កំណត់** (HR កំណត់ក្នុង Attendance Code Config)
- Employment Type មកពី Prefix ID: (គ្មាន)=permanent · `C`=contract · `T`=trial
- គោលដៅបណ្តុះបណ្តាល 40 ម៉ោង, Quota ច្បាប់ 18 ថ្ងៃ = តម្លៃ Demo ពី V7 (official:false)
