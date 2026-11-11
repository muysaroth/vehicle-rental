import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export type Lang = 'km' | 'en'

/** Every label on screen, in Khmer and English. Missing keys fall back to English, then the key. */
const dict = {
  appName: ['Mekong Wheels', 'Mekong Wheels'],
  appTagline: ['ប្រព័ន្ធគ្រប់គ្រងការលក់ និងជួលយានយន្ត', 'Vehicle Sales & Rental Management System'],

  // navigation
  dashboard: ['ផ្ទាំងគ្រប់គ្រង', 'Dashboard'],
  bookings: ['ការជួល', 'Rentals'],
  sales: ['ការលក់', 'Sales'],
  vehicles: ['យានយន្ត', 'Vehicles'],
  customers: ['អតិថិជន', 'Customers'],
  expenses: ['ចំណាយ', 'Expenses'],
  reports: ['របាយការណ៍ & ការសម្រេចចិត្ត', 'Reports & Decisions'],
  users: ['អ្នកប្រើប្រាស់', 'Users'],
  logout: ['ចាកចេញ', 'Sign out'],
  darkMode: ['របៀបងងឹត', 'Dark mode'],
  lightMode: ['របៀបភ្លឺ', 'Light mode'],
  menu: ['ម៉ឺនុយ', 'Menu'],
  welcomeBack: ['សូមស្វាគមន៍ការត្រឡប់មកវិញ', 'Welcome back'],
  signInHint: ['សូមចូលគណនីរបស់អ្នក ដើម្បីបន្ត', 'Sign in to your account to continue'],

  // auth
  signIn: ['ចូលប្រព័ន្ធ', 'Sign in'],
  email: ['អ៊ីមែល', 'Email'],
  password: ['ពាក្យសម្ងាត់', 'Password'],
  demoAccounts: ['គណនីសាកល្បង', 'Demo accounts'],

  // common
  add: ['បន្ថែម', 'Add'],
  edit: ['កែ', 'Edit'],
  save: ['រក្សាទុក', 'Save'],
  cancel: ['បោះបង់', 'Cancel'],
  close: ['បិទ', 'Close'],
  delete: ['លុប', 'Delete'],
  search: ['ស្វែងរក…', 'Search…'],
  all: ['ទាំងអស់', 'All'],
  actions: ['សកម្មភាព', 'Actions'],
  notes: ['កំណត់សម្គាល់', 'Notes'],
  date: ['កាលបរិច្ឆេទ', 'Date'],
  from: ['ពី', 'From'],
  to: ['ដល់', 'To'],
  total: ['សរុប', 'Total'],
  paid: ['បានបង់', 'Paid'],
  balance: ['នៅជំពាក់', 'Balance'],
  amount: ['ចំនួនទឹកប្រាក់', 'Amount'],
  method: ['មធ្យោបាយ', 'Method'],
  discount: ['បញ្ចុះតម្លៃ', 'Discount'],
  status: ['ស្ថានភាព', 'Status'],
  type: ['ប្រភេទ', 'Type'],
  staff: ['បុគ្គលិក', 'Staff'],
  noData: ['មិនមានទិន្នន័យ', 'No data'],
  loading: ['កំពុងផ្ទុក…', 'Loading…'],
  confirmDelete: ['តើអ្នកប្រាកដថាចង់លុបមែនទេ?', 'Are you sure you want to delete this?'],
  saved: ['បានរក្សាទុក', 'Saved'],
  details: ['ព័ត៌មានលម្អិត', 'Details'],
  exportExcel: ['នាំចេញ Excel', 'Export Excel'],
  apply: ['អនុវត្ត', 'Apply'],
  optional: ['(មិនចាំបាច់)', '(optional)'],
  none: ['គ្មាន', 'None'],

  // vehicle
  plateNo: ['ផ្លាកលេខ', 'Plate no.'],
  brand: ['ម៉ាក', 'Brand'],
  model: ['ម៉ូដែល', 'Model'],
  year: ['ឆ្នាំ', 'Year'],
  color: ['ពណ៌', 'Color'],
  seats: ['កៅអី', 'Seats'],
  purpose: ['គោលបំណង', 'Purpose'],
  dailyRate: ['តម្លៃជួល/ថ្ងៃ', 'Daily rate'],
  salePrice: ['តម្លៃលក់', 'Sale price'],
  purchaseCost: ['ថ្លៃទិញចូល', 'Purchase cost'],
  purchasedOn: ['ថ្ងៃទិញចូល', 'Purchased on'],
  mileage: ['គីឡូម៉ែត្រ', 'Mileage (km)'],
  rentals: ['ចំនួនជួល', 'Rentals'],
  addVehicle: ['បន្ថែមយានយន្ត', 'Add vehicle'],
  editVehicle: ['កែយានយន្ត', 'Edit vehicle'],
  setMaintenance: ['ដាក់ជួសជុល', 'Send to maintenance'],
  setAvailable: ['ត្រលប់មកប្រើវិញ', 'Back in service'],
  vehicleSummary: ['{n} គ្រឿង', '{n} vehicles'],

  'type.car': ['ឡានតូច', 'Car'],
  'type.suv': ['ឡាន SUV', 'SUV'],
  'type.van': ['ឡានវ៉ាន់', 'Van'],
  'type.pickup': ['ឡានភីកអាប់', 'Pickup'],
  'type.motorbike': ['ម៉ូតូ', 'Motorbike'],

  'purpose.rent': ['ជួល', 'Rent'],
  'purpose.sale': ['លក់', 'Sale'],
  'purpose.both': ['ជួល & លក់', 'Rent & sale'],

  'vstatus.available': ['ទំនេរ', 'Available'],
  'vstatus.reserved': ['បានកក់', 'Reserved'],
  'vstatus.rented': ['កំពុងជួល', 'Rented'],
  'vstatus.maintenance': ['កំពុងជួសជុល', 'Maintenance'],
  'vstatus.sold': ['បានលក់', 'Sold'],

  // customer
  name: ['ឈ្មោះ', 'Name'],
  phone: ['ទូរស័ព្ទ', 'Phone'],
  idCard: ['អត្តសញ្ញាណប័ណ្ណ', 'ID card no.'],
  license: ['ប័ណ្ណបើកបរ', 'Driving licence'],
  address: ['អាសយដ្ឋាន', 'Address'],
  addCustomer: ['បន្ថែមអតិថិជន', 'Add customer'],
  editCustomer: ['កែអតិថិជន', 'Edit customer'],
  spend: ['ចំណាយសរុប', 'Total spend'],
  history: ['ប្រវត្តិ', 'History'],

  // booking
  bookingNo: ['លេខកក់', 'Booking no.'],
  customer: ['អតិថិជន', 'Customer'],
  vehicle: ['យានយន្ត', 'Vehicle'],
  startDate: ['ថ្ងៃចាប់ផ្តើម', 'Start date'],
  endDate: ['ថ្ងៃបញ្ចប់', 'End date'],
  days: ['ថ្ងៃ', 'Days'],
  deposit: ['ប្រាក់កក់', 'Deposit'],
  lateFee: ['ប្រាក់ពិន័យយឺត', 'Late fee'],
  newBooking: ['កក់ថ្មី', 'New rental'],
  pickup: ['ប្រគល់ឡាន', 'Pick up'],
  return: ['ទទួលឡានវិញ', 'Return'],
  cancelBooking: ['បោះបង់ការកក់', 'Cancel booking'],
  pay: ['ទទួលប្រាក់', 'Take payment'],
  overdue: ['ហួសកាលកំណត់', 'Overdue'],
  pickupsToday: ['ត្រូវប្រគល់ថ្ងៃនេះ', 'Pick-ups due'],
  returnsToday: ['ត្រូវសងថ្ងៃនេះ', 'Returns due today'],
  checkAvailability: ['ជ្រើសថ្ងៃ ដើម្បីមើលឡានទំនេរ', 'Pick dates to see available vehicles'],
  availableVehicles: ['យានយន្តទំនេរ', 'Available vehicles'],
  noAvailable: ['គ្មានយានយន្តទំនេរសម្រាប់ថ្ងៃទាំងនេះ', 'No vehicles free for these dates'],
  subtotal: ['សរុបរង', 'Subtotal'],
  pickedUpAt: ['ប្រគល់នៅ', 'Picked up'],
  returnedAt: ['ទទួលវិញនៅ', 'Returned'],
  payments: ['ការបង់ប្រាក់', 'Payments'],
  collectNow: ['ទទួលប្រាក់ឥឡូវ', 'Collect now'],
  lateDays: ['យឺត {n} ថ្ងៃ', '{n} day(s) late'],

  'bstatus.reserved': ['បានកក់', 'Reserved'],
  'bstatus.active': ['កំពុងជួល', 'On rent'],
  'bstatus.returned': ['បានសង', 'Returned'],
  'bstatus.cancelled': ['បានបោះបង់', 'Cancelled'],
  'bstatus.overdue': ['ហួសកំណត់', 'Overdue'],

  'pay.cash': ['សាច់ប្រាក់', 'Cash'],
  'pay.bank': ['ធនាគារ / ABA', 'Bank / ABA'],
  'pay.card': ['កាត', 'Card'],
  'pay.installment': ['បង់រំលស់', 'Instalment'],

  // sale
  saleNo: ['លេខលក់', 'Sale no.'],
  newSale: ['លក់ថ្មី', 'New sale'],
  price: ['តម្លៃ', 'Price'],
  amountPaid: ['ប្រាក់បង់ដំបូង', 'Amount paid now'],
  profit: ['ចំណេញ', 'Profit'],
  cost: ['ថ្លៃដើម', 'Cost'],
  forSale: ['សម្រាប់លក់', 'For sale'],
  undoSale: ['លុបការលក់', 'Undo sale'],

  // expense
  category: ['ប្រភេទចំណាយ', 'Category'],
  description: ['ការពិពណ៌នា', 'Description'],
  addExpense: ['បន្ថែមចំណាយ', 'Add expense'],
  generalExpense: ['ចំណាយទូទៅ (គ្មានឡាន)', 'General (no vehicle)'],
  'cat.maintenance': ['ថែទាំ/ជួសជុល', 'Maintenance'],
  'cat.insurance': ['ធានារ៉ាប់រង', 'Insurance'],
  'cat.fuel': ['សាំង', 'Fuel'],
  'cat.cleaning': ['លាងសម្អាត', 'Cleaning'],
  'cat.other': ['ផ្សេងៗ', 'Other'],

  // dashboard
  fleet: ['យានយន្តសរុប', 'Fleet'],
  utilization: ['អត្រាប្រើប្រាស់', 'Utilization'],
  activeRentals: ['កំពុងជួល', 'On rent'],
  monthRental: ['ចំណូលជួល ខែនេះ', 'Rental revenue (month)'],
  monthSales: ['ចំណូលលក់ ខែនេះ', 'Sales revenue (month)'],
  monthExpenses: ['ចំណាយ ខែនេះ', 'Expenses (month)'],
  collected: ['ប្រាក់ទទួលបាន ខែនេះ', 'Cash collected (month)'],
  outstanding: ['ប្រាក់ជំពាក់សរុប', 'Outstanding balances'],
  fleetStatus: ['ស្ថានភាពយានយន្ត', 'Fleet status'],
  nothingToday: ['គ្មានអ្វីត្រូវធ្វើ', 'Nothing due'],

  // reports
  decisionTitle: ['តើក្រុមហ៊ុនគួរវិនិយោគលើយានយន្តប្រភេទណាបន្ថែម?', 'Which vehicle type should the company invest more in?'],
  recommendation: ['អនុសាសន៍', 'Recommendation'],
  recommendText: [
    'ផ្អែកលើទិន្នន័យ ប្រភេទ {type} មានពិន្ទុខ្ពស់បំផុត ({score}/100)៖ ROI {roi}, អត្រាប្រើប្រាស់ {util}, ចំណេញ {ppv} ក្នុងមួយគ្រឿង។',
    'Based on the data, {type} scores highest ({score}/100): ROI {roi}, utilization {util}, profit {ppv} per vehicle.',
  ],
  scoreHelp: [
    'ពិន្ទុ = 40% ROI + 35% អត្រាប្រើប្រាស់ + 25% ចំណេញក្នុងមួយគ្រឿង (ប្រៀបធៀបនឹងប្រភេទល្អបំផុត)',
    'Score = 40% ROI + 35% utilization + 25% profit per vehicle (each relative to the best type)',
  ],
  score: ['ពិន្ទុ', 'Score'],
  rentalRevenue: ['ចំណូលជួល', 'Rental revenue'],
  salesRevenue: ['ចំណូលលក់', 'Sales revenue'],
  salesProfit: ['ចំណេញពីការលក់', 'Sales profit'],
  netProfit: ['ចំណេញសុទ្ធ', 'Net profit'],
  investment: ['ទុនវិនិយោគ', 'Investment'],
  rentedDays: ['ថ្ងៃជួល', 'Rented days'],
  avgRate: ['តម្លៃមធ្យម/ថ្ងៃ', 'Avg. rate/day'],
  rentalProfit: ['ចំណេញពីការជួល', 'Rental profit'],
  profitPerVehicle: ['ចំណេញ/គ្រឿង', 'Profit/vehicle'],
  roi: ['ROI', 'ROI'],
  unitsSold: ['លក់បាន', 'Units sold'],
  margin: ['អត្រាចំណេញ', 'Margin'],
  byType: ['តាមប្រភេទយានយន្ត', 'By vehicle type'],
  monthlyTrend: ['និន្នាការប្រចាំខែ', 'Monthly trend'],
  topCustomers: ['អតិថិជនសំខាន់ៗ', 'Top customers'],
  topVehicles: ['យានយន្តរកចំណូលច្រើនជាងគេ', 'Top earning vehicles'],
  expenseBreakdown: ['ចំណាយតាមប្រភេទ', 'Expenses by category'],
  revenueByType: ['ចំណូលជួល តាមប្រភេទ', 'Rental revenue by type'],
  utilByType: ['អត្រាប្រើប្រាស់ តាមប្រភេទ', 'Utilization by type'],
  period: ['រយៈពេល', 'Period'],
  bookingsCount: ['ចំនួនកក់', 'Bookings'],

  // users
  role: ['តួនាទី', 'Role'],
  active: ['សកម្ម', 'Active'],
  inactive: ['អសកម្ម', 'Inactive'],
  'role.admin': ['អ្នកគ្រប់គ្រងប្រព័ន្ធ', 'Administrator'],
  'role.manager': ['អ្នកគ្រប់គ្រង', 'Manager'],
  'role.staff': ['បុគ្គលិក', 'Staff'],
  addUser: ['បន្ថែមអ្នកប្រើ', 'Add user'],
  editUser: ['កែអ្នកប្រើ', 'Edit user'],
  passwordKeep: ['ទុកទទេ ដើម្បីរក្សាពាក្យសម្ងាត់ចាស់', 'Leave blank to keep the current password'],

  // account / password
  changePassword: ['ប្តូរពាក្យសម្ងាត់', 'Change password'],
  currentPassword: ['ពាក្យសម្ងាត់បច្ចុប្បន្ន', 'Current password'],
  newPassword: ['ពាក្យសម្ងាត់ថ្មី', 'New password'],
  confirmPassword: ['បញ្ជាក់ពាក្យសម្ងាត់ថ្មី', 'Confirm new password'],
  passwordRule: ['យ៉ាងតិច ៨ តួអក្សរ', 'At least 8 characters'],
  passwordMismatch: ['ពាក្យសម្ងាត់ថ្មីទាំងពីរមិនដូចគ្នា', 'The new passwords do not match'],
  passwordChanged: ['បានប្តូរពាក្យសម្ងាត់ ហើយបានចាកចេញពីឧបករណ៍ផ្សេងទៀត', 'Password changed. Other devices have been signed out.'],

  // audit log
  activity: ['កំណត់ហេតុសកម្មភាព', 'Activity log'],
  activityHelp: ['អ្នកណាបានបង្កើត កែ ឬលុបអ្វី និងនៅពេលណា', 'Who created, changed or deleted what, and when'],
  when: ['ពេលវេលា', 'When'],
  user: ['អ្នកប្រើ', 'User'],
  action: ['សកម្មភាព', 'Action'],
  record: ['កំណត់ត្រា', 'Record'],
  changes: ['ការផ្លាស់ប្តូរ', 'Changes'],
  'act.created': ['បង្កើត', 'Created'],
  'act.updated': ['កែប្រែ', 'Updated'],
  'act.deleted': ['លុប', 'Deleted'],
  'act.login': ['ចូលប្រព័ន្ធ', 'Signed in'],
  'act.logout': ['ចាកចេញ', 'Signed out'],
  'act.password': ['ប្តូរពាក្យសម្ងាត់', 'Changed password'],
  'subj.Booking': ['ការជួល', 'Rental'],
  'subj.Sale': ['ការលក់', 'Sale'],
  'subj.Vehicle': ['យានយន្ត', 'Vehicle'],
  'subj.Customer': ['អតិថិជន', 'Customer'],
  'subj.Expense': ['ចំណាយ', 'Expense'],
  'subj.Payment': ['ការបង់ប្រាក់', 'Payment'],
  'subj.User': ['អ្នកប្រើ', 'User'],
  previous: ['មុន', 'Previous'],
  next: ['បន្ទាប់', 'Next'],
  pageOf: ['ទំព័រ {page} / {pages}', 'Page {page} of {pages}'],

  // printing
  print: ['បោះពុម្ព', 'Print'],
  printContract: ['បោះពុម្ពកិច្ចសន្យា', 'Print contract'],
  printInvoice: ['បោះពុម្ពវិក្កយបត្រ', 'Print invoice'],
  rentalContract: ['កិច្ចសន្យាជួលយានយន្ត', 'Vehicle Rental Agreement'],
  saleInvoice: ['វិក្កយបត្រលក់យានយន្ត', 'Vehicle Sale Invoice'],
  receipt: ['បង្កាន់ដៃ', 'Receipt'],
  issuedOn: ['ចេញថ្ងៃ', 'Issued'],
  renter: ['អ្នកជួល', 'Renter'],
  buyer: ['អ្នកទិញ', 'Buyer'],
  rentalTerms: ['លក្ខខណ្ឌជួល', 'Rental terms'],
  term1: [
    'អ្នកជួលត្រូវប្រគល់យានយន្តវិញនៅថ្ងៃបញ្ចប់ក្នុងស្ថានភាពដូចពេលទទួល។ ការយឺតត្រូវគិតប្រាក់ពិន័យតាមតម្លៃជួលប្រចាំថ្ងៃ។',
    'The renter returns the vehicle by the end date in the condition it was received. Late returns are charged at the daily rate per extra day.',
  ],
  term2: [
    'អ្នកជួលទទួលខុសត្រូវលើការខូចខាត ការពិន័យចរាចរណ៍ និងសាំង ក្នុងរយៈពេលជួល។',
    'The renter is responsible for damage, traffic fines and fuel during the rental period.',
  ],
  term3: [
    'មិនអនុញ្ញាតឲ្យអ្នកដទៃបើកបរ ឬយកយានយន្តចេញក្រៅប្រទេស ដោយគ្មានការយល់ព្រមជាលាយលក្ខណ៍អក្សរ។',
    'No other driver and no travel abroad without written permission.',
  ],
  signatureRenter: ['ហត្ថលេខាអ្នកជួល', 'Renter signature'],
  signatureBuyer: ['ហត្ថលេខាអ្នកទិញ', 'Buyer signature'],
  signatureStaff: ['ហត្ថលេខាបុគ្គលិក', 'Staff signature'],
  thankYou: ['សូមអរគុណ!', 'Thank you!'],
  back: ['ត្រលប់ក្រោយ', 'Back'],
} satisfies Record<string, [string, string]>

export type TKey = keyof typeof dict

interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TKey | string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18n | null>(null)

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const entry = (dict as Record<string, [string, string]>)[key]
  let text = entry ? entry[lang === 'km' ? 0 : 1] : key
  for (const [k, v] of Object.entries(vars ?? {})) text = text.replace(`{${k}}`, String(v))
  return text
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('rental.lang') as Lang) || 'km')

  const setLang = (next: Lang) => {
    localStorage.setItem('rental.lang', next)
    document.documentElement.lang = next
    setLangState(next)
  }

  const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars)

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n outside I18nProvider')
  return ctx
}
