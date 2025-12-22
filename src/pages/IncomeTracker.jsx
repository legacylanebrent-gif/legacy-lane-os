import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, DollarSign, TrendingUp, TrendingDown, Calendar, Download, 
  Upload, Receipt, Filter, Building2, ShoppingBag, Users, Calculator
} from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format } from 'date-fns';

const INCOME_CATEGORY_OPTIONS = [
  { value: 'estate_sale', label: 'Estate Sale Revenue', icon: Building2 },
  { value: 'marketplace_sale', label: 'Marketplace Sale', icon: ShoppingBag },
  { value: 'referral_commission', label: 'Referral Commission', icon: Users },
  { value: 'course_sale', label: 'Course Sale', icon: TrendingUp },
  { value: 'consulting', label: 'Consulting', icon: TrendingUp },
  { value: 'commission', label: 'Commission', icon: DollarSign },
  { value: 'rental_income', label: 'Rental Income', icon: Building2 },
  { value: 'other', label: 'Other Income', icon: DollarSign }
];

const COLORS = ['#0891b2', '#f97316', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];

// State income tax rates (2024 - flat or average rate for simplicity)
const STATE_TAX_RATES = {
  'AL': 0.05, 'AK': 0, 'AZ': 0.045, 'AR': 0.055, 'CA': 0.093,
  'CO': 0.044, 'CT': 0.0699, 'DE': 0.066, 'FL': 0, 'GA': 0.0575,
  'HI': 0.11, 'ID': 0.058, 'IL': 0.0495, 'IN': 0.0323, 'IA': 0.06,
  'KS': 0.057, 'KY': 0.05, 'LA': 0.0425, 'ME': 0.0715, 'MD': 0.0575,
  'MA': 0.05, 'MI': 0.0425, 'MN': 0.0985, 'MS': 0.05, 'MO': 0.054,
  'MT': 0.0675, 'NE': 0.0684, 'NV': 0, 'NH': 0, 'NJ': 0.1075,
  'NM': 0.059, 'NY': 0.109, 'NC': 0.0475, 'ND': 0.029, 'OH': 0.0399,
  'OK': 0.05, 'OR': 0.099, 'PA': 0.0307, 'RI': 0.0599, 'SC': 0.07,
  'SD': 0, 'TN': 0, 'TX': 0, 'UT': 0.0485, 'VT': 0.0875, 'VA': 0.0575,
  'WA': 0, 'WV': 0.065, 'WI': 0.0765, 'WY': 0
};

// Tax brackets for 2024 (simplified for self-employed)
const TAX_RATES = {
  federal: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 }
  ],
  selfEmployment: 0.153 // 15.3% for Social Security and Medicare
};

export default function IncomeTracker() {
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [filteredIncome, setFilteredIncome] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [dateFilter, setDateFilter] = useState('this_year');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  const [formData, setFormData] = useState({
    income_date: new Date().toISOString().split('T')[0],
    source: '',
    amount: '',
    category: 'other',
    description: '',
    payment_method: 'cash',
    invoice_url: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterIncome();
  }, [dateFilter, categoryFilter, income]);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      // Load manual income entries
      const incomeData = await base44.entities.Income.filter({ created_by: user.email }, '-income_date');
      
      // Load estate sales
      const estateSales = await base44.entities.EstateSale.filter({ operator_id: user.id });
      
      // Load transactions from worksheets for all sales
      const transactions = await base44.entities.Transaction.filter({ created_by: user.email });
      
      // Group transactions by sale and sum company_amount (20% commission)
      const saleIncomeMap = {};
      transactions.forEach(txn => {
        if (!saleIncomeMap[txn.sale_id]) {
          saleIncomeMap[txn.sale_id] = 0;
        }
        saleIncomeMap[txn.sale_id] += txn.company_amount || (txn.total * 0.20);
      });

      // Create automated income entries from worksheet transactions
      const automatedIncome = estateSales
        .filter(sale => saleIncomeMap[sale.id] > 0)
        .map(sale => ({
          id: `auto-sale-${sale.id}`,
          income_date: sale.sale_dates?.[0]?.date || sale.created_date,
          source: sale.title,
          amount: saleIncomeMap[sale.id],
          category: 'estate_sale',
          description: `Commission from estate sale worksheet`,
          reference_id: sale.id,
          is_automated: true
        }));

      const allIncome = [...incomeData, ...automatedIncome];
      setIncome(allIncome);

      // Load business expenses
      const businessExpensesData = await base44.entities.BusinessExpense.filter({ created_by: user.email });
      
      // Load sale-specific expenses
      const saleExpensesData = await base44.entities.Expense.filter({ created_by: user.email });
      
      // Combine all expenses for tax calculation
      const allExpenses = [
        ...businessExpensesData,
        ...saleExpensesData.map(e => ({
          ...e,
          expense_date: e.date,
          tax_deductible: true,
          business_use_percentage: 100
        }))
      ];
      
      setExpenses(allExpenses);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterIncome = () => {
    let filtered = [...income];

    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      if (dateFilter === 'this_month') {
        filterDate.setMonth(now.getMonth(), 1);
      } else if (dateFilter === 'this_quarter') {
        const quarter = Math.floor(now.getMonth() / 3);
        filterDate.setMonth(quarter * 3, 1);
      } else if (dateFilter === 'this_year') {
        filterDate.setMonth(0, 1);
      }

      filtered = filtered.filter(i => new Date(i.income_date) >= filterDate);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(i => i.category === categoryFilter);
    }

    setFilteredIncome(filtered);
  };

  const handleInvoiceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingInvoice(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, invoice_url: file_url });
    } catch (error) {
      console.error('Error uploading invoice:', error);
      alert('Failed to upload invoice');
    } finally {
      setUploadingInvoice(false);
    }
  };

  const handleAddIncome = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await base44.entities.Income.create({
        ...formData,
        amount: parseFloat(formData.amount)
      });

      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error adding income:', error);
      alert('Failed to add income');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      income_date: new Date().toISOString().split('T')[0],
      source: '',
      amount: '',
      category: 'other',
      description: '',
      payment_method: 'cash',
      invoice_url: ''
    });
  };

  const handleExportCSV = () => {
    const csv = [
      ['Date', 'Source', 'Category', 'Amount', 'Payment Method', 'Description'].join(','),
      ...filteredIncome.map(i => [
        i.income_date,
        i.source,
        i.category.replace(/_/g, ' '),
        i.amount,
        i.payment_method || 'N/A',
        i.description || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-tracker-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Calculate tax estimates
  const calculateTaxes = () => {
    const totalIncome = filteredIncome.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenses
      .filter(e => {
        if (dateFilter === 'all') return true;
        const now = new Date();
        const expenseDate = new Date(e.expense_date);
        const filterDate = new Date();
        
        if (dateFilter === 'this_month') {
          filterDate.setMonth(now.getMonth(), 1);
        } else if (dateFilter === 'this_quarter') {
          const quarter = Math.floor(now.getMonth() / 3);
          filterDate.setMonth(quarter * 3, 1);
        } else if (dateFilter === 'this_year') {
          filterDate.setMonth(0, 1);
        }
        
        return expenseDate >= filterDate;
      })
      .reduce((sum, e) => sum + (e.tax_deductible ? e.amount * (e.business_use_percentage / 100) : 0), 0);

    const netIncome = totalIncome - totalExpenses;

    // Calculate self-employment tax
    const selfEmploymentTax = netIncome * TAX_RATES.selfEmployment;

    // Calculate federal income tax (simplified progressive)
    let federalTax = 0;
    let remainingIncome = netIncome;
    for (const bracket of TAX_RATES.federal) {
      const taxableInThisBracket = Math.min(
        Math.max(0, remainingIncome),
        bracket.max - bracket.min
      );
      federalTax += taxableInThisBracket * bracket.rate;
      remainingIncome -= taxableInThisBracket;
      if (remainingIncome <= 0) break;
    }

    // Get state tax rate from user's business address
    let stateRate = 0.05; // Default 5% if state not found
    let userState = 'Unknown';
    
    if (currentUser?.business_address) {
      // Try to extract state from business_address string
      const stateMatch = currentUser.business_address.match(/\b([A-Z]{2})\b/);
      if (stateMatch) {
        userState = stateMatch[1];
        stateRate = STATE_TAX_RATES[userState] || 0.05;
      }
    }

    // Calculate state tax
    const stateTax = netIncome * stateRate;

    const totalTax = selfEmploymentTax + federalTax + stateTax;

    return {
      totalIncome,
      totalExpenses,
      netIncome,
      selfEmploymentTax,
      federalTax,
      stateTax,
      totalTax,
      effectiveRate: netIncome > 0 ? (totalTax / netIncome) * 100 : 0,
      userState,
      stateRate
    };
  };

  const taxes = calculateTaxes();

  // Analytics data
  const categoryData = INCOME_CATEGORY_OPTIONS.map(cat => ({
    name: cat.label,
    value: filteredIncome.filter(i => i.category === cat.value).reduce((sum, i) => sum + i.amount, 0)
  })).filter(d => d.value > 0);

  const monthlyData = (() => {
    const months = {};
    filteredIncome.forEach(i => {
      const month = format(new Date(i.income_date), 'MMM yyyy');
      months[month] = (months[month] || 0) + i.amount;
    });
    
    const expensesByMonth = {};
    expenses
      .filter(e => {
        if (dateFilter === 'all') return true;
        const now = new Date();
        const expenseDate = new Date(e.expense_date);
        const filterDate = new Date();
        
        if (dateFilter === 'this_month') {
          filterDate.setMonth(now.getMonth(), 1);
        } else if (dateFilter === 'this_quarter') {
          const quarter = Math.floor(now.getMonth() / 3);
          filterDate.setMonth(quarter * 3, 1);
        } else if (dateFilter === 'this_year') {
          filterDate.setMonth(0, 1);
        }
        
        return expenseDate >= filterDate;
      })
      .forEach(e => {
        const month = format(new Date(e.expense_date), 'MMM yyyy');
        expensesByMonth[month] = (expensesByMonth[month] || 0) + e.amount;
      });

    const allMonths = [...new Set([...Object.keys(months), ...Object.keys(expensesByMonth)])];
    return allMonths.map(month => ({
      month,
      income: months[month] || 0,
      expenses: expensesByMonth[month] || 0,
      profit: (months[month] || 0) - (expensesByMonth[month] || 0)
    })).sort((a, b) => new Date(a.month) - new Date(b.month));
  })();

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Income Tracker</h1>
          <p className="text-slate-600">Track your income and estimate taxes</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Income
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Income</p>
                <p className="text-3xl font-bold text-green-600">${taxes.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Expenses</p>
                <p className="text-3xl font-bold text-red-600">${taxes.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Net Profit</p>
                <p className="text-3xl font-bold text-cyan-600">${taxes.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Est. Taxes</p>
                <p className="text-3xl font-bold text-orange-600">${taxes.totalTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calculator className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tax Breakdown */}
      <Card className="bg-gradient-to-br from-orange-50 to-cyan-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Tax Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-sm font-medium text-slate-700">Self-Employment Tax (15.3%)</span>
                <span className="font-bold text-slate-900">${taxes.selfEmploymentTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-sm font-medium text-slate-700">Federal Income Tax (Progressive)</span>
                <span className="font-bold text-slate-900">${taxes.federalTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-sm font-medium text-slate-700">
                  State Tax ({taxes.userState} - {(taxes.stateRate * 100).toFixed(1)}%)
                </span>
                <span className="font-bold text-slate-900">${taxes.stateTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-white rounded-lg border-2 border-orange-300">
                <p className="text-sm text-slate-600 mb-1">Total Tax Liability</p>
                <p className="text-3xl font-bold text-orange-600">${taxes.totalTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-slate-500 mt-1">Effective rate: {taxes.effectiveRate.toFixed(2)}%</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-slate-600 mb-1">Quarterly Payment</p>
                  <p className="text-lg font-bold text-slate-900">${(taxes.totalTax / 4).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-slate-600 mb-1">Monthly Estimate</p>
                  <p className="text-lg font-bold text-slate-900">${(taxes.totalTax / 12).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-slate-700">
              <strong>Note:</strong> These are estimates only. Actual taxes may vary based on deductions, credits, and your specific situation. 
              Consult with a tax professional for accurate tax planning.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters & Export */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Filters:</span>
            </div>
            <Tabs value={dateFilter} onValueChange={setDateFilter}>
              <TabsList>
                <TabsTrigger value="this_month">This Month</TabsTrigger>
                <TabsTrigger value="this_quarter">This Quarter</TabsTrigger>
                <TabsTrigger value="this_year">This Year</TabsTrigger>
                <TabsTrigger value="all">All Time</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {INCOME_CATEGORY_OPTIONS.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto">
              <Button onClick={handleExportCSV} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Income by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="income" fill="#10b981" name="Income" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Profit Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Profit Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Legend />
              <Line type="monotone" dataKey="profit" stroke="#0891b2" strokeWidth={2} name="Net Profit" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Income Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Income</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Source</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Category</th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-700">Amount</th>
                  <th className="text-center p-3 text-sm font-semibold text-slate-700">Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncome.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center p-8 text-slate-500">
                      No income recorded yet. Add your first income entry to get started.
                    </td>
                  </tr>
                ) : (
                  filteredIncome.map((inc, idx) => (
                    <tr key={inc.id || idx} className="border-b hover:bg-slate-50">
                      <td className="p-3 text-sm">{format(new Date(inc.income_date), 'MMM d, yyyy')}</td>
                      <td className="p-3">
                        <div className="font-medium text-slate-900">{inc.source}</div>
                        {inc.description && (
                          <div className="text-xs text-slate-500">{inc.description}</div>
                        )}
                      </td>
                      <td className="p-3 text-sm">
                        {INCOME_CATEGORY_OPTIONS.find(c => c.value === inc.category)?.label}
                      </td>
                      <td className="p-3 text-right font-semibold text-green-600">
                        ${inc.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        {inc.is_automated ? (
                          <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-700">
                            Auto
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 border-slate-300 text-slate-700">
                            Manual
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Income Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Add Income</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddIncome} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.income_date}
                  onChange={(e) => setFormData({ ...formData, income_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Source *</Label>
              <Input
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="Who paid you?"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_CATEGORY_OPTIONS.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Payment Method</Label>
                <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="venmo">Venmo</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional notes about this income..."
                rows={3}
              />
            </div>

            <div>
              <Label>Invoice/Receipt</Label>
              <Input type="file" onChange={handleInvoiceUpload} disabled={uploadingInvoice} />
              {uploadingInvoice && <span className="text-sm text-slate-500 mt-2">Uploading...</span>}
              {formData.invoice_url && (
                <p className="text-sm text-green-600 mt-2">✓ Invoice uploaded</p>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700">Add Income</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}