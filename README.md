# Mekong Wheels — ប្រព័ន្ធគ្រប់គ្រងការលក់ និងជួលយានយន្ត

**Vehicle Sales & Rental Management Information System** — គម្រោង Assignment មុខវិជ្ជា *Management Information Systems* (លោកគ្រូ Pay Laten)។

កសាងឡើងពីគម្រោង `mini-pos` (Laravel + React) ដោយរក្សាទុក Login, តួនាទីអ្នកប្រើ, ភាសាខ្មែរ/English, និង UI ហើយប្តូរមុខងារ POS ហាងកាហ្វេ ទៅជាប្រព័ន្ធលក់/ជួលឡាន។

## ឯកសារ Assignment (Assignment Flow)

| # | តម្រូវការ | ឯកសារ / កន្លែងក្នុងប្រព័ន្ធ |
|---|---|---|
| 1 | Business Case Study Analysis — TPS/MIS/DSS, បញ្ហា, អនុសាសន៍ | [docs/01-case-study.md](docs/01-case-study.md) |
| 2 | System Design Project — Flowchart, Database design | [docs/02-system-design.md](docs/02-system-design.md) + កូដប្រព័ន្ធពិតប្រាកដ |
| 3 | Decision Support Scenario — «គួរវិនិយោគលើប្រភេទឡានណា?» | [docs/03-decision-support.md](docs/03-decision-support.md) + អេក្រង់ **របាយការណ៍ & ការសម្រេចចិត្ត** |
| 4 | Excel / Data Analysis — Charts, Dashboard, Trend | [docs/04-excel-dashboard.xlsx](docs/04-excel-dashboard.xlsx) · [ការពន្យល់](docs/04-excel-dashboard.md) |
| 5 | Business Process Mapping — As-Is / To-Be | [docs/05-process-mapping.md](docs/05-process-mapping.md) |

## មុខងារប្រព័ន្ធ

| អេក្រង់ | មុខងារ | ប្រភេទប្រព័ន្ធ |
|---|---|---|
| **ផ្ទាំងគ្រប់គ្រង** | ឡានកំពុងជួល, ហួសកំណត់, ត្រូវប្រគល់/សងថ្ងៃនេះ, ចំណូលខែនេះ, ប្រាក់ជំពាក់, ស្ថានភាពឡាន | MIS |
| **ការជួល** | កក់ (បង្ហាញតែឡានទំនេរ, បដិសេធកក់ជាន់ថ្ងៃ) → ប្រគល់ → ទទួលវិញ (ពិន័យយឺតស្វ័យប្រវត្តិ) → បង់ប្រាក់ | TPS |
| **ការលក់** | លក់ឡាន (សាច់ប្រាក់/ធនាគារ/រំលស់), តាមដានការបង់រំលស់ | TPS |
| **យានយន្ត** | ឡាន ៥ ប្រភេទ, ជួល/លក់/ទាំងពីរ, ស្ថានភាព, ដាក់ជួសជុល | TPS |
| **អតិថិជន** | ព័ត៌មាន, ប័ណ្ណបើកបរ, ប្រវត្តិជួល/ទិញ | TPS |
| **ចំណាយ** | ថែទាំ, ធានារ៉ាប់រង, សាំង, លាងសម្អាត, ផ្សេងៗ (តាមឡាន ឬទូទៅ) | TPS |
| **របាយការណ៍ & ការសម្រេចចិត្ត** | ROI, អត្រាប្រើប្រាស់, ពិន្ទុវិនិយោគ, និន្នាការប្រចាំខែ, អតិថិជន/ឡានកំពូល, នាំចេញ Excel | DSS |
| **អ្នកប្រើប្រាស់** | admin / manager / staff, បិទគណនី | — |
| **កំណត់ហេតុសកម្មភាព** (Admin) | Audit log៖ អ្នកណាបង្កើត/កែ/លុបអ្វី ពេលណា (មុន → ក្រោយ), ចូល/ចេញ | — |
| **បោះពុម្ព** | កិច្ចសន្យាជួល និងវិក្កយបត្រលក់ (A4, ខ្មែរ/English, Save as PDF) | TPS |
| **ប្តូរពាក្យសម្ងាត់** | រូប 🔑 ក្បែរឈ្មោះ — ឧបករណ៍ផ្សេងទៀតត្រូវចេញ | — |

## ដំណើរការលើកុំព្យូទ័រ (Windows)

ត្រូវការ PHP 8.2+, Composer, Node 20+ (Python 3 សម្រាប់បង្កើត Excel)។

```powershell
# ១. Backend (លើកដំបូង)
cd backend
copy .env.example .env
composer install
php artisan key:generate
New-Item database\database.sqlite -ItemType File -Force
php artisan migrate:fresh --seed      # បង្កើតតារាង + ទិន្នន័យគំរូ ១២ ខែ

# ២. Frontend (លើកដំបូង)
cd ..\frontend
npm install
npm run build                         # build ចូល backend/public/build

# ៣. ដំណើរការ
cd ..\backend
php artisan serve --port=8090
```

បើក **http://localhost:8090** · ឬប្រើ `.\start.ps1` ដែលធ្វើជំហានទាំងអស់ខាងលើដោយស្វ័យប្រវត្តិ។

**កំពុងអភិវឌ្ឍ (hot reload):** ដំណើរការ `php artisan serve --port=8090` ក្នុង backend ហើយ `npm run dev` ក្នុង frontend → បើក http://localhost:5173

### គណនីសាកល្បង (សម្រាប់បង្ហាញក្នុងថ្នាក់តែប៉ុណ្ណោះ)

| តួនាទី | អ៊ីមែល | ពាក្យសម្ងាត់ |
|---|---|---|
| Admin | admin@rental.test | admin123 |
| Manager | manager@rental.test | manager123 |
| Staff | staff@rental.test | staff123 |

> ប្តូរពាក្យសម្ងាត់ទាំងនេះ (អេក្រង់ អ្នកប្រើប្រាស់) មុនពេលប្រើជាមួយទិន្នន័យពិត។

### ប្រើជាមួយទិន្នន័យពិត (Production)

សូមអាន **[docs/06-deployment.md](docs/06-deployment.md)**៖ Server (Nginx/Apache), HTTPS, SQLite ឬ MySQL, Backup ស្វ័យប្រវត្តិ & Restore, និងបញ្ជីពិនិត្យមុនបើកឲ្យប្រើ។ សង្ខេប៖

- ចម្លង `backend/.env.production.example` → `backend/.env` ហើយបំពេញ (`APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://...`, `ADMIN_EMAIL`, `COMPANY_*`)
- `php artisan db:seed --force` ក្នុង Production បង្កើត **តែ Admin ម្នាក់** ជាមួយពាក្យសម្ងាត់ចៃដន្យ (បង្ហាញតែម្តង) — គ្មានទិន្នន័យគំរូ ឬគណនីសាកល្បង
- Build frontend ដោយលាក់ប៊ូតុងគណនីសាកល្បង៖ `$env:VITE_DEMO_ACCOUNTS='false'; npm run build`
- Backup៖ `php artisan backup:run` (ដំណើរការស្វ័យប្រវត្តិរៀងរាល់ថ្ងៃ តាម Scheduler)
- ភ្លេចពាក្យសម្ងាត់ Admin៖ `php artisan app:admin you@example.com`

## ចំណុចប្រើប្រាស់ (UI)

- **ប្តូរភាសា ខ្មែរ | EN** និង **Dark mode** (ប៊ូតុង ☀/☾) នៅជ្រុងខាងលើស្តាំនៃគ្រប់អេក្រង់ និងនៅទំព័រ Login — ប្រព័ន្ធចងចាំជម្រើស។ Dark mode តាមការកំណត់កុំព្យូទ័រ រហូតដល់អ្នកប្រើជ្រើសដោយខ្លួនឯង។

## ផលិតតួលេខក្នុងឯកសារឡើងវិញ

ទិន្នន័យគំរូគណនាធៀបនឹង «ថ្ងៃនេះ»។ ដើម្បីបានតួលេខដូច [ឯកសារ ៣](docs/03-decision-support.md) ទាំងស្រុង៖

```powershell
# backend/.env:  DEMO_TODAY=2026-11-10
cd backend; php artisan migrate:fresh --seed
cd ..;      python tools/build_excel.py --from 2025-12-01 --to 2026-11-10
```

បន្ទាប់មកក្នុងអេក្រង់ **របាយការណ៍** ជ្រើសរយៈពេល `2025-12-01` → `2026-11-10`។ ទុក `DEMO_TODAY` ទទេ ដើម្បីប្រើថ្ងៃពិត (ល្អសម្រាប់បង្ហាញ Dashboard «ថ្ងៃនេះ»)។

## ការធ្វើតេស្ត

```powershell
cd backend;  php artisan test          # ២៧ tests: កក់ជាន់គ្នា, ពិន័យយឺត, បង់លើស, លក់, សិទ្ធិ, DSS,
                                       #   ពាក្យសម្ងាត់, គណនីបិទ, audit log, backup, production seed
cd frontend; npx tsc -b; npx oxlint
```

## រចនាសម្ព័ន្ធគម្រោង

```
vehicle-rental/
├── backend/            Laravel 12 API (Models, Controllers, migrations, seeders, tests)
├── frontend/           React 19 + TypeScript + Tailwind
├── docs/               ឯកសារ Assignment ១–៥ + Excel
│   └── diagrams/       ដ្យាក្រាមជា PNG (សម្រាប់ Word/PDF/Slide)
├── deploy/             Nginx / Apache config, update.sh, Windows scheduler (Production)
├── tools/build_excel.py  បង្កើត Excel dashboard ពី database
└── start.ps1           ដំឡើង + ដំណើរការ ដោយចុចម្តង (សម្រាប់ថ្នាក់/អភិវឌ្ឍ)
```
