# ការដាក់ប្រព័ន្ធឲ្យប្រើប្រាស់ពិត (Production Deployment)

ឯកសារនេះពន្យល់ពីរបៀបដាក់ Mekong Wheels ឲ្យប្រើក្នុងអាជីវកម្មពិត ដោយសុវត្ថិភាព៖ Server, HTTPS, Database, Backup និងការប្រើប្រាស់ប្រចាំថ្ងៃ។

> **កុំ** ប្រើ `php artisan serve` ឬ `start.ps1` សម្រាប់ Production។ វាធ្វើឡើងសម្រាប់ការអភិវឌ្ឍ និងបង្ហាញក្នុងថ្នាក់ប៉ុណ្ណោះ (ដំណើរការសំណើម្តងមួយៗ គ្មាន HTTPS)។

## ១. ជ្រើសរើស Database

| ស្ថានភាព | Database | ហេតុផល |
|---|---|---|
| ហាងមួយកន្លែង, អ្នកប្រើ ១–១០ នាក់ | **SQLite** (លំនាំដើម) | គ្មានអ្វីត្រូវដំឡើង, backup ជាឯកសារតែមួយ |
| សាខាច្រើន, អ្នកប្រើច្រើនក្នុងពេលតែមួយ | **MySQL / MariaDB** | ទ្រាំការសរសេរព្រមគ្នាបានល្អជាង, backup តាម `mysqldump` |

ប្រព័ន្ធត្រូវបានតេស្តលើទាំងពីរ (តេស្តទាំង ២៧ ឆ្លងកាត់លើ SQLite និង MariaDB 10.4)។ កូដមិនប្រើ SQL ពិសេសរបស់ database ណាមួយទេ ដូច្នេះប្តូរបានដោយកែតែ `.env`។

**ប្តូរទៅ MySQL៖**

```sql
CREATE DATABASE vehicle_rental CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rental'@'localhost' IDENTIFIED BY 'ពាក្យសម្ងាត់វែងចៃដន្យ';
GRANT ALL PRIVILEGES ON vehicle_rental.* TO 'rental'@'localhost';
```

រួចក្នុង `backend/.env`៖ `DB_CONNECTION=mysql`, `DB_DATABASE=vehicle_rental`, `DB_USERNAME=rental`, `DB_PASSWORD=...`។

## ២. ដំឡើងលើ Server (Linux + Nginx — ណែនាំ)

ត្រូវការ៖ PHP 8.2+ (php-fpm, php-sqlite3 ឬ php-mysql, php-mbstring, php-xml, php-curl), Composer, Node 20+, Nginx, Git។

```bash
cd /var/www
git clone https://github.com/<owner>/vehicle-rental.git
cd vehicle-rental

cp backend/.env.production.example backend/.env
nano backend/.env            # បំពេញរាល់ "CHANGE ME": APP_URL, ADMIN_EMAIL, COMPANY_*, DB_*

sudo ./deploy/update.sh      # composer, migrate, build frontend (លាក់គណនីសាកល្បង), cache, permissions
cd backend && php artisan db:seed --force
```

`db:seed` ក្នុង Production បង្កើត **តែ Admin ម្នាក់** (តាម `ADMIN_EMAIL`) ជាមួយពាក្យសម្ងាត់ចៃដន្យ ដែលបង្ហាញ **តែម្តង** — កត់ទុកភ្លាម។ មិនមានទិន្នន័យគំរូ ឬគណនីសាកល្បងទេ។ ចូលប្រព័ន្ធ រួច៖

1. ចុចរូប 🔑 ក្បែរឈ្មោះ (ខាងក្រោម Sidebar) → **ប្តូរពាក្យសម្ងាត់**
2. អេក្រង់ **អ្នកប្រើប្រាស់** → បង្កើតគណនីបុគ្គលិក (ពាក្យសម្ងាត់យ៉ាងតិច ៨ តួ)
3. បញ្ចូលយានយន្ត និងអតិថិជនពិត

### Nginx + HTTPS

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/rental
sudo nano /etc/nginx/sites-available/rental      # កែ server_name និង root
sudo ln -s /etc/nginx/sites-available/rental /etc/nginx/sites-enabled/
sudo certbot --nginx -d rental.example.com       # វិញ្ញាបនបត្រ HTTPS ឥតគិតថ្លៃ (Let's Encrypt)
sudo nginx -t && sudo systemctl reload nginx
```

ចំណុចសំខាន់៖ `root` ត្រូវចង្អុលទៅ **`backend/public`** តែប៉ុណ្ណោះ — កុំចង្អុលទៅ `backend/` ព្រោះវានឹងបង្ហាញ `.env` (ពាក្យសម្ងាត់ database)។

ប្រើ Apache ជំនួសវិញ? មើល [deploy/apache-vhost.conf.example](../deploy/apache-vhost.conf.example) (`backend/public/.htaccess` មានស្រាប់)។

### HTTPS ជាចាំបាច់

ពាក្យសម្ងាត់ និង Token ចូលប្រព័ន្ធធ្វើដំណើរលើបណ្តាញ។ បើគ្មាន HTTPS អ្នកណាម្នាក់ក្នុង Wi-Fi តែមួយអាចលួចមើលបាន។ ពេល `APP_URL` ចាប់ផ្តើមដោយ `https://` ប្រព័ន្ធបង្កើតតំណ https ទាំងអស់ ហើយផ្ញើ header `Strict-Transport-Security`។

## ៣. ដំឡើងលើ Windows (ឧ. កុំព្យូទ័រនៅហាង ជាមួយ XAMPP)

1. ចម្លងគម្រោងទៅ `C:\vehicle-rental`
2. `copy backend\.env.production.example backend\.env` ហើយបំពេញ
3. ក្នុង `backend`: `composer install --no-dev`, `php artisan key:generate`, `php artisan migrate --force`, `php artisan db:seed --force`, `php artisan config:cache`
4. ក្នុង `frontend`: `npm ci`, `$env:VITE_DEMO_ACCOUNTS='false'; npm run build`
5. Apache: ចម្លង [deploy/apache-vhost.conf.example](../deploy/apache-vhost.conf.example) ទៅ `C:\xampp\apache\conf\extra\httpd-vhosts.conf` ហើយ DocumentRoot = `C:/vehicle-rental/backend/public`
6. ចុះឈ្មោះ Scheduler (សម្រាប់ backup ស្វ័យប្រវត្តិ) — PowerShell **as Administrator**៖

```powershell
.\deploy\windows-scheduler.ps1 -Php C:\xampp\php\php.exe
```

## ៤. Backup

### ស្វ័យប្រវត្តិ

ពាក្យបញ្ជា `php artisan backup:run` ត្រូវបានកំណត់ឲ្យដំណើរការ **រៀងរាល់ថ្ងៃ** ម៉ោង `BACKUP_AT` (លំនាំដើម 01:30) ហើយរក្សាទុក `BACKUP_KEEP` ច្បាប់ចុងក្រោយ (លំនាំដើម ៣០)។

- **SQLite** → ចម្លងដោយ `VACUUM INTO` (សុវត្ថិភាព សូម្បីពេលកំពុងប្រើ) → `db-YYYYMMDD-HHMMSS.sqlite`
- **MySQL** → `mysqldump --single-transaction` → `db-YYYYMMDD-HHMMSS.sql`

ដើម្បីឲ្យវាដំណើរការ Server ត្រូវហៅ Scheduler រៀងរាល់នាទី៖

| ប្រព័ន្ធ | ការកំណត់ |
|---|---|
| Linux | `sudo crontab -u www-data -e` → `* * * * * cd /var/www/vehicle-rental/backend && php artisan schedule:run >> /dev/null 2>&1` |
| Windows | `.\deploy\windows-scheduler.ps1` (ខាងលើ) |

ពិនិត្យ៖ `php artisan schedule:list` · សាកល្បងភ្លាម៖ `php artisan backup:run`

### ទុក Backup នៅកន្លែងផ្សេង

Backup នៅលើ Server តែមួយ មិនការពារបានពេលថាសខូច ឬ Server បាត់ទេ។ កំណត់ `BACKUP_PATH` ទៅ៖
- ថាសមួយទៀត ឬ USB drive, ឬ
- Folder ដែល sync ទៅ Google Drive / OneDrive / Dropbox

ហើយ **សាកល្បង restore ម្តងក្នុងមួយខែ** — backup ដែលមិនធ្លាប់សាកល្បង មិនមែនជា backup ទេ។

### Restore (យកទិន្នន័យមកវិញ)

```bash
cd backend
php artisan down                                  # បិទប្រព័ន្ធបណ្តោះអាសន្ន
php artisan backup:run                            # backup ស្ថានភាពបច្ចុប្បន្នសិន (ក្រែងត្រូវការ)

# SQLite
cp storage/app/backups/db-20261110-013000.sqlite database/database.sqlite

# MySQL
mysql -u rental -p vehicle_rental < storage/app/backups/db-20261110-013000.sql

php artisan migrate --force                       # ក្រែង backup ចាស់ជាងកូដ
php artisan up
```

## ៥. សុវត្ថិភាព — អ្វីដែលប្រព័ន្ធធ្វើរួចហើយ

| ការការពារ | របៀប |
|---|---|
| ទាយពាក្យសម្ងាត់ | Login ត្រូវបានកំណត់ ១០ ដង/នាទី, ប្តូរពាក្យសម្ងាត់ ៦ ដង/នាទី |
| ពាក្យសម្ងាត់ខ្សោយ | យ៉ាងតិច ៨ តួអក្សរ, រក្សាទុកជា bcrypt hash |
| គណនីដែលត្រូវបិទ | បិទគណនី ឬ Admin កំណត់ពាក្យសម្ងាត់ថ្មី → ចេញពីគ្រប់ឧបករណ៍ភ្លាម |
| ប្តូរពាក្យសម្ងាត់ខ្លួនឯង | ត្រូវការពាក្យសម្ងាត់ចាស់ → ឧបករណ៍ផ្សេងទៀតត្រូវចេញ |
| សិទ្ធិ | admin / manager / staff ត្រូវបានពិនិត្យនៅ Server (មិនមែនតែលាក់ប៊ូតុង) |
| Token ផុតកំណត់ | `SANCTUM_EXPIRATION` (Production: ១២ ម៉ោង) និងលុប token ផុតកំណត់រៀងរាល់ថ្ងៃ |
| Browser headers | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, HSTS (លើ HTTPS) |
| កំហុសប្រព័ន្ធ | `APP_DEBUG=false` មិនបង្ហាញកូដ ឬ config ទៅអ្នកប្រើ |
| Audit log | រាល់ការបង្កើត/កែ/លុប, ចូល/ចេញ, ប្តូរពាក្យសម្ងាត់ (អេក្រង់ **កំណត់ហេតុសកម្មភាព** សម្រាប់ Admin) |

## ៦. ការថែទាំប្រចាំ

| ពេល | ការងារ |
|---|---|
| រៀងរាល់ថ្ងៃ (ស្វ័យប្រវត្តិ) | Backup, លុប token ផុតកំណត់ |
| រៀងរាល់សប្តាហ៍ | មើលអេក្រង់ **កំណត់ហេតុសកម្មភាព** រកសកម្មភាពមិនធម្មតា |
| រៀងរាល់ខែ | សាកល្បង restore backup, `composer audit` និង `npm audit` |
| ពេល update កូដ | `./deploy/update.sh` (វា backup មុនពេលប្តូរអ្វីៗ) |

### ភ្លេចពាក្យសម្ងាត់ Admin

```bash
cd backend && php artisan app:admin owner@example.com
```

បង្កើតពាក្យសម្ងាត់ចៃដន្យថ្មី (ឬបង្កើត Admin ថ្មី បើអ៊ីមែលមិនទាន់មាន) ហើយបង្ហាញតែម្តង។

## ៧. បញ្ជីពិនិត្យមុនបើកឲ្យប្រើ (Go-live checklist)

- [ ] `APP_ENV=production`, `APP_DEBUG=false`, `APP_KEY` មាន, `APP_URL` = https://...
- [ ] HTTPS ដំណើរការ, http:// បញ្ជូនទៅ https://
- [ ] Web root = `backend/public` (សាកល្បង៖ `https://.../.env` ត្រូវតែ 404)
- [ ] Frontend build ដោយ `VITE_DEMO_ACCOUNTS=false` (ទំព័រ Login គ្មានប៊ូតុងគណនីសាកល្បង)
- [ ] គ្មានទិន្នន័យគំរូ, គ្មានគណនី `@rental.test`
- [ ] Admin បានប្តូរពាក្យសម្ងាត់ក្រោយចូលលើកដំបូង
- [ ] `COMPANY_*` ត្រូវ (សាកល្បងបោះពុម្ពកិច្ចសន្យា និងវិក្កយបត្រ)
- [ ] Scheduler ដំណើរការ (`php artisan schedule:list`), `php artisan backup:run` ជោគជ័យ
- [ ] `BACKUP_PATH` នៅក្រៅ Server ឬ sync ទៅ Cloud, បានសាកល្បង restore ម្តង
- [ ] `composer audit` និង `npm audit` គ្មានបញ្ហា
