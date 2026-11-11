# ផ្នែកទី ២ · គម្រោងរចនាប្រព័ន្ធ (System Design Project)

**ប្រព័ន្ធ៖** Vehicle Sales & Rental System — Mekong Wheels
**បច្ចេកវិទ្យា៖** Laravel 12 (PHP, REST API) · React 19 + TypeScript (Web) · SQLite (ឬ MySQL)

> ដ្យាក្រាមខាងក្រោមសរសេរជា **Mermaid** — បើកក្នុង GitHub ឬ VS Code (Markdown Preview Mermaid)។
> **រូបភាព PNG សម្រាប់ដាក់ក្នុង Word/PDF/Slide** មាននៅ [docs/diagrams/](diagrams/)៖
> [Architecture](diagrams/02-1-architecture.png) · [Flowchart ការជួល](diagrams/02-2-rental-flowchart.png) · [Flowchart ការលក់](diagrams/02-3-sale-flowchart.png) · [State diagram](diagrams/02-4-booking-states.png) · [ERD](diagrams/02-5-erd.png)

---

## ២.១ ស្ថាបត្យកម្មប្រព័ន្ធ (Architecture)

```mermaid
flowchart LR
    U1["បុគ្គលិកផ្នែកមុខ<br/>(Staff)"] --> W
    U2["អ្នកគ្រប់គ្រង<br/>(Manager)"] --> W
    U3["អ្នកគ្រប់គ្រងប្រព័ន្ធ<br/>(Admin)"] --> W
    W["Web App<br/>React + TypeScript"] -- "HTTPS / JSON<br/>Token (Sanctum)" --> A["REST API<br/>Laravel 12"]
    A --> DB[("Database<br/>SQLite / MySQL")]
    A -- "Reports API" --> W
    W -- "នាំចេញ" --> X["Excel .xlsx"]
    W -- "បោះពុម្ព" --> P["កិច្ចសន្យា / វិក្កយបត្រ<br/>A4 · PDF"]
    S["Scheduler<br/>រៀងរាល់ថ្ងៃ"] -- "backup:run" --> BK[("Backup<br/>.sqlite / .sql")]
    DB -.-> BK
```

| ស្រទាប់ | តួនាទី | ឯកសារសំខាន់ |
|---|---|---|
| Presentation | អេក្រង់ ៩: Dashboard, ការជួល, ការលក់, យានយន្ត, អតិថិជន, ចំណាយ, របាយការណ៍, អ្នកប្រើ, កំណត់ហេតុសកម្មភាព + ទំព័របោះពុម្ព | `frontend/src/pages/*` |
| Business logic | ច្បាប់អាជីវកម្ម (កក់ជាន់គ្នា, ពិន័យយឺត, ស្ថានភាពឡាន, សិទ្ធិ), កត់ត្រា audit log | `backend/app/Http/Controllers/Api/*`, `backend/app/Models/*` |
| Data | ៦ តារាងស្នូល + users + activity_logs | `backend/database/migrations/*` |
| ប្រតិបត្តិការ | Backup ប្រចាំថ្ងៃ, លុប token ផុតកំណត់ | `backend/routes/console.php`, `backend/app/Console/Commands/*` |

---

## ២.២ គំនូសតាងលំហូរប្រព័ន្ធ (System Flowchart) — ការជួលឡាន

```mermaid
flowchart TD
    S([អតិថិជនស្នើសុំជួល]) --> A[បុគ្គលិកបញ្ចូលថ្ងៃចាប់ផ្តើម/បញ្ចប់]
    A --> B{{"ប្រព័ន្ធស្វែងរកឡានទំនេរ<br/>(គ្មានការកក់ជាន់ថ្ងៃ)"}}
    B -->|គ្មាន| N[ផ្តល់ថ្ងៃ/ប្រភេទផ្សេង] --> A
    B -->|មាន| C[ជ្រើសឡាន + អតិថិជន<br/>ថ្មី? បង្កើតភ្លាម]
    C --> D[/"គណនា: ថ្ងៃ × តម្លៃ − បញ្ចុះ = សរុប"/]
    D --> E[ទទួលប្រាក់កក់ → payments]
    E --> F[(Booking = reserved<br/>Vehicle = reserved)]
    F --> G{ថ្ងៃមកយកឡាន?}
    G -->|អតិថិជនបោះបង់| X[Cancel → ឡានទំនេរវិញ]
    G -->|មកយក| H[ប្រគល់ឡាន + កត់ km<br/>Booking = active, Vehicle = rented]
    H --> I{ទទួលឡានវិញ<br/>យឺតជាងថ្ងៃបញ្ចប់?}
    I -->|យឺត| J[/"ពិន័យ = ថ្ងៃយឺត × តម្លៃ/ថ្ងៃ"/] --> K
    I -->|ទាន់ពេល| K[កត់ km, ទទួលប្រាក់នៅសល់]
    K --> L[(Booking = returned<br/>Vehicle = available)]
    L --> R[[Dashboard & Reports ធ្វើបច្ចុប្បន្នភាពភ្លាម]]
    R --> Z([បញ្ចប់])
```

### លំហូរការលក់ឡាន

```mermaid
flowchart TD
    S([អតិថិជនចង់ទិញ]) --> A[ជ្រើសឡាន purpose = sale/both<br/>status = available]
    A --> B[ជ្រើសអតិថិជន, តម្លៃ, បញ្ចុះ]
    B --> C{វិធីបង់ប្រាក់}
    C -->|សាច់ប្រាក់/ធនាគារ| D[បង់ពេញ → payments]
    C -->|រំលស់| E[បង់ដំបូង → payments<br/>នៅសល់ = balance]
    D --> F[(Sale + cost ថតទុក<br/>Vehicle = sold)]
    E --> F
    F --> G[បង់រំលស់ប្រចាំខែ → payments] --> H{balance = 0?}
    H -->|ទេ| G
    H -->|បាទ| Z([បញ្ចប់])
```

### ដ្យាក្រាមស្ថានភាព (State diagram)

```mermaid
stateDiagram-v2
    direction LR
    state "Booking" as BK {
        [*] --> reserved : កក់
        reserved --> active : ប្រគល់ឡាន (pickup)
        reserved --> cancelled : បោះបង់
        active --> returned : ទទួលវិញ (return)
        returned --> [*]
        cancelled --> [*]
    }
    state "Vehicle" as VH {
        [*] --> available
        available --> reserved : មានការកក់
        reserved --> rented : pickup
        rented --> available : return
        available --> maintenance : ជួសជុល
        maintenance --> available
        available --> sold : លក់
    }
```

---

## ២.៣ ការរចនាមូលដ្ឋានទិន្នន័យ (Database Design) — ERD

```mermaid
erDiagram
    CUSTOMERS ||--o{ BOOKINGS : "ជួល"
    CUSTOMERS ||--o{ SALES : "ទិញ"
    VEHICLES  ||--o{ BOOKINGS : "ត្រូវបានជួល"
    VEHICLES  ||--o| SALES : "ត្រូវបានលក់ (ម្តង)"
    VEHICLES  ||--o{ EXPENSES : "ចំណាយលើ"
    BOOKINGS  ||--o{ PAYMENTS : "ទទួលប្រាក់"
    SALES     ||--o{ PAYMENTS : "ទទួលប្រាក់"
    USERS     ||--o{ BOOKINGS : "កត់ត្រា"
    USERS     ||--o{ SALES : "កត់ត្រា"
    USERS     ||--o{ PAYMENTS : "ទទួល"
    USERS     ||--o{ EXPENSES : "កត់ត្រា"
    USERS     |o--o{ ACTIVITY_LOGS : "ធ្វើសកម្មភាព"

    CUSTOMERS {
        bigint id PK
        string name
        string phone
        string email
        string id_card_no
        string license_no
        string address
    }
    VEHICLES {
        bigint id PK
        string plate_no UK
        string brand
        string model
        int year
        string type "car|suv|van|pickup|motorbike"
        string purpose "rent|sale|both"
        string status "available|reserved|rented|maintenance|sold"
        decimal daily_rate
        decimal sale_price
        decimal purchase_cost
        date purchased_on
        int mileage
    }
    BOOKINGS {
        bigint id PK
        string booking_no UK
        bigint customer_id FK
        bigint vehicle_id FK
        bigint user_id FK
        date start_date
        date end_date
        int days
        decimal daily_rate
        decimal discount
        decimal late_fee
        decimal total
        decimal deposit
        string status "reserved|active|returned|cancelled"
        datetime picked_up_at
        datetime returned_at
    }
    SALES {
        bigint id PK
        string sale_no UK
        bigint customer_id FK
        bigint vehicle_id FK "UNIQUE"
        bigint user_id FK
        date sale_date
        decimal price
        decimal discount
        decimal total
        decimal cost
        string payment_method "cash|bank|installment"
    }
    PAYMENTS {
        bigint id PK
        bigint booking_id FK "nullable"
        bigint sale_id FK "nullable"
        bigint user_id FK
        decimal amount
        string method "cash|bank|card"
        datetime paid_at
    }
    EXPENSES {
        bigint id PK
        bigint vehicle_id FK "nullable = ចំណាយទូទៅ"
        bigint user_id FK
        date spent_on
        string category "maintenance|insurance|fuel|cleaning|other"
        decimal amount
    }
    USERS {
        bigint id PK
        string name
        string email UK
        string password "bcrypt"
        string role "admin|manager|staff"
        bool is_active
    }
    ACTIVITY_LOGS {
        bigint id PK
        bigint user_id FK "nullable"
        string user_name "ថតទុក"
        string action "created|updated|deleted|login|logout|password"
        string subject_type "Booking|Sale|Vehicle|..."
        bigint subject_id
        string subject_label
        json changes "field: [មុន, ក្រោយ]"
        string ip
        datetime created_at
    }
```

### វចនានុក្រមទិន្នន័យ (Data Dictionary) — ចំណុចសំខាន់

| តារាង | ចំនួនជួរ (ទិន្នន័យគំរូ) | គោលបំណង | ច្បាប់/កំណត់សម្គាល់ |
|---|---|---|---|
| `customers` | ៨៤ | អតិថិជនជួល/ទិញ | ទូរស័ព្ទ ចាំបាច់; លុបមិនបាន បើមានប្រវត្តិ |
| `vehicles` | ៥៩ | យានយន្តទាំងអស់ (ជួល + លក់) | `plate_no` មិនស្ទួន; `purchase_cost` ប្រើគណនា ROI |
| `bookings` | ~២,២០០ | ប្រតិបត្តិការជួល (TPS) | `days = end − start + 1`; `total = days × rate − discount + late_fee`; មិនអនុញ្ញាតជាន់ថ្ងៃ |
| `sales` | ១៨ | ប្រតិបត្តិការលក់ | `vehicle_id` UNIQUE (ឡានលក់បានម្តង); `cost` ថតទុកពេលលក់ ដើម្បីចំណេញត្រឹមត្រូវ |
| `payments` | ~៤,០០០ | ប្រាក់ចូលគ្រប់ប្រភេទ | ភ្ជាប់ booking **ឬ** sale; មិនអនុញ្ញាតបង់លើស balance |
| `expenses` | ~៦០០/ឆ្នាំ | ចំណាយ (COSTS) | `vehicle_id` NULL = ចំណាយទូទៅ (ជួលការិយាល័យ, ភ្លើង) |
| `users` | ៤ | បុគ្គលិក និងសិទ្ធិ | ពាក្យសម្ងាត់ bcrypt (យ៉ាងតិច ៨ តួ); ត្រូវមាន admin យ៉ាងតិច ១; បិទគណនី → ចេញពីគ្រប់ឧបករណ៍ |
| `activity_logs` | កើនឡើងតាមការប្រើ | Audit trail៖ អ្នកណាធ្វើអ្វី ពេលណា | សរសេរតែម្យ៉ាង (append-only); `changes` = តម្លៃមុន/ក្រោយ; **មិនដែល** រក្សាពាក្យសម្ងាត់; `user_name` ថតទុក ដើម្បីនៅតែអានបាន ទោះអ្នកប្រើត្រូវលុប |

**តម្លៃដែលគណនា (derived, មិនរក្សាទុក)៖** `paid = SUM(payments.amount)`, `balance = total − paid`, `utilization = rented_days ÷ available_days`, `ROI = (rental revenue − expenses) ÷ purchase_cost`។

**Normalization៖** តារាងទាំងអស់ស្ថិតក្នុង **3NF** — ព័ត៌មានអតិថិជន/ឡាន រក្សាតែមួយកន្លែង ហើយការកក់/លក់យោងតាម foreign key។ ករណីលើកលែងដោយចេតនា៖ `bookings.daily_rate` និង `sales.cost` ថតតម្លៃ *ពេលប្រតិបត្តិការ* ដើម្បីកុំឲ្យការកែតម្លៃឡានពេលក្រោយ ប្តូរប្រវត្តិ។ ដូចគ្នានេះ `activity_logs.user_name` និង `subject_label` ថតទុកដោយចេតនា ព្រោះ audit log ត្រូវបង្ហាញស្ថានភាព *ពេលនោះ* មិនមែនស្ថានភាពបច្ចុប្បន្នទេ។ `subject_type` + `subject_id` ជា polymorphic reference (គ្មាន FK) ដូច្នេះកំណត់ហេតុនៅតែមាន ទោះកំណត់ត្រាដើមត្រូវលុប។

---

## ២.៤ តួនាទី និងសិទ្ធិ (Roles)

| មុខងារ | Staff | Manager | Admin |
|---|:-:|:-:|:-:|
| Dashboard, ការជួល, ការលក់, អតិថិជន (បន្ថែម/កែ) | ✅ | ✅ | ✅ |
| មើលបញ្ជីឡាន | ✅ | ✅ | ✅ |
| បន្ថែម/កែ/ជួសជុល ឡាន, ចំណាយ, មើលថ្លៃដើម/ចំណេញ | — | ✅ | ✅ |
| របាយការណ៍ & ការសម្រេចចិត្ត (DSS), នាំចេញ Excel | — | ✅ | ✅ |
| បោះពុម្ពកិច្ចសន្យាជួល / វិក្កយបត្រលក់ | ✅ | ✅ | ✅ |
| ប្តូរពាក្យសម្ងាត់ខ្លួនឯង | ✅ | ✅ | ✅ |
| លុបការលក់, លុបអតិថិជន | — | ✅ | ✅ |
| គ្រប់គ្រងអ្នកប្រើ, មើលកំណត់ហេតុសកម្មភាព (audit log) | — | — | ✅ |

## ២.៥ API សង្ខេប

| Method | Endpoint | មុខងារ |
|---|---|---|
| POST | `/api/auth/login` | ចូលប្រព័ន្ធ → token |
| GET | `/api/dashboard` | KPI ថ្ងៃនេះ |
| GET | `/api/vehicles/available?start_date&end_date` | ឡានទំនេរ |
| POST | `/api/bookings` | កក់ (ពិនិត្យជាន់ថ្ងៃ) |
| POST | `/api/bookings/{id}/pickup` · `/return` · `/cancel` · `/pay` | វដ្តការជួល |
| POST | `/api/sales` · `/api/sales/{id}/pay` | លក់ / បង់រំលស់ |
| GET | `/api/reports/performance?from&to` | DSS តាមប្រភេទឡាន |
| PUT | `/api/auth/password` | ប្តូរពាក្យសម្ងាត់ខ្លួនឯង (ឧបករណ៍ផ្សេងត្រូវចេញ) |
| GET | `/api/company` | ព័ត៌មានក្រុមហ៊ុន សម្រាប់បោះពុម្ព |
| GET | `/api/activity?user_id&action&subject_type&from&to&search` | Audit log (Admin) |

ការធ្វើតេស្ត៖
- Backend `backend/tests/Feature/` — ២៧ test៖ `RentalFlowTest` (កក់ជាន់គ្នា, ពិន័យយឺត, បង់លើស, លក់ពីរដង, សិទ្ធិ, ចំណាត់ថ្នាក់ DSS) និង `ProductionReadinessTest` (ពាក្យសម្ងាត់, គណនីបិទ, audit log, backup, production seed, security headers)
- Frontend `frontend/src/**/*.test.ts(x)` — ការគណនាថ្ងៃ/ប្រាក់, ការបកប្រែ ខ្មែរ/English, សមាសភាគ UI (`npm test`)
