// Canonical sale-expense categories (Expense entity) shared by the logging form
// and the review/edit list, so the two can never drift apart.
export const EXPENSE_CATEGORY_OPTIONS = [
  { value: 'advertising_marketing', label: 'Advertising & Marketing' },
  { value: 'signage_banners', label: 'Signage & Banners' },
  { value: 'supplies_materials', label: 'Supplies & Materials' },
  { value: 'labor_wages', label: 'Labor / Wages (no hours tracked)' },
  { value: 'transportation_fuel', label: 'Transportation & Fuel' },
  { value: 'processing_fees', label: 'Card / Processing Fees' },
  { value: 'professional_services', label: 'Outside / Professional Services' },
  { value: 'cleaning_services', label: 'Cleaning Services' },
  { value: 'dumpster_disposal', label: 'Dumpster & Disposal' },
  { value: 'equipment_rental', label: 'Equipment Rental' },
  { value: 'photography', label: 'Photography' },
  { value: 'staging_setup', label: 'Staging & Setup' },
  { value: 'meals_entertainment', label: 'Meals (Sale Day Crew)' },
  { value: 'permits_licenses', label: 'Permits & Licenses' },
  { value: 'other', label: 'Other Direct Expense' },
];

export const expenseCategoryLabel = (value) =>
  EXPENSE_CATEGORY_OPTIONS.find(c => c.value === value)?.label || value || 'Uncategorized';

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'check', label: 'Check' },
  { value: 'company_card', label: 'Company Card' },
];