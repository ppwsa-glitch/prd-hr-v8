# Excel Import Mapping
Engine រក Sheet តាម **ខ្លឹមសារ Header** (មិនមែនតាមឈ្មោះ/ទីតាំង Column) ដូច្នេះ `វត្តមានធ្ន-24` (ខ្វះ ូ) ក៏ត្រូវបានស្គាល់។ Column ដែលមិន Map ត្រូវរាយការណ៍ (`mapping.unmapped`)។

## Sheet 1 → employees (35/35 Column ត្រូវបាន Map លើ Excel ពិត)
A row_no · B seq_in_unit · C **employee_id** · D name_km · E name_en (គ្មាន Header) · F gender · G marital_raw (`Yes`=រៀបការ) · H dob · I age_imported (មិនប្រើ — គណនាថ្មី) · J col_j_unlabeled (រក្សាទុក មិនដឹងន័យ) · K place_of_birth · L address🔒 · M blood_type🔒 · N national_id_no🔒 · O phone🔒 · P email🔒 · Q education_level · R major_text · S position · T section · U equivalent_rank · V framework · W unit_text · X rank_grade_date · Y years_service_imported · Z–AC start_framework / probation / contract / intern · AD staff_class (A/B/C; A = ថ្នាក់ខ្ពស់បំផុត) · AE retirement_date_imported · AF photo_ref · AG id_photo_ref · AH id_card_expiry🔒 · AI remarks
- ជួរក្រុម (Group header) ត្រូវកត់ក្នុង `unit_group`; ជួរលេខ Column និង Footer ត្រូវរំលង (មិនប្រើ Footer សម្រាប់ KPI)។

## Sheet 2 → performance_records / awards / medals / leave_balances
- ពិន្ទុ: Block `2025` ទីមួយ (H–M) = **primary**; Block `2023`, `2024`; Block `2025` ទីពីរ (Y–AD) = **alt** (ជម្រើសបន្ថែម — នាំចូលតែមិនប្រើក្នុងការគណនា)។
- ជនឆ្នើម 2014–2022: ក្រឡាមាន `ü` = ជនឆ្នើមឆ្នាំនោះ · មេដាយ 2007–2023: តម្លៃ `1` = មេដាយមួយ (មិនមានប្រភេទ) · ច្បាប់ 2023/2024 ប្រចាំខែ (Leave Type = unspecified)។
- ក្រឡាពិន្ទុជាអក្សរ «មាតុភាព/លំហែមាតុភាព» → `status: maternity_leave` (មិនមែន Error)។
- `សរុប` ដែលនាំចូល ≠ មធ្យម Q ក្នុង Block 2025 primary (145 ជួរ) → Warning `TOTAL_MISMATCH` (រក្សាតម្លៃ Imported ហើយគណនាមធ្យមដោយឡែក)។

## Sheet 3 → attendance_records
- ខែ/ឆ្នាំ យកពីឈ្មោះ Sheet (`ធ្ន-24` → 12/2024) ឬ `attendancePeriod` ដែលអ្នកបញ្ជាក់; ផ្ទៀងផ្ទាត់ថ្ងៃទី 1 ជាមួយ Weekday Row (ខុស → Error `PERIOD_MISMATCH`)។
- `code_raw` រក្សា `ü`/`N`; `category` = `unspecified` រហូតដល់ HR កំណត់។

## ច្បាប់ Validation / ដោះស្រាយ
| Code | ឥរិយាបថ |
|---|---|
| ID_MISSING / ID_FORMAT | Error — មិននាំចូល; ចុះក្នុង Error CSV |
| ID_DUPLICATE | Error ទាំងពីរជួរ — HR ដោះស្រាយតាម `resolutions: {"sheet|row": {employee_id}|{skip:true}}` |
| ID_AMBIGUOUS | កំណត់ត្រាក្នុង Sheet 2–3 ដែលចង្អុលទៅ ID ស្ទួន ត្រូវបានរក្សាទុកមិននាំចូល |
| ORPHAN_ID | ID មិនមានក្នុង Registry/DB — មិននាំចូល |
| NAME_MISMATCH | Warning ប្រសិនបើឈ្មោះខុសគ្នារវាង Sheet ជាមួយ ID ដូចគ្នា |
| SCORE_INVALID | ពិន្ទុក្រៅ 0–100 ឬជាអក្សរមិនស្គាល់ — មិនរក្សាទុក |
| ATTENDANCE_SPARSE | Warning ពេលតិចជាង 50% នៃបុគ្គលិកមានសញ្ញា |
Mode: `full` · `update-only`; Overwrite ត្រូវការ `confirmOverwrite:true` ជានិច្ច។ File ដើមមិនកែ (រក្សាតែ SHA-256)។
