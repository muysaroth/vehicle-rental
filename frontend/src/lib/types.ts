export type Role = 'admin' | 'manager' | 'staff'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  is_active: boolean
}

export type VehicleType = 'car' | 'suv' | 'van' | 'pickup' | 'motorbike'
export type VehiclePurpose = 'rent' | 'sale' | 'both'
export type VehicleStatus = 'available' | 'reserved' | 'rented' | 'maintenance' | 'sold'

export const VEHICLE_TYPES: VehicleType[] = ['car', 'suv', 'van', 'pickup', 'motorbike']

export interface Vehicle {
  id: number
  plate_no: string
  brand: string
  model: string
  year: number
  type: VehicleType
  color: string | null
  seats: number
  purpose: VehiclePurpose
  status: VehicleStatus
  daily_rate: number
  sale_price: number
  purchase_cost: number
  purchased_on: string | null
  mileage: number
  notes: string | null
  rentals_count?: number
}

export interface Customer {
  id: number
  name: string
  phone: string
  email: string | null
  id_card_no: string | null
  license_no: string | null
  address: string | null
  notes: string | null
  bookings_count?: number
  sales_count?: number
  rental_spend?: number | null
  purchase_spend?: number | null
  bookings?: Booking[]
  sales?: Sale[]
}

export type PaymentMethod = 'cash' | 'bank' | 'card'

export interface Payment {
  id: number
  amount: number
  method: PaymentMethod
  paid_at: string
  reference: string | null
  user?: { id: number; name: string }
}

export type BookingStatus = 'reserved' | 'active' | 'returned' | 'cancelled'

type VehicleRef = Pick<Vehicle, 'id' | 'plate_no' | 'brand' | 'model' | 'type'> & Partial<Vehicle>
type CustomerRef = Pick<Customer, 'id' | 'name' | 'phone'> & Partial<Customer>

export interface Booking {
  id: number
  booking_no: string
  customer_id: number
  vehicle_id: number
  start_date: string
  end_date: string
  days: number
  daily_rate: number
  discount: number
  late_fee: number
  total: number
  deposit: number
  status: BookingStatus
  picked_up_at: string | null
  returned_at: string | null
  pickup_mileage: number | null
  return_mileage: number | null
  notes: string | null
  paid: number
  balance: number
  customer?: CustomerRef
  vehicle?: VehicleRef
  user?: { id: number; name: string }
  payments?: Payment[]
  created_at: string
}

export type SaleMethod = 'cash' | 'bank' | 'installment'

export interface Sale {
  id: number
  sale_no: string
  sale_date: string
  price: number
  discount: number
  total: number
  cost: number
  payment_method: SaleMethod
  notes: string | null
  paid: number
  balance: number
  customer?: CustomerRef
  vehicle?: VehicleRef
  user?: { id: number; name: string }
  payments?: Payment[]
}

export type ExpenseCategory = 'maintenance' | 'insurance' | 'fuel' | 'cleaning' | 'other'

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['maintenance', 'insurance', 'fuel', 'cleaning', 'other']

export interface Expense {
  id: number
  vehicle_id: number | null
  spent_on: string
  category: ExpenseCategory
  amount: number
  description: string | null
  vehicle?: VehicleRef | null
  user?: { id: number; name: string }
}

export interface Dashboard {
  fleet: {
    total: number
    rentable: number
    available: number
    reserved: number
    rented: number
    maintenance: number
    for_sale: number
    utilization: number
    by_type: Partial<Record<VehicleType, number>>
  }
  month: { rental_revenue: number; sales_revenue: number; expenses: number; collected: number }
  outstanding: number
  active_rentals: number
  overdue: Booking[]
  pickups_today: Booking[]
  returns_today: Booking[]
  customers: number
}

export interface TypePerformance {
  type: VehicleType
  fleet: number
  investment: number
  bookings: number
  rented_days: number
  available_days: number
  utilization: number
  rental_revenue: number
  avg_daily_rate: number
  expenses: number
  rental_profit: number
  profit_per_vehicle: number
  roi: number
  units_sold: number
  sales_revenue: number
  sales_profit: number
  sales_margin: number
}

export interface MonthRow {
  month: string
  rental_revenue: number
  sales_revenue: number
  expenses: number
  bookings: number
  units_sold: number
}

export interface Performance {
  from: string
  to: string
  period_days: number
  totals: {
    rental_revenue: number
    sales_revenue: number
    sales_profit: number
    expenses: number
    bookings: number
    units_sold: number
    net_profit: number
  }
  types: TypePerformance[]
  recommendation: {
    best: VehicleType | null
    ranking: { type: VehicleType; score: number; roi: number; utilization: number; profit_per_vehicle: number }[]
  }
  monthly: MonthRow[]
  top_customers: { id: number; name: string; phone: string; rentals: number; purchases: number; spend: number }[]
  top_vehicles: { id: number; plate_no: string; name: string; type: VehicleType; bookings: number; rented_days: number; revenue: number; expenses: number }[]
  expenses_by_category: Partial<Record<ExpenseCategory, number>>
}

export type ActivityAction = 'created' | 'updated' | 'deleted' | 'login' | 'logout' | 'password'

export interface ActivityLog {
  id: number
  user_id: number | null
  user_name: string | null
  action: ActivityAction
  subject_type: string | null
  subject_id: number | null
  subject_label: string | null
  changes: Record<string, unknown> | null
  ip: string | null
  created_at: string
}

export interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
}

/** Company details printed on invoices and contracts (backend config/rental.php). */
export interface Company {
  name: string
  address: string
  phone: string
  email: string
  tax_id: string
}
