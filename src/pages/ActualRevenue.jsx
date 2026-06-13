import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, DollarSign, TrendingUp, PieChart, Layers } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell,
} from "recharts";

const REVENUE_STREAMS = [
  { key: "operator_subs", label: "Estate Sale Company Owner Subscriptions", color: "#8b5cf6" },
  { key: "vendor_subs", label: "Vendor Subscriptions", color: "#a78bfa" },
  { key: "marketplace", label: "Marketplace Item Fees", color: "#10b981" },
  { key: "re_agents", label: "RE Agent Income", color: "#f43f5e" },
  { key: "referrals", label: "Referral Fees", color: "#f59e0b" },
  { key: "features", label: "Featured Listings", color: "#3b82f6" },
  { key: "advertising", label: "Advertising", color: "#14b8a6" },
  { key: "websites", label: "Website Services", color: "#6366f1" },
  { key: "dealer_subs", label: "Collector Dealer Subscriptions", color: "#eab308" },
  { key: "reseller_subs", label: "Reseller Subscriptions", color: "#ec4899" },
];

const COLORS = REVENUE_STREAMS.map((s) => s.color);

export default function ActualRevenue() {
  const [monthlyData, setMonthlyData] = useState({});
  const [selectedMonth, setSelectedMonth] = useState("");
  const [formData, setFormData] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Migrate old data keys to new stream names if needed
    const raw = localStorage.getItem("actualRevenueData_v2");
    const legacy = localStorage.getItem("actualRevenueData");
    const source = raw ? raw : legacy;
    const parsed = source ? JSON.parse(source) : {};

    // Migrate old keys to new keys
    const migrated = {};
    const keyMap = {
      subscriptions: "operator_subs",
      advertisements: "advertising",
      website_hosting: "websites",
    };
    Object.entries(parsed).forEach(([month, streams]) => {
      migrated[month] = {};
      Object.entries(streams).forEach(([key, val]) => {
        const newKey = keyMap[key] || key;
        migrated[month][newKey] = val;
      });
    });

    setMonthlyData(migrated);
    const currentMonth = new Date().toISOString().slice(0, 7);
    setSelectedMonth(currentMonth);
    setFormData(migrated[currentMonth] || {});
  }, []);

  const handleInputChange = (streamKey, value) => {
    setFormData((prev) => ({ ...prev, [streamKey]: parseFloat(value) || 0 }));
    setSaved(false);
  };

  const handleSave = () => {
    const updated = { ...monthlyData, [selectedMonth]: formData };
    localStorage.setItem("actualRevenueData_v2", JSON.stringify(updated));
    setMonthlyData(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getTotalRevenue = (data) =>
    Object.values(data || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

  const generateMonthLabels = () => {
    const months = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }
    return months;
  };

  const chartData = () => {
    return generateMonthLabels().map((month) => {
      const data = monthlyData[month] || {};
      const point = { month: month.slice(5) };
      REVENUE_STREAMS.forEach((s) => { point[s.key] = data[s.key] || 0; });
      point.total = getTotalRevenue(data);
      return point;
    });
  };

  const pieData = () => {
    const current = monthlyData[selectedMonth] || {};
    return REVENUE_STREAMS
      .map((s) => ({ name: s.label, value: current[s.key] || 0 }))
      .filter((item) => item.value > 0);
  };

  const totalRevenue = getTotalRevenue(formData);

  // Year-to-date totals
  const thisYear = selectedMonth.slice(0, 4);
  const ytdTotal = Object.entries(monthlyData)
    .filter(([m]) => m.startsWith(thisYear))
    .reduce((sum, [, data]) => sum + getTotalRevenue(data), 0);

  const ytdByStream = {};
  REVENUE_STREAMS.forEach((s) => {
    ytdByStream[s.key] = Object.entries(monthlyData)
      .filter(([m]) => m.startsWith(thisYear))
      .reduce((sum, [, data]) => sum + (parseFloat(data[s.key]) || 0), 0);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-orange-50 to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">Actual Revenue</h1>
            <p className="text-slate-600 mt-1">Track real revenue across all 10 channels</p>
          </div>
          <div className="flex items-center gap-3">
            {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
            <Button onClick={handleSave} className="bg-gold-600 hover:bg-gold-700 text-white">
              <Save className="w-4 h-4 mr-2" />
              Save Month
            </Button>
          </div>
        </div>

        {/* YTD Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-4">
              <div className="text-xs opacity-80">YTD Total</div>
              <div className="text-xl font-bold">${ytdTotal.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="text-xs opacity-80">This Month</div>
              <div className="text-xl font-bold">${totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white">
            <CardContent className="p-4">
              <div className="text-xs opacity-80">Operators</div>
              <div className="text-xl font-bold">${(ytdByStream.operator_subs || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <div className="text-xs opacity-80">Dealers</div>
              <div className="text-xl font-bold">${(ytdByStream.dealer_subs || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-pink-500 to-rose-600 text-white">
            <CardContent className="p-4">
              <div className="text-xs opacity-80">Resellers</div>
              <div className="text-xl font-bold">${(ytdByStream.reseller_subs || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Entry Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gold-600" />
              Monthly Revenue Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Label className="font-medium">Month:</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setFormData(monthlyData[e.target.value] || {});
                }}
                className="w-48"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REVENUE_STREAMS.map((stream) => (
                <div key={stream.key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stream.color }} />
                  <Label className="text-sm flex-1 min-w-0">{stream.label}</Label>
                  <div className="relative w-40">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData[stream.key] || ""}
                      onChange={(e) => handleInputChange(stream.key, e.target.value)}
                      className="pl-7 text-right"
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <Tabs defaultValue="trends">
          <TabsList>
            <TabsTrigger value="trends"><TrendingUp className="w-4 h-4 mr-2" />12-Month Trends</TabsTrigger>
            <TabsTrigger value="breakdown"><PieChart className="w-4 h-4 mr-2" />Revenue Mix</TabsTrigger>
            <TabsTrigger value="ytd"><Layers className="w-4 h-4 mr-2" />YTD by Channel</TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <Card>
              <CardHeader><CardTitle>12-Month Revenue Trends</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                      <Legend />
                      {REVENUE_STREAMS.map((s) => (
                        <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} />
                      ))}
                      <Line type="monotone" dataKey="total" stroke="#000" strokeWidth={3} dot={false} name="Total" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown">
            <Card>
              <CardHeader><CardTitle>Revenue Mix — {selectedMonth}</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center">
                  {pieData().length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={pieData()} cx="50%" cy="50%" labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          outerRadius={120} dataKey="value"
                        >
                          {pieData().map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-slate-500">No data entered for this month</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ytd">
            <Card>
              <CardHeader><CardTitle>Year-to-Date by Revenue Channel</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {REVENUE_STREAMS.map((s) => {
                    const val = ytdByStream[s.key] || 0;
                    const pct = ytdTotal > 0 ? (val / ytdTotal) * 100 : 0;
                    return (
                      <div key={s.key} className="flex items-center gap-3 p-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-sm flex-1 text-slate-700">{s.label}</span>
                        <div className="w-48 bg-slate-200 rounded-full h-2.5 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                        </div>
                        <span className="text-sm font-semibold w-24 text-right">${val.toLocaleString()}</span>
                        <span className="text-xs text-slate-400 w-12 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}