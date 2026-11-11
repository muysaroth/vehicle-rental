"""
Build docs/04-excel-dashboard.xlsx from the system's own database.

Assignment part 4 (Excel / Data Analysis): charts, a dashboard and reports,
with the focus on data visualisation and trend analysis.

The raw-data sheets hold values exported from the database; every summary
(Monthly, By Type, Dashboard) is an Excel formula over those sheets, so the
workbook recalculates if a row is edited or added.

    python tools/build_excel.py            # from the vehicle-rental folder
    python tools/build_excel.py --from 2025-12-01 --to 2026-11-10   # the period used in docs/03
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from datetime import date, timedelta
from pathlib import Path

from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, PieChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.chart.trendline import Trendline
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "backend" / "database" / "database.sqlite"
OUT = ROOT / "docs" / "04-excel-dashboard.xlsx"

TYPES = ["car", "suv", "van", "pickup", "motorbike"]
TYPE_LABEL = {"car": "Car", "suv": "SUV", "van": "Van", "pickup": "Pickup", "motorbike": "Motorbike"}
CATEGORIES = ["maintenance", "insurance", "fuel", "cleaning", "other"]

FONT = "Arial"
TEAL = "0F766E"
HEAD = Font(name=FONT, bold=True, color="FFFFFF")
HEAD_FILL = PatternFill("solid", fgColor=TEAL)
BOLD = Font(name=FONT, bold=True)
BODY = Font(name=FONT)
INPUT = Font(name=FONT, color="0000FF")  # hardcoded inputs are blue
LINK = Font(name=FONT, color="008000")  # cross-sheet links are green
YELLOW = PatternFill("solid", fgColor="FFFF00")
THIN = Border(bottom=Side(style="thin", color="CBD5E1"))
USD = '"$"#,##0;("$"#,##0);-'
USD2 = '"$"#,##0.00;("$"#,##0.00);-'
PCT = "0.0%;(0.0%);-"


def period() -> tuple[date, date]:
    """Same default window as the app's report: the last 12 calendar months to today."""
    today = date.today()
    m = today.month - 11
    y = today.year + (m - 1) // 12
    m = (m - 1) % 12 + 1
    return date(y, m, 1), today


def d(value: str | None) -> date | None:
    return date.fromisoformat(value[:10]) if value else None


def style_header(ws, row: int, ncols: int, col: int = 1) -> None:
    for c in range(col, col + ncols):
        cell = ws.cell(row=row, column=c)
        cell.font = HEAD
        cell.fill = HEAD_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)


def data_sheet(wb: Workbook, name: str, headers: list[str], rows: list[list], widths: list[int], formats: dict[int, str]):
    ws = wb.create_sheet(name)
    ws.append(headers)
    for r in rows:
        ws.append(r)
    style_header(ws, 1, len(headers))
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    for row in ws.iter_rows(min_row=2, max_row=ws.max_row):
        for cell in row:
            cell.font = BODY
            fmt = formats.get(cell.column)
            if fmt:
                cell.number_format = fmt
    ref = f"A1:{get_column_letter(len(headers))}{max(2, ws.max_row)}"
    table = Table(displayName=name.replace(" ", ""), ref=ref)
    table.tableStyleInfo = TableStyleInfo(name="TableStyleLight9", showRowStripes=True)
    ws.add_table(table)
    ws.freeze_panes = "A2"
    return ws


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="Build the Excel dashboard from the system database.")
    ap.add_argument("--from", dest="start", type=date.fromisoformat, help="first day (YYYY-MM-DD); default: 12 months back")
    ap.add_argument("--to", dest="end", type=date.fromisoformat, help="last day (YYYY-MM-DD); default: today")
    return ap.parse_args()


def main() -> None:
    if not DB.exists():
        sys.exit(f"Database not found: {DB}\nRun `php artisan migrate:fresh --seed` in backend/ first.")

    args = parse_args()
    start, end = period()
    if args.end:
        end = args.end
        if not args.start:  # same rule as the app: 12 calendar months ending at `to`
            m = end.month - 11
            start = date(end.year + (m - 1) // 12, (m - 1) % 12 + 1, 1)
    if args.start:
        start = args.start
    if start > end:
        raise SystemExit("--from must be on or before --to")
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    q = lambda sql, *a: con.execute(sql, a).fetchall()  # noqa: E731

    vehicles = q(
        """SELECT v.*, s.sale_date FROM vehicles v LEFT JOIN sales s ON s.vehicle_id = v.id ORDER BY v.type, v.brand, v.model"""
    )
    vtype = {v["id"]: v["type"] for v in vehicles}
    plate = {v["id"]: v["plate_no"] for v in vehicles}

    bookings = [
        b
        for b in q(
            """SELECT b.*, c.name AS customer FROM bookings b JOIN customers c ON c.id = b.customer_id ORDER BY b.start_date, b.id"""
        )
        if start <= d(b["start_date"]) <= end
    ]
    sales = [
        s
        for s in q("""SELECT s.*, c.name AS customer FROM sales s JOIN customers c ON c.id = s.customer_id ORDER BY s.sale_date""")
        if start <= d(s["sale_date"]) <= end
    ]
    expenses = [e for e in q("SELECT * FROM expenses ORDER BY spent_on, id") if start <= d(e["spent_on"]) <= end]

    wb = Workbook()
    dash = wb.active
    dash.title = "Dashboard"

    # ------------------------------------------------------------- raw data
    def owned_days(v) -> int:
        """Days in the period the company owned the vehicle (bought → sold)."""
        a = max(start, d(v["purchased_on"]) or start)
        b = min(end, d(v["sale_date"]) or end)
        return 0 if b < a else (b - a).days + 1

    vrows = []
    for v in vehicles:
        rentable = 1 if v["purpose"] in ("rent", "both") else 0
        vrows.append(
            [
                v["plate_no"], v["brand"], v["model"], v["year"], TYPE_LABEL[v["type"]], v["purpose"], v["status"],
                v["daily_rate"], v["sale_price"], v["purchase_cost"], d(v["purchased_on"]), d(v["sale_date"]),
                rentable, 1 if rentable and v["status"] != "sold" else 0, owned_days(v) if rentable else 0,
            ]
        )
    vs = data_sheet(
        wb, "Vehicles",
        ["Plate", "Brand", "Model", "Year", "Type", "Purpose", "Status", "Daily rate", "Sale price", "Purchase cost",
         "Purchased on", "Sold on", "Rental fleet (1/0)", "In fleet now (1/0)", "Owned days in period"],
        vrows, [12, 10, 16, 7, 11, 9, 12, 11, 11, 13, 13, 12, 11, 11, 13],
        {8: USD2, 9: USD, 10: USD, 11: "dd-mmm-yy", 12: "dd-mmm-yy"},
    )
    vs["O1"].comment = Comment(
        "Computed by tools/build_excel.py: days between max(purchase date, period start) and "
        "min(sale date, period end), inclusive. Rental vehicles only.", "MIS"
    )

    brows = [
        [b["booking_no"], d(b["start_date"]), d(b["start_date"]).strftime("%Y-%m"), d(b["end_date"]), b["customer"],
         plate[b["vehicle_id"]], TYPE_LABEL[vtype[b["vehicle_id"]]], b["days"], b["daily_rate"], b["discount"],
         b["late_fee"], b["total"], b["status"]]
        for b in bookings
    ]
    bs = data_sheet(
        wb, "Bookings",
        ["Booking no", "Start", "Month", "End", "Customer", "Plate", "Type", "Days", "Daily rate", "Discount", "Late fee", "Total", "Status"],
        brows, [12, 11, 9, 11, 24, 12, 11, 7, 10, 10, 10, 11, 11],
        {2: "dd-mmm-yy", 4: "dd-mmm-yy", 9: USD2, 10: USD2, 11: USD2, 12: USD2},
    )

    srows = []
    for i, s in enumerate(sales, start=2):
        srows.append(
            [s["sale_no"], d(s["sale_date"]), d(s["sale_date"]).strftime("%Y-%m"), s["customer"], plate[s["vehicle_id"]],
             TYPE_LABEL[vtype[s["vehicle_id"]]], s["payment_method"], s["total"], s["cost"], f"=H{i}-I{i}"]
        )
    ss = data_sheet(
        wb, "Sales",
        ["Sale no", "Date", "Month", "Customer", "Plate", "Type", "Payment", "Total", "Cost", "Profit"],
        srows, [11, 11, 9, 24, 12, 11, 12, 12, 12, 12],
        {2: "dd-mmm-yy", 8: USD, 9: USD, 10: USD},
    )

    erows = [
        [d(e["spent_on"]), d(e["spent_on"]).strftime("%Y-%m"), e["category"],
         plate.get(e["vehicle_id"], "") if e["vehicle_id"] else "(general)",
         TYPE_LABEL[vtype[e["vehicle_id"]]] if e["vehicle_id"] else "(general)", e["description"], e["amount"]]
        for e in expenses
    ]
    es = data_sheet(
        wb, "Expenses", ["Date", "Month", "Category", "Plate", "Type", "Description", "Amount"],
        erows, [11, 9, 13, 12, 11, 34, 11], {1: "dd-mmm-yy", 7: USD2},
    )

    nb, ns, ne, nv = bs.max_row, ss.max_row, es.max_row, vs.max_row
    B = lambda col: f"Bookings!${col}$2:${col}${nb}"  # noqa: E731
    S = lambda col: f"Sales!${col}$2:${col}${ns}"  # noqa: E731
    E = lambda col: f"Expenses!${col}$2:${col}${ne}"  # noqa: E731
    V = lambda col: f"Vehicles!${col}$2:${col}${nv}"  # noqa: E731

    def earning(sum_col: str | None, *criteria: str) -> str:
        """Bookings that earned revenue: status returned or active."""
        crit = ",".join(criteria)
        sep = "," if crit else ""
        if sum_col is None:
            return "+".join(f'COUNTIFS({B("M")},"{s}"{sep}{crit})' for s in ("returned", "active"))
        return "+".join(f'SUMIFS({B(sum_col)},{B("M")},"{s}"{sep}{crit})' for s in ("returned", "active"))

    # ---------------------------------------------------------------- Monthly
    ms = wb.create_sheet("Monthly", 1)
    ms["A1"] = "Monthly trend — revenue, costs and growth"
    ms["A1"].font = Font(name=FONT, bold=True, size=14)
    ms["A2"] = f"Period {start:%d %b %Y} – {end:%d %b %Y}. Rental revenue is counted on the booking's start date; cancelled and not-yet-started bookings are excluded."
    ms["A2"].font = Font(name=FONT, italic=True, color="64748B")
    hdr = ["Month", "Rental revenue", "Sales revenue", "Sales profit", "Expenses", "Net profit", "Bookings",
           "Units sold", "Rental 3-mo moving avg", "Rental MoM growth"]
    ms.append([])
    ms.append(hdr)
    style_header(ms, 4, len(hdr))
    months = []
    y, m = start.year, start.month
    while date(y, m, 1) <= end:
        months.append(f"{y:04d}-{m:02d}")
        m += 1
        if m == 13:
            y, m = y + 1, 1
    first = 5
    for i, mo in enumerate(months):
        r = first + i
        ms.cell(r, 1, mo)
        ms.cell(r, 2, "=" + earning("L", f'{B("C")},$A{r}'))
        ms.cell(r, 3, f'=SUMIFS({S("H")},{S("C")},$A{r})')
        ms.cell(r, 4, f'=SUMIFS({S("J")},{S("C")},$A{r})')
        ms.cell(r, 5, f'=SUMIFS({E("G")},{E("B")},$A{r})')
        ms.cell(r, 6, f"=B{r}+D{r}-E{r}")
        ms.cell(r, 7, "=" + earning(None, f'{B("C")},$A{r}'))
        ms.cell(r, 8, f'=COUNTIFS({S("C")},$A{r})')
        ms.cell(r, 9, f"=AVERAGE(B{max(first, r - 2)}:B{r})" if r - first >= 2 else "")
        ms.cell(r, 10, f"=IFERROR(B{r}/B{r - 1}-1,0)" if r > first else "")
    last = first + len(months) - 1
    tr = last + 1
    ms.cell(tr, 1, "Total")
    for c in range(2, 9):
        col = get_column_letter(c)
        ms.cell(tr, c, f"=SUM({col}{first}:{col}{last})")
    for row in ms.iter_rows(min_row=first, max_row=tr):
        for cell in row:
            cell.font = BOLD if cell.row == tr else BODY
            if cell.column in (2, 3, 4, 5, 6, 9):
                cell.number_format = USD
            elif cell.column == 10:
                cell.number_format = PCT
    for c, w in enumerate([10, 15, 15, 14, 13, 14, 10, 10, 18, 16], start=1):
        ms.column_dimensions[get_column_letter(c)].width = w
    ms.cell(tr + 2, 1, "Peak month (rental revenue)").font = BOLD
    ms.cell(tr + 2, 4, f"=INDEX(A{first}:A{last},MATCH(MAX(B{first}:B{last}),B{first}:B{last},0))")
    ms.cell(tr + 3, 1, "Lowest month (rental revenue)").font = BOLD
    ms.cell(tr + 3, 4, f"=INDEX(A{first}:A{last},MATCH(MIN(B{first}:B{last}),B{first}:B{last},0))")
    ms.cell(tr + 4, 1, "Linear trend per month (slope)").font = BOLD
    ms.cell(tr + 4, 4, f"=SLOPE(B{first}:B{last},ROW(B{first}:B{last}))")
    ms.cell(tr + 4, 4).number_format = USD
    ms.freeze_panes = "B5"

    line = LineChart()
    line.title = "Monthly revenue & expenses (with rental trendline)"
    line.y_axis.title = "USD"
    line.y_axis.numFmt = '"$"#,##0'
    line.height, line.width = 9, 22
    for col in (2, 3, 5):
        line.add_data(Reference(ms, min_col=col, min_row=4, max_row=last), titles_from_data=True)
    line.set_categories(Reference(ms, min_col=1, min_row=first, max_row=last))
    line.series[0].trendline = Trendline(trendlineType="linear")
    for s, color in zip(line.series, (TEAL, "2563EB", "F59E0B")):
        s.graphicalProperties.line.solidFill = color
        s.graphicalProperties.line.width = 28000
        s.smooth = False
    ms.add_chart(line, f"L4")

    # ---------------------------------------------------------------- By Type
    ts = wb.create_sheet("By Type", 2)
    ts["A1"] = "Decision support — which vehicle type should the company invest more in?"
    ts["A1"].font = Font(name=FONT, bold=True, size=14)
    ts["A2"] = "Inputs in blue on yellow are the scoring weights; change them to test a different management priority."
    ts["A2"].font = Font(name=FONT, italic=True, color="64748B")

    ts["A4"], ts["A5"], ts["A6"], ts["A7"] = "Weight: ROI", "Weight: utilization", "Weight: profit per vehicle", "Weights total"
    for r, w in zip((4, 5, 6), (0.40, 0.35, 0.25)):
        ts.cell(r, 2, w).font = INPUT
        ts.cell(r, 2).fill = YELLOW
        ts.cell(r, 2).number_format = "0%"
    ts["B7"] = "=SUM(B4:B6)"
    ts["B7"].number_format = "0%"
    ts["C4"] = "Rental profit ÷ money invested in the fleet: how hard each dollar works."
    ts["C5"] = "Rented days ÷ days available: high means demand already fills the fleet."
    ts["C6"] = "Rental profit per vehicle: absolute earning power of one more unit."
    for r in range(4, 8):
        ts.cell(r, 1).font = BOLD
        ts.cell(r, 3).font = Font(name=FONT, color="64748B")

    th = ["Type", "Fleet (now)", "Investment", "Bookings", "Rented days", "Available days", "Utilization",
          "Rental revenue", "Avg rate / day", "Expenses", "Rental profit", "Profit / vehicle", "ROI",
          "Units sold", "Sales revenue", "Sales profit", "Score (0-100)", "Rank"]
    hr = 9
    for c, h in enumerate(th, start=1):
        ts.cell(hr, c, h)
    style_header(ts, hr, len(th))
    t1, tn = hr + 1, hr + len(TYPES)
    for i, t in enumerate(TYPES):
        r = t1 + i
        lab = f"$A{r}"
        ts.cell(r, 1, TYPE_LABEL[t])
        ts.cell(r, 2, f'=SUMIFS({V("N")},{V("E")},{lab})')
        ts.cell(r, 3, f'=SUMIFS({V("J")},{V("E")},{lab},{V("N")},1)')
        ts.cell(r, 4, "=" + earning(None, f'{B("G")},{lab}'))
        ts.cell(r, 5, "=" + earning("H", f'{B("G")},{lab}'))
        ts.cell(r, 6, f'=SUMIFS({V("O")},{V("E")},{lab})')
        ts.cell(r, 7, f"=IFERROR(MIN(1,E{r}/F{r}),0)")
        ts.cell(r, 8, "=" + earning("L", f'{B("G")},{lab}'))
        ts.cell(r, 9, f"=IFERROR(H{r}/E{r},0)")
        ts.cell(r, 10, f'=SUMIFS({E("G")},{E("E")},{lab})')
        ts.cell(r, 11, f"=H{r}-J{r}")
        ts.cell(r, 12, f"=IFERROR(K{r}/B{r},0)")
        ts.cell(r, 13, f"=IFERROR(K{r}/C{r},0)")
        ts.cell(r, 14, f'=COUNTIFS({S("F")},{lab})')
        ts.cell(r, 15, f'=SUMIFS({S("H")},{S("F")},{lab})')
        ts.cell(r, 16, f'=SUMIFS({S("J")},{S("F")},{lab})')
        ts.cell(r, 17, (
            f"=IF(OR(B{r}=0,D{r}=0),0,100*("
            f"$B$4*MAX(0,M{r})/MAX(M${t1}:M${tn})"
            f"+$B$5*G{r}/MAX(G${t1}:G${tn})"
            f"+$B$6*MAX(0,L{r})/MAX(L${t1}:L${tn})))"
        ))
        ts.cell(r, 18, f"=RANK(Q{r},Q${t1}:Q${tn})")
    totr = tn + 1
    ts.cell(totr, 1, "Total")
    for c in (2, 3, 4, 5, 6, 8, 10, 11, 14, 15, 16):
        col = get_column_letter(c)
        ts.cell(totr, c, f"=SUM({col}{t1}:{col}{tn})")
    ts.cell(totr, 7, f"=IFERROR(E{totr}/F{totr},0)")
    ts.cell(totr, 13, f"=IFERROR(K{totr}/C{totr},0)")
    fmt = {3: USD, 7: PCT, 8: USD, 9: USD2, 10: USD, 11: USD, 12: USD, 13: PCT, 15: USD, 16: USD, 17: "0.0"}
    for row in ts.iter_rows(min_row=t1, max_row=totr):
        for cell in row:
            cell.font = BOLD if cell.row == totr or cell.column == 17 else BODY
            if cell.column in fmt:
                cell.number_format = fmt[cell.column]
            cell.border = THIN
    for c, w in enumerate([26, 10, 12, 10, 11, 12, 11, 14, 12, 11, 13, 13, 9, 9, 13, 12, 12, 7], start=1):
        ts.column_dimensions[get_column_letter(c)].width = w

    rr = totr + 2
    ts.cell(rr, 1, "RECOMMENDATION — invest more in:").font = Font(name=FONT, bold=True, size=12)
    ts.cell(rr, 3, f"=INDEX(A{t1}:A{tn},MATCH(MAX(Q{t1}:Q{tn}),Q{t1}:Q{tn},0))")
    ts.cell(rr, 3).font = Font(name=FONT, bold=True, size=12, color=TEAL)
    ts.cell(rr + 1, 1, "Runner-up:").font = BOLD
    ts.cell(rr + 1, 3, f"=INDEX(A{t1}:A{tn},MATCH(2,R{t1}:R{tn},0))")
    ts.cell(rr + 2, 1, "Best ROI (most profit per $ invested):").font = BOLD
    ts.cell(rr + 2, 3, f"=INDEX(A{t1}:A{tn},MATCH(MAX(M{t1}:M{tn}),M{t1}:M{tn},0))")
    ts.cell(rr + 3, 1, "Busiest (highest utilization):").font = BOLD
    ts.cell(rr + 3, 3, f"=INDEX(A{t1}:A{tn},MATCH(MAX(G{t1}:G{tn}),G{t1}:G{tn},0))")
    ts.cell(rr + 4, 1, "Weakest (lowest score):").font = BOLD
    ts.cell(rr + 4, 3, f"=INDEX(A{t1}:A{tn},MATCH(MIN(Q{t1}:Q{tn}),Q{t1}:Q{tn},0))")

    # Expenses by category (feeds the pie on the dashboard)
    cr = rr + 7
    ts.cell(cr, 1, "Expenses by category")
    ts.cell(cr, 2, "Amount")
    style_header(ts, cr, 2)
    for i, cat in enumerate(CATEGORIES, start=1):
        ts.cell(cr + i, 1, cat).font = BODY
        ts.cell(cr + i, 2, f'=SUMIFS({E("G")},{E("C")},$A{cr + i})').number_format = USD
    c1, cn = cr + 1, cr + len(CATEGORIES)
    ts.freeze_panes = f"B{t1}"

    bar = BarChart()
    bar.type = "col"
    bar.title = "Rental revenue vs expenses by type"
    bar.y_axis.numFmt = '"$"#,##0'
    bar.height, bar.width = 8, 16
    bar.add_data(Reference(ts, min_col=8, min_row=hr, max_row=tn), titles_from_data=True)
    bar.add_data(Reference(ts, min_col=10, min_row=hr, max_row=tn), titles_from_data=True)
    bar.set_categories(Reference(ts, min_col=1, min_row=t1, max_row=tn))
    bar.series[0].graphicalProperties.solidFill = TEAL
    bar.series[1].graphicalProperties.solidFill = "F59E0B"

    util = BarChart()
    util.type = "bar"
    util.title = "Utilization by type"
    util.y_axis.numFmt = "0%"
    util.y_axis.scaling.min = 0
    util.y_axis.scaling.max = 1
    util.height, util.width = 8, 12
    util.legend = None
    util.add_data(Reference(ts, min_col=7, min_row=hr, max_row=tn), titles_from_data=True)
    util.set_categories(Reference(ts, min_col=1, min_row=t1, max_row=tn))
    util.series[0].graphicalProperties.solidFill = "2563EB"
    util.dataLabels = DataLabelList()
    util.dataLabels.showVal = True

    score = BarChart()
    score.type = "bar"
    score.title = "Investment score (0-100)"
    score.height, score.width = 8, 12
    score.legend = None
    score.add_data(Reference(ts, min_col=17, min_row=hr, max_row=tn), titles_from_data=True)
    score.set_categories(Reference(ts, min_col=1, min_row=t1, max_row=tn))
    score.series[0].graphicalProperties.solidFill = TEAL
    score.dataLabels = DataLabelList()
    score.dataLabels.showVal = True

    pie = PieChart()
    pie.title = "Expenses by category"
    pie.height, pie.width = 8, 12
    pie.add_data(Reference(ts, min_col=2, min_row=cr, max_row=cn), titles_from_data=True)
    pie.set_categories(Reference(ts, min_col=1, min_row=c1, max_row=cn))
    pie.dataLabels = DataLabelList()
    pie.dataLabels.showPercent = True

    # -------------------------------------------------------------- Dashboard
    dash["A1"] = "Mekong Wheels Co., Ltd. — Management Dashboard"
    dash["A1"].font = Font(name=FONT, bold=True, size=18, color=TEAL)
    dash["A2"] = f"Vehicle Sales & Rental · {start:%d %b %Y} – {end:%d %b %Y} · source: system database"
    dash["A2"].font = Font(name=FONT, italic=True, color="64748B")
    mt = f"Monthly!{{c}}{tr}"
    kpis = [
        ("Rental revenue", f"={mt.format(c='B')}", USD),
        ("Sales revenue", f"={mt.format(c='C')}", USD),
        ("Sales profit", f"={mt.format(c='D')}", USD),
        ("Expenses", f"={mt.format(c='E')}", USD),
        ("Net profit", f"={mt.format(c='F')}", USD),
        ("Bookings", f"={mt.format(c='G')}", "#,##0"),
        ("Fleet utilization", f"='By Type'!G{totr}", PCT),
        ("Invest more in", f"='By Type'!C{rr}", "@"),
    ]
    for i, (label, formula, f) in enumerate(kpis):
        col = 1 + (i % 4) * 3
        row = 4 + (i // 4) * 3
        dash.cell(row, col, label).font = Font(name=FONT, size=9, color="64748B", bold=True)
        cell = dash.cell(row + 1, col, formula)
        cell.font = Font(name=FONT, size=16, bold=True, color="008000" if i < 7 else TEAL)
        cell.number_format = f
        dash.merge_cells(start_row=row + 1, start_column=col, end_row=row + 1, end_column=col + 1)
    for c in range(1, 13):
        dash.column_dimensions[get_column_letter(c)].width = 12
    dash.row_dimensions[5].height = dash.row_dimensions[8].height = 24

    dash_line = LineChart()
    dash_line.title = "Monthly trend"
    dash_line.y_axis.numFmt = '"$"#,##0'
    dash_line.height, dash_line.width = 8, 22
    for col in (2, 3, 5):
        dash_line.add_data(Reference(ms, min_col=col, min_row=4, max_row=last), titles_from_data=True)
    dash_line.set_categories(Reference(ms, min_col=1, min_row=first, max_row=last))
    dash_line.series[0].trendline = Trendline(trendlineType="linear")
    for s, color in zip(dash_line.series, (TEAL, "2563EB", "F59E0B")):
        s.graphicalProperties.line.solidFill = color
        s.smooth = False
    dash.add_chart(dash_line, "A11")
    dash.add_chart(score, "A28")
    dash.add_chart(util, "G28")
    dash.add_chart(bar, "A45")
    dash.add_chart(pie, "G45")
    dash.sheet_view.showGridLines = False

    # ------------------------------------------------------------------ Notes
    notes = wb.create_sheet("Notes")
    for line_ in [
        "About this workbook",
        "",
        "Company: Mekong Wheels Co., Ltd. (simulated) — vehicle sales & rental, Phnom Penh.",
        f"Period: {start:%d %b %Y} to {end:%d %b %Y}. Generated by tools/build_excel.py from backend/database/database.sqlite.",
        "Raw data sheets (Vehicles, Bookings, Sales, Expenses) are values exported from the system; all other figures are formulas.",
        "Rental revenue = bookings with status 'returned' or 'active', dated by start date. Cancelled and future reservations are excluded.",
        "Available days = days each rental vehicle was owned during the period (see Vehicles!O). Utilization = rented days / available days.",
        "Expenses marked '(general)' are company overheads (rent, utilities) not tied to a vehicle type; they count in totals, not in By Type.",
        "Net profit = rental revenue + sales profit − all expenses (before tax, depreciation and staff salaries).",
        "Score = weights on 'By Type'!B4:B6 × (ROI, utilization, profit per vehicle), each scaled against the best type. Matches the app's Reports screen.",
        "Colour code: blue on yellow = input you may change; green = link to another sheet; black = formula.",
    ]:
        notes.append([line_])
    notes["A1"].font = Font(name=FONT, bold=True, size=14)
    for r in range(2, notes.max_row + 1):
        notes.cell(r, 1).font = BODY
    notes.column_dimensions["A"].width = 140

    wb.calculation.fullCalcOnLoad = True  # Excel computes every formula on open
    OUT.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT)
    print(f"Wrote {OUT}  (bookings {len(bookings)}, sales {len(sales)}, expenses {len(expenses)}, vehicles {len(vehicles)})")


if __name__ == "__main__":
    main()
