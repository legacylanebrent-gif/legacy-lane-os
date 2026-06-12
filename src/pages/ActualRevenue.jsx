import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, DollarSign, TrendingUp, PieChart } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

const REVENUE_STREAMS = [
  { key: "subscriptions", label: "Estate Sale Company Owner Subscriptions", color: "#0891b2" },
  { key: "marketplace", label: "Marketplace Fees", color: "#f97316" },
  { key: "referrals", label: "Referral Fees", color: "#22c55e" },
  { key: "advertisements", label: "Advertisements", color: "#8b5cf6" },
  { key: "features", label: "Featured Listings", color: "#ec4899" },
  { key: "email_sms", label: "Email/SMS Campaigns", color: "#14b8a6" },
  { key: "website_hosting", label: "Website Hosting", color: "#6366f1" },
  { key: "other", label: "Other", color: "#64748b" },
];

const COLORS = REVENUE_STREAMS.map((s) => s.color);

export default function ActualRevenue() {
  const [monthlyData, setMonthlyData] = useState({});
  const [selectedMonth, setSelectedMonth] = useState("");
  const [formData, setFormData] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem("actualRevenueData");
    const parsed = savedData ? JSON.parse(savedData) : {};
    setMonthlyData(parsed);
    const currentMonth = new Date().toISOString().slice(0, 7);
    setSelectedMonth(currentMonth);
    if (parsed[currentMonth]) {
      setFormData(parsed[currentMonth]);
    } else {
      setFormData({});
    }
  }, []);

  const handleInputChange = (streamKey, value) => {
    setFormData((prev) => ({
      ...prev,
      [streamKey]: parseFloat(value) || 0,
    }));
    setSaved(false);
  };

  const handleSave = () => {
    const updatedData = {
      ...monthlyData,
      [selectedMonth]: formData,
    };
    localStorage.setItem("actualRevenueData", JSON.stringify(updatedData));
    setMonthlyData(updatedData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getTotalRevenue = (data) => {
    return Object.values(data).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  const generateMonthLabels = () => {
    const months = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }
    return months;
  };

  const prepareChartData = () => {
    const monthLabels = generateMonthLabels();
    return monthLabels.map((month) => {
      const data = monthlyData[month] || {};
      const point = { month: month.slice(5) };
      REVENUE_STREAMS.forEach((stream) => {
        point[stream.key] = data[stream.key] || 0;
      });
      point.total = getTotalRevenue(data);
      return point;
    });
  };

  const preparePieData = () => {
    const currentData = monthlyData[selectedMonth] || {};
    return REVENUE_STREAMS.map((stream) => ({
      name: stream.label,
      value: currentData[stream.key] || 0,
    })).filter((item) => item.value > 0);
  };

  const totalRevenue = getTotalRevenue(formData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-orange-50 to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Actual Revenue Tracking</h1>
            <p className="text-slate-600 mt-1">Track real monthly revenue across all streams</p>
          </div>
          <Button
            onClick={handleSave}
            className="bg-gold-600 hover:bg-gold-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saved ? "Saved!" : "Save Month"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gold-600" />
              Monthly Revenue Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="month-select" className="font-medium">Month:</Label>
              <Input
                id="month-select"
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  const data = monthlyData[e.target.value] || {};
                  setFormData(data);
                }}
                className="w-48"
              />
              <div className="ml-auto text-right">
                <p className="text-sm text-slate-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gold-600">
                  ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {REVENUE_STREAMS.map((stream) => (
                <div key={stream.key} className="space-y-2">
                  <Label htmlFor={stream.key} className="text-sm font-medium">
                    {stream.label}
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id={stream.key}
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData[stream.key] || ""}
                      onChange={(e) => handleInputChange(stream.key, e.target.value)}
                      className="pl-10"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trends">
              <TrendingUp className="w-4 h-4 mr-2" />
              Revenue Trends
            </TabsTrigger>
            <TabsTrigger value="breakdown">
              <PieChart className="w-4 h-4 mr-2" />
              Revenue Mix
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>12-Month Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={prepareChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) =>
                          `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        }
                      />
                      <Legend />
                      {REVENUE_STREAMS.map((stream) => (
                        <Line
                          key={stream.key}
                          type="monotone"
                          dataKey={stream.key}
                          stroke={stream.color}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#000"
                        strokeWidth={3}
                        dot={false}
                        name="Total Revenue"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Mix - {selectedMonth}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center">
                  {preparePieData().length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={preparePieData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(1)}%`
                          }
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {preparePieData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) =>
                            `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          }
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-slate-500">No revenue data entered for this month</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}