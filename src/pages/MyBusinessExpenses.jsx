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
  Plus, Upload, DollarSign, TrendingUp, Calendar, Download, 
  FileText, Repeat, Receipt, X, Filter, Car
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const CATEGORY_OPTIONS = [
  { value: 'advertising_marketing', label: 'Advertising & Marketing' },
  { value: 'auto_expenses', label: 'Auto & Vehicle' },
  { value: 'bank_fees', label: 'Bank Fees' },
  { value: 'education_training', label: 'Education & Training' },
  { value: 'equipment_tools', label: 'Equipment & Tools' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'internet_phone', label: 'Internet & Phone' },
  { value: 'legal_professional', label: 'Legal & Professional' },
  { value: 'meals_entertainment', label: 'Meals & Entertainment' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'rent_lease', label: 'Rent & Lease' },
  { value: 'repairs_maintenance', label: 'Repairs & Maintenance' },
  { value: 'software_subscriptions', label: 'Software & Subscriptions' },
  { value: 'taxes_licenses', label: 'Taxes & Licenses' },
  { value: 'travel', label: 'Travel' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'wages_payroll', label: 'Wages & Payroll' },
  { value: 'other', label: 'Other' }
];

const COLORS = ['#0891b2', '#f97316', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];

export default function MyBusinessExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [dateFilter, setDateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [scanningReceipt, setScanningReceipt] = useState(false);

  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    amount: '',
    category: 'office_supplies',
    tags: [],
    description: '',
    payment_method: 'credit_card',
    receipt_url: '',
    tax_deductible: true,
    business_use_percentage: 100
  });

  const [recurringData, setRecurringData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    amount: '',
    category: 'software_subscriptions',
    recurring_frequency: 'monthly',
    description: ''
  });

  const [mileageData, setMileageData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    starting_location: '',
    ending_location: '',
    miles_driven: '',
    rate_per_mile: '0.70',
    purpose: '',
    round_trip: false,
    vehicle_id: ''
  });

  const [newVehicleData, setNewVehicleData] = useState({
    vehicle_name: '',
    make: '',
    model: '',
    year: '',
    license_plate: '',
    is_primary: false
  });

  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [dateFilter, categoryFilter, expenses]);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const expensesData = await base44.entities.BusinessExpense.filter({ created_by: user.email }, '-expense_date');
      setExpenses(expensesData);

      const vehiclesData = await base44.entities.Vehicle.filter({ created_by: user.email });
      setVehicles(vehiclesData);
      
      // Set primary vehicle as default if exists
      const primaryVehicle = vehiclesData.find(v => v.is_primary);
      if (primaryVehicle && !mileageData.vehicle_id) {
        setMileageData(prev => ({ ...prev, vehicle_id: primaryVehicle.id }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterExpenses = () => {
    let filtered = [...expenses];

    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      if (dateFilter === 'this_month') {
        filterDate.setMonth(now.getMonth(), 1);
      } else if (dateFilter === 'last_month') {
        filterDate.setMonth(now.getMonth() - 1, 1);
      } else if (dateFilter === 'this_year') {
        filterDate.setMonth(0, 1);
      }

      filtered = filtered.filter(e => new Date(e.expense_date) >= filterDate);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(e => e.category === categoryFilter);
    }

    setFilteredExpenses(filtered);
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, receipt_url: file_url });
    } catch (error) {
      console.error('Error uploading receipt:', error);
      alert('Failed to upload receipt');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleScanReceipt = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningReceipt(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            vendor_name: { type: 'string' },
            amount: { type: 'number' },
            date: { type: 'string' },
            description: { type: 'string' }
          }
        }
      });

      if (result.status === 'success' && result.output) {
        setFormData({
          ...formData,
          vendor_name: result.output.vendor_name || '',
          amount: result.output.amount || '',
          expense_date: result.output.date || formData.expense_date,
          description: result.output.description || '',
          receipt_url: file_url
        });
        setShowScanModal(false);
        setShowAddModal(true);
      } else {
        alert('Could not extract data from receipt. Please enter manually.');
      }
    } catch (error) {
      console.error('Error scanning receipt:', error);
      alert('Failed to scan receipt');
    } finally {
      setScanningReceipt(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await base44.entities.BusinessExpense.create({
        ...formData,
        amount: parseFloat(formData.amount),
        business_use_percentage: parseFloat(formData.business_use_percentage)
      });

      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecurring = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await base44.entities.BusinessExpense.create({
        ...recurringData,
        amount: parseFloat(recurringData.amount),
        is_recurring: true,
        tax_deductible: true,
        payment_method: 'credit_card',
        tags: []
      });

      setShowRecurringModal(false);
      setRecurringData({
        expense_date: new Date().toISOString().split('T')[0],
        vendor_name: '',
        amount: '',
        category: 'software_subscriptions',
        recurring_frequency: 'monthly',
        description: ''
      });
      loadData();
    } catch (error) {
      console.error('Error adding recurring expense:', error);
      alert('Failed to add recurring expense');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMileage = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const miles = parseFloat(mileageData.miles_driven) * (mileageData.round_trip ? 2 : 1);
      const totalAmount = miles * parseFloat(mileageData.rate_per_mile);

      const vehicle = vehicles.find(v => v.id === mileageData.vehicle_id);
      const vehicleInfo = vehicle ? `\nVehicle: ${vehicle.vehicle_name}` : '';

      await base44.entities.BusinessExpense.create({
        expense_date: mileageData.expense_date,
        vendor_name: 'Vehicle Mileage',
        amount: totalAmount,
        category: 'auto_expenses',
        description: `${mileageData.starting_location} → ${mileageData.ending_location}\n${miles} miles @ $${mileageData.rate_per_mile}/mile${vehicleInfo}\nPurpose: ${mileageData.purpose}`,
        payment_method: 'cash',
        tax_deductible: true,
        tags: ['mileage', mileageData.round_trip ? 'round-trip' : 'one-way']
      });

      setShowMileageModal(false);
      const primaryVehicle = vehicles.find(v => v.is_primary);
      setMileageData({
        expense_date: new Date().toISOString().split('T')[0],
        starting_location: '',
        ending_location: '',
        miles_driven: '',
        rate_per_mile: '0.70',
        purpose: '',
        round_trip: false,
        vehicle_id: primaryVehicle?.id || ''
      });
      loadData();
    } catch (error) {
      console.error('Error adding mileage:', error);
      alert('Failed to add mileage');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newVehicle = await base44.entities.Vehicle.create({
        ...newVehicleData,
        year: newVehicleData.year ? parseInt(newVehicleData.year) : undefined
      });

      setShowAddVehicleModal(false);
      setNewVehicleData({
        vehicle_name: '',
        make: '',
        model: '',
        year: '',
        license_plate: '',
        is_primary: false
      });
      
      const vehiclesData = await base44.entities.Vehicle.filter({ created_by: currentUser.email });
      setVehicles(vehiclesData);
      setMileageData({ ...mileageData, vehicle_id: newVehicle.id });
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert('Failed to add vehicle');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      expense_date: new Date().toISOString().split('T')[0],
      vendor_name: '',
      amount: '',
      category: 'office_supplies',
      tags: [],
      description: '',
      payment_method: 'credit_card',
      receipt_url: '',
      tax_deductible: true,
      business_use_percentage: 100
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const handleExportCSV = () => {
    const csv = [
      ['Date', 'Vendor', 'Category', 'Amount', 'Payment Method', 'Tax Deductible', 'Description'].join(','),
      ...filteredExpenses.map(e => [
        e.expense_date,
        e.vendor_name,
        e.category.replace(/_/g, ' '),
        e.amount,
        e.payment_method,
        e.tax_deductible ? 'Yes' : 'No',
        e.description || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business-expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleExportQuickBooks = () => {
    const qbo = [
      ['Date', 'Vendor', 'Account', 'Amount', 'Memo'].join(','),
      ...filteredExpenses.map(e => [
        e.expense_date,
        e.vendor_name,
        CATEGORY_OPTIONS.find(c => c.value === e.category)?.label || e.category,
        e.amount,
        e.description || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([qbo], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quickbooks-import-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Analytics
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const taxDeductibleAmount = filteredExpenses
    .filter(e => e.tax_deductible)
    .reduce((sum, e) => sum + (e.amount * (e.business_use_percentage / 100)), 0);

  const categoryData = CATEGORY_OPTIONS.map(cat => ({
    name: cat.label,
    value: filteredExpenses.filter(e => e.category === cat.value).reduce((sum, e) => sum + e.amount, 0)
  })).filter(d => d.value > 0);

  const monthlyData = (() => {
    const months = {};
    filteredExpenses.forEach(e => {
      const month = format(new Date(e.expense_date), 'MMM yyyy');
      months[month] = (months[month] || 0) + e.amount;
    });
    return Object.entries(months).map(([month, amount]) => ({ month, amount }));
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
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Business Expenses</h1>
          <p className="text-slate-600">Track and manage your business expenses</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => setShowScanModal(true)}
            variant="outline"
            className="border-cyan-600 text-cyan-700 hover:bg-cyan-50 whitespace-nowrap"
          >
            <Receipt className="w-4 h-4 mr-2" />
            Scan Receipt
          </Button>
          <Button
            onClick={() => setShowMileageModal(true)}
            variant="outline"
            className="border-blue-600 text-blue-700 hover:bg-blue-50 whitespace-nowrap"
          >
            <Car className="w-4 h-4 mr-2" />
            Add Mileage
          </Button>
          <Button
            onClick={() => setShowRecurringModal(true)}
            variant="outline"
            className="border-purple-600 text-purple-700 hover:bg-purple-50 whitespace-nowrap"
          >
            <Repeat className="w-4 h-4 mr-2" />
            Add Recurring
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Expenses</p>
                <p className="text-3xl font-bold text-slate-900">${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Tax Deductible</p>
                <p className="text-3xl font-bold text-green-600">${taxDeductibleAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
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
                <p className="text-sm text-slate-600 mb-1">Total Transactions</p>
                <p className="text-3xl font-bold text-cyan-600">{filteredExpenses.length}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                <TabsTrigger value="all">All Time</TabsTrigger>
                <TabsTrigger value="this_month">This Month</TabsTrigger>
                <TabsTrigger value="last_month">Last Month</TabsTrigger>
                <TabsTrigger value="this_year">This Year</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORY_OPTIONS.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex flex-col sm:flex-row gap-2">
              <Button onClick={handleExportCSV} variant="outline" size="sm" className="whitespace-nowrap">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={handleExportQuickBooks} variant="outline" size="sm" className="whitespace-nowrap">
                <Download className="w-4 h-4 mr-2" />
                QuickBooks
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
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
            <CardTitle>Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Line type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Vendor</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Category</th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-700">Amount</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Tags</th>
                  <th className="text-center p-3 text-sm font-semibold text-slate-700">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center p-8 text-slate-500">
                      No expenses found. Add your first expense to get started.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map(expense => (
                    <tr key={expense.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 text-sm">{format(new Date(expense.expense_date), 'MMM d, yyyy')}</td>
                      <td className="p-3">
                        <div className="font-medium text-slate-900">{expense.vendor_name}</div>
                        {expense.is_recurring && (
                          <Badge variant="outline" className="mt-1 text-xs bg-purple-50 border-purple-300 text-purple-700">
                            <Repeat className="w-3 h-3 mr-1" />
                            {expense.recurring_frequency}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-sm">
                        {CATEGORY_OPTIONS.find(c => c.value === expense.category)?.label}
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-900">
                        ${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {expense.tags?.map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        {expense.receipt_url && (
                          <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm">
                              <Receipt className="w-4 h-4" />
                            </Button>
                          </a>
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

      {/* Scan Receipt Modal */}
      <Dialog open={showScanModal} onOpenChange={setShowScanModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">Scan Receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-slate-600">
              Upload a photo of your receipt and we'll automatically extract the details.
            </p>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <Input
                type="file"
                accept="image/*"
                onChange={handleScanReceipt}
                disabled={scanningReceipt}
              />
              {scanningReceipt && (
                <p className="text-sm text-slate-600 mt-4">Scanning receipt...</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Expense Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Add Business Expense</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddExpense} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
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
              <Label>Vendor/Merchant *</Label>
              <Input
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                placeholder="Who did you pay?"
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
                  <SelectContent className="max-h-[300px]" position="popper" side="bottom" align="start">
                    {CATEGORY_OPTIONS.map(cat => (
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
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional notes about this expense..."
                rows={3}
              />
            </div>

            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} variant="outline">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Receipt</Label>
              <Input type="file" onChange={handleReceiptUpload} disabled={uploadingReceipt} />
              {uploadingReceipt && <span className="text-sm text-slate-500 mt-2">Uploading...</span>}
              {formData.receipt_url && (
                <p className="text-sm text-green-600 mt-2">✓ Receipt uploaded</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tax_deductible"
                  checked={formData.tax_deductible}
                  onChange={(e) => setFormData({ ...formData, tax_deductible: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="tax_deductible" className="cursor-pointer">Tax Deductible</Label>
              </div>

              <div>
                <Label>Business Use %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.business_use_percentage}
                  onChange={(e) => setFormData({ ...formData, business_use_percentage: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700">Add Expense</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Mileage Modal */}
      <Dialog open={showMileageModal} onOpenChange={setShowMileageModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Car className="w-6 h-6 text-blue-600" />
              Add Mileage
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddMileage} className="space-y-4 mt-4">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={mileageData.expense_date}
                onChange={(e) => setMileageData({ ...mileageData, expense_date: e.target.value })}
                required
              />
            </div>

            {vehicles.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Vehicle {vehicles.length > 1 ? '*' : ''}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddVehicleModal(true)}
                    className="text-blue-600 hover:text-blue-700 h-auto p-0"
                  >
                    + Add Vehicle
                  </Button>
                </div>
                {vehicles.length > 1 ? (
                  <Select value={mileageData.vehicle_id} onValueChange={(value) => setMileageData({ ...mileageData, vehicle_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map(vehicle => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.vehicle_name} {vehicle.make && vehicle.model ? `(${vehicle.make} ${vehicle.model})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                    {vehicles[0].vehicle_name} {vehicles[0].make && vehicles[0].model ? `(${vehicles[0].make} ${vehicles[0].model})` : ''}
                  </div>
                )}
              </div>
            )}

            {vehicles.length === 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-slate-700 mb-2">No vehicles added yet</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddVehicleModal(true)}
                  className="border-blue-600 text-blue-700 hover:bg-blue-50"
                >
                  <Car className="w-4 h-4 mr-2" />
                  Add Your First Vehicle
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Starting Location *</Label>
                <Input
                  value={mileageData.starting_location}
                  onChange={(e) => setMileageData({ ...mileageData, starting_location: e.target.value })}
                  placeholder="e.g., Home, Office"
                  required
                />
              </div>
              <div>
                <Label>Ending Location *</Label>
                <Input
                  value={mileageData.ending_location}
                  onChange={(e) => setMileageData({ ...mileageData, ending_location: e.target.value })}
                  placeholder="e.g., Client Site"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Miles Driven *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={mileageData.miles_driven}
                  onChange={(e) => setMileageData({ ...mileageData, miles_driven: e.target.value })}
                  placeholder="0.0"
                  required
                />
              </div>
              <div>
                <Label>Rate per Mile *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={mileageData.rate_per_mile}
                  onChange={(e) => setMileageData({ ...mileageData, rate_per_mile: e.target.value })}
                  placeholder="0.70"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">2025 IRS rate: $0.70/mile</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="round_trip"
                checked={mileageData.round_trip}
                onChange={(e) => setMileageData({ ...mileageData, round_trip: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="round_trip" className="cursor-pointer">
                Round Trip (doubles mileage)
              </Label>
            </div>

            <div>
              <Label>Purpose *</Label>
              <Textarea
                value={mileageData.purpose}
                onChange={(e) => setMileageData({ ...mileageData, purpose: e.target.value })}
                placeholder="Business purpose of this trip..."
                rows={3}
                required
              />
            </div>

            {mileageData.miles_driven && mileageData.rate_per_mile && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Total Deduction:</span>
                  <span className="text-2xl font-bold text-blue-700">
                    ${(parseFloat(mileageData.miles_driven) * (mileageData.round_trip ? 2 : 1) * parseFloat(mileageData.rate_per_mile)).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {(parseFloat(mileageData.miles_driven) * (mileageData.round_trip ? 2 : 1)).toFixed(1)} miles @ ${mileageData.rate_per_mile}/mile
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowMileageModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <Car className="w-4 h-4 mr-2" />
                Add Mileage
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Vehicle Modal */}
      <Dialog open={showAddVehicleModal} onOpenChange={setShowAddVehicleModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Car className="w-6 h-6 text-blue-600" />
              Add New Vehicle
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddVehicle} className="space-y-4 mt-4">
            <div>
              <Label>Vehicle Name/Nickname *</Label>
              <Input
                value={newVehicleData.vehicle_name}
                onChange={(e) => setNewVehicleData({ ...newVehicleData, vehicle_name: e.target.value })}
                placeholder="e.g., My Car, Work Truck"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Make</Label>
                <Input
                  value={newVehicleData.make}
                  onChange={(e) => setNewVehicleData({ ...newVehicleData, make: e.target.value })}
                  placeholder="e.g., Toyota, Ford"
                />
              </div>
              <div>
                <Label>Model</Label>
                <Input
                  value={newVehicleData.model}
                  onChange={(e) => setNewVehicleData({ ...newVehicleData, model: e.target.value })}
                  placeholder="e.g., Camry, F-150"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Year</Label>
                <Input
                  type="number"
                  value={newVehicleData.year}
                  onChange={(e) => setNewVehicleData({ ...newVehicleData, year: e.target.value })}
                  placeholder="2024"
                />
              </div>
              <div>
                <Label>License Plate</Label>
                <Input
                  value={newVehicleData.license_plate}
                  onChange={(e) => setNewVehicleData({ ...newVehicleData, license_plate: e.target.value })}
                  placeholder="ABC-1234"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_primary"
                checked={newVehicleData.is_primary}
                onChange={(e) => setNewVehicleData({ ...newVehicleData, is_primary: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_primary" className="cursor-pointer">
                Set as primary vehicle (default selection)
              </Label>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowAddVehicleModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Add Vehicle
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Recurring Expense Modal */}
      <Dialog open={showRecurringModal} onOpenChange={setShowRecurringModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">Add Recurring Expense</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddRecurring} className="space-y-4 mt-4">
            <div>
              <Label>Vendor/Service *</Label>
              <Input
                value={recurringData.vendor_name}
                onChange={(e) => setRecurringData({ ...recurringData, vendor_name: e.target.value })}
                placeholder="e.g., Adobe Creative Cloud"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={recurringData.amount}
                  onChange={(e) => setRecurringData({ ...recurringData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label>Frequency *</Label>
                <Select value={recurringData.recurring_frequency} onValueChange={(value) => setRecurringData({ ...recurringData, recurring_frequency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Category *</Label>
              <Select value={recurringData.category} onValueChange={(value) => setRecurringData({ ...recurringData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]" position="popper" side="bottom" align="start">
                  {CATEGORY_OPTIONS.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Next Payment Date *</Label>
              <Input
                type="date"
                value={recurringData.expense_date}
                onChange={(e) => setRecurringData({ ...recurringData, expense_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={recurringData.description}
                onChange={(e) => setRecurringData({ ...recurringData, description: e.target.value })}
                placeholder="Optional notes..."
                rows={2}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowRecurringModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Add Recurring</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}