import { addDays, date, daysBetween, isoDate, money, money0, num, pct, vehicleName } from './format'

describe('daysBetween', () => {
  it('counts both ends, like the server: a same-day hire is one day', () => {
    expect(daysBetween('2026-05-10', '2026-05-10')).toBe(1)
    expect(daysBetween('2026-05-10', '2026-05-12')).toBe(3)
  })

  it('crosses month and year ends', () => {
    expect(daysBetween('2026-01-30', '2026-02-02')).toBe(4)
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(2)
  })

  it('handles a leap day', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(3)
  })
})

describe('addDays', () => {
  it('moves forwards and backwards across months', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-05-10', 0)).toBe('2026-05-10')
  })
})

describe('isoDate', () => {
  it('uses the local calendar date, not UTC', () => {
    // 00:30 local on 11 Nov would already be 10 Nov in UTC east of Greenwich.
    expect(isoDate(new Date(2026, 10, 11, 0, 30))).toBe('2026-11-11')
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('money and numbers', () => {
  it('formats US dollars with cents', () => {
    expect(money(1234.5)).toBe('$1,234.50')
    expect(money(0)).toBe('$0.00')
    expect(money(null)).toBe('$0.00')
    expect(money(undefined)).toBe('$0.00')
  })

  it('formats negative amounts (discounts)', () => {
    expect(money(-0.4)).toBe('-$0.40')
  })

  it('rounds to whole dollars for headline numbers', () => {
    expect(money0(336697.4)).toBe('$336,697')
  })

  it('formats percentages and counts', () => {
    expect(pct(0.405)).toBe('40.5%')
    expect(pct(0.5, 0)).toBe('50%')
    expect(num(12120)).toBe('12,120')
  })
})

describe('date', () => {
  it('shows a readable date', () => {
    expect(date('2026-05-10')).toBe('10 May 2026')
  })

  it('shows a dash for missing values and passes through junk', () => {
    expect(date(null)).toBe('—')
    expect(date('')).toBe('—')
    expect(date('not a date')).toBe('not a date')
  })
})

describe('vehicleName', () => {
  it('joins brand and model', () => {
    expect(vehicleName({ brand: 'Toyota', model: 'Camry' })).toBe('Toyota Camry')
    expect(vehicleName(null)).toBe('—')
  })
})
