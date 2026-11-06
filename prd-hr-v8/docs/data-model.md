# Data Model (Phase 2)
Primary relationship key: `employee_id` (ធ្វើ Normalize: Trim · Uppercase · លុបចន្លោះ/ZWSP). ទម្រង់ត្រឹមត្រូវ: `PPWSA-0000` · `PPWSA-C-0000` · `PPWSA-T-0000`.

| Store (IndexedDB) | Key | Index | កំណត់ចំណាំ |
|---|---|---|---|
| employees | employee_id | unit_text, section, position, gender | Archive តាម `archived_at` (មិនលុបពិត) |
| attendance_records | `emp|date` | employee_id, date | មានតែក្រឡាដែលមានសញ្ញា; ក្រឡាទទេ **មិនមែនអវត្តមាន** |
| performance_records | `emp|year|period|variant` | employee_id, year | period = Q1–Q4 · Total · Rank; variant = primary \| alt; `status:'maternity_leave'` ពេលក្រឡាជាអក្សរ |
| awards | `emp|outstanding|year` | employee_id, year | ជនឆ្នើម (`ü` ក្នុង Sheet 2) |
| medals | `emp|year` | employee_id, year | `medal_type` = null (Excel មិនបែងចែក) |
| leave_balances | `emp|leave|year|month` | employee_id | `leave_type:'unspecified'` (Excel មិនបែងចែកប្រភេទ) |
| audit_logs | uuid | ts, employee_id | **Append-only** |
| import_jobs | jobId | — | Hash File, Mode, Summary, Issues, status `in_progress`→`committed` |
| system_settings | key | — | បម្រុងទុក |
| departments, offices, positions, employment_history, education_records, qualifications, leave_requests, performance_criteria, training_courses, training_participants, documents, notifications, users, roles, permissions, approval_workflows | id | employee_id (ប្រសិនបើពាក់ព័ន្ធ) | បង្កើត Schema រួច — ប្រើក្នុង Phase 3–6 |

ប្រភពទិន្នន័យ (`origin`): `imported` · `demo` · `demo-v7` · `manual`. តម្លៃគណនា (អាយុ, ឆ្នាំបម្រើការងារ, ថ្ងៃនិវត្តន៍…) ស្ថិតក្រោម `calc` (`origin:"calculated"`) ហើយ **មិនត្រូវរក្សាទុក** ក្នុង Record។
