# ផ្នែកទី ៤ · កិច្ចការ Excel / វិភាគទិន្នន័យ

ឯកសារ៖ **[04-excel-dashboard.xlsx](04-excel-dashboard.xlsx)** — បង្កើតពីមូលដ្ឋានទិន្នន័យរបស់ប្រព័ន្ធ ដោយ `python tools/build_excel.py`។

## សន្លឹកនីមួយៗ

| សន្លឹក | មាតិកា | ផ្តោតលើ |
|---|---|---|
| **Dashboard** | KPI ៨ (ចំណូល, ចំណេញ, អត្រាប្រើប្រាស់, ប្រភេទគួរវិនិយោគ) + ក្រាហ្វ ៥ | Data visualization |
| **Monthly** | ចំណូលជួល/លក់, ចំណាយ, ចំណេញសុទ្ធ ប្រចាំខែ · Moving average ៣ ខែ · កំណើនខែទល់ខែ (MoM) · ខែខ្ពស់/ទាបបំផុត · SLOPE · ក្រាហ្វខ្សែ + **Trendline** | Trend analysis |
| **By Type** | តារាងសម្រេចចិត្ត: ចំនួនឡាន, ទុន, អត្រាប្រើប្រាស់, ROI, ពិន្ទុ, ចំណាត់ថ្នាក់ · ទម្ងន់កែបាន (what-if) · អនុសាសន៍ | Decision support |
| **Vehicles / Bookings / Sales / Expenses** | ទិន្នន័យដើម (Excel Table) — អាចធ្វើ PivotTable / Filter បាន | Reports |
| **Notes** | ការសន្មត និងនិយមន័យ | |

## ក្រាហ្វ

1. **Monthly trend** (Line + linear trendline) — ចំណូលជួល, ចំណូលលក់, ចំណាយ
2. **Investment score** (Bar) — ពិន្ទុតាមប្រភេទឡាន
3. **Utilization by type** (Bar) — អត្រាប្រើប្រាស់
4. **Rental revenue vs expenses by type** (Column)
5. **Expenses by category** (Pie)

## លក្ខណៈពិសេស

- **រាល់តួលេខសង្ខេបជារូបមន្ត** (`SUMIFS`, `COUNTIFS`, `INDEX/MATCH`, `RANK`, `SLOPE`, `AVERAGE`) — កែ/បន្ថែមជួរក្នុងសន្លឹកទិន្នន័យ ហើយ Dashboard ផ្លាស់ប្តូរតាម
- បានផ្ទៀងផ្ទាត់៖ រូបមន្តទាំង ៣១,៥១៦ ក្រឡា គ្មាន error ហើយលទ្ធផលស្មើនឹងអេក្រង់ Reports ក្នុងប្រព័ន្ធ ១០០%
- ពណ៌៖ **ខៀវលើលឿង** = ក្រឡាអាចកែ (ទម្ងន់), **បៃតង** = តភ្ជាប់ពីសន្លឹកផ្សេង, **ខ្មៅ** = រូបមន្ត

## បង្កើតឡើងវិញ (ក្រោយទិន្នន័យថ្មី)

```powershell
cd vehicle-rental
python tools/build_excel.py
```

ក្រៅពីនេះ អ្នកគ្រប់គ្រងអាចចុច **នាំចេញ Excel** នៅលើអេក្រង់ **របាយការណ៍ & ការសម្រេចចិត្ត** ក្នុងប្រព័ន្ធ សម្រាប់រយៈពេលណាមួយ។
