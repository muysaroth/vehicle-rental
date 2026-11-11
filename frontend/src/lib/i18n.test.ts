import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { translate } from './i18n'

describe('translate', () => {
  it('returns Khmer and English', () => {
    expect(translate('km', 'save')).toBe('រក្សាទុក')
    expect(translate('en', 'save')).toBe('Save')
  })

  it('fills in variables', () => {
    expect(translate('en', 'lateDays', { n: 3 })).toBe('3 day(s) late')
    expect(translate('km', 'lateDays', { n: 3 })).toBe('យឺត 3 ថ្ងៃ')
    expect(translate('en', 'pageOf', { page: 2, pages: 5 })).toBe('Page 2 of 5')
  })

  it('falls back to the key when a label is missing', () => {
    expect(translate('en', 'no.such.key')).toBe('no.such.key')
  })
})

/** Every source file under src/, except tests. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

describe('translations used in the screens', () => {
  const src = join(__dirname, '..')
  const files = sources(src)

  // Literal keys: t('save'), t("save"). Keys built from data (t(`type.${x}`)) are checked below.
  const keys = new Set<string>()
  for (const file of files) {
    for (const m of readFileSync(file, 'utf8').matchAll(/\bt\(\s*['"]([\w.]+)['"]/g)) keys.add(m[1])
  }

  it('finds the keys to check', () => {
    expect(keys.size).toBeGreaterThan(150)
  })

  it.each(['km', 'en'] as const)('every literal key has a %s label', (lang) => {
    const missing = [...keys].filter((k) => translate(lang, k) === k)
    expect(missing).toEqual([])
  })

  it('every value a data-driven key can take has a label in both languages', () => {
    const families: Record<string, string[]> = {
      type: ['car', 'suv', 'van', 'pickup', 'motorbike'],
      vstatus: ['available', 'reserved', 'rented', 'maintenance', 'sold'],
      bstatus: ['reserved', 'active', 'returned', 'cancelled', 'overdue'],
      purpose: ['rent', 'sale', 'both'],
      pay: ['cash', 'bank', 'card', 'installment'],
      cat: ['maintenance', 'insurance', 'fuel', 'cleaning', 'other'],
      role: ['admin', 'manager', 'staff'],
      act: ['created', 'updated', 'deleted', 'login', 'logout', 'password'],
      subj: ['Booking', 'Sale', 'Payment', 'Vehicle', 'Customer', 'Expense', 'User'],
    }
    const missing = Object.entries(families).flatMap(([prefix, values]) =>
      values.flatMap((v) => (['km', 'en'] as const).filter((lang) => translate(lang, `${prefix}.${v}`) === `${prefix}.${v}`).map((lang) => `${lang}:${prefix}.${v}`)),
    )
    expect(missing).toEqual([])
  })

  it('Khmer labels are really Khmer, not left in English', () => {
    // Labels that are legitimately the same in both languages.
    const same = new Set(['appName', 'roi'])
    const untranslated = [...keys].filter((k) => !same.has(k) && translate('km', k) === translate('en', k) && !/[ក-៿]/.test(translate('km', k)))
    expect(untranslated).toEqual([])
  })
})
