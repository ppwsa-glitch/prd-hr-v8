# Known Limitations (Phase 2)
1. **Security ជា Demo ប៉ុណ្ណោះ** — RBAC/Masking ដំណើរការក្នុង Browser; អ្នកប្រើដែលមាន DevTools អាចអាន IndexedDB ផ្ទាល់។ Production ត្រូវការ Server/Firebase Rules + Auth ពិត។ Audit Log បដិសេធការកែក្នុង Provider ប៉ុន្តែមិនមែន Tamper-proof ទេ។
2. **Commit មិនមែន Atomic លើ Store ច្រើន** — បិទ Tab ពាក់កណ្តាល Commit ទុក Import ដែល `status:"in_progress"` (រកឃើញបាន; មិនទាន់មានប៊ូតុង Resume/Rollback)។
3. **UI នៃ Import** មានតែក្នុង Harness; UI ពេញលេញ (Mapping Editor, Resolutions UI) → Phase 3 / Phase 6។
4. **PDF ខ្មែរ**: jsPDF មិនគាំទ្រ Shaping ខ្មែរត្រឹមត្រូវ → Phase 5 នឹងប្រើ Print-to-PDF ពី HTML។
5. **SheetJS** ត្រូវ Internet (cdnjs) សម្រាប់ Upload .xlsx; Demo Bundled មិនត្រូវការ។
6. **ទិន្នន័យ Demo**: វត្តមាន Demo ពេញខែ ខុសពី Excel ពិត (មានតែ 29 ក្រឡា); `ü`/`N` មិនទាន់ដឹងន័យ; Grade A/B ក្នុង Demo ជាការសន្មត់ Demo។ Employee ID ក្នុង Demo ដូច Excel ពិត (តាមសំណើ) ដូច្នេះ ID+ផ្នែក/តួនាទី អាចតភ្ជាប់ទៅបុគ្គលពិតបាន។
7. `TOTAL_MISMATCH` ក្នុង Block 2025 primary មិនទាន់ដឹងមូលហេតុ (រូបមន្ត `សរុប` ក្នុង Excel មិនមែនមធ្យម Q ទាំង 4) → ត្រូវសំណួរ HR មុន Phase 5។
8. មិនទាន់មាន: Career/Promotion, Leave workflow, Documents, Notifications, Dashboard V8 (Phase 3–6)។ V7 នៅមាន Hard-code (90%, Quota 18, KPI 40/20/20/20) រហូតដល់ត្រូវជំនួស។
