import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DollarSign, TrendingUp, TrendingDown, Percent, Layers, Calculator,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";

// ── Default cost assumptions per stream ──
const DEFAULT_COSTS = {
  operator_subs: { varPct: 15, label: "Estate Sale Company Owner Subs" },
  vendor_subs: { varPct: 10, label: "Vendor Subscriptions" },
  marketplace: { varPct: 5, label: "Marketplace Fees" },
  re_agents: { varPct: 5, label: "RE Agent Income" },
  referrals: { varPct: 5, label: "Referral Fees" },
  features: { varPct: 5, label: "Featured Listings" },
  advertising: { varPct: 5, label: "Advertising" },
  websites: { varPct: 35, label: "Website Services" },
  dealer_subs: { varPct: 10, label: "Collector Dealer Subs" },
  reseller_subs: { varPct: 10, label: "Reseller Subs" },
};

const STREAM_COLORS = {
  operator_subs: "#8b5cf6", vendor_subs: "#a78bfa", marketplace: "#10b981",
  re_agents: "#f43f5e", referrals: "#f59e0b", features: "#3b82f6",
  advertising: "#14b8a6", websites: "#6366f1", dealer_subs: "#eab308",
  reseller_subs: "#ec4899",
};

const PACKAGE_PRICES = { Gold: 299, Silver: 149, Bronze: 35, Platinum: 499, Basic: 0 };

// ── Reuse ComprehensiveRevenue model logic ──
const calculateProjections = (monthlyBase, growthPercent, months) => {
  const res = []; let cur = monthlyBase;
  for (let i = 0; i < months; i++) { res.push(cur); cur *= (1 + growthPercent / 100); }
  return res;
};
const calculateSimpleSubRevenue = (price, newPerMonth, churnRate, months) => {
  const proj = []; let subs = newPerMonth;
  for (let i = 0; i < months; i++) {
    const cf = (1 - churnRate / 100);
    proj.push(subs * price * cf);
    subs = Math.floor(subs * cf + newPerMonth);
  }
  return proj;
};
const getYearProjection = (proj, year) => proj.slice(0, year * 12).reduce((a, v) => a + v, 0);

export default function EstimatedPNL() {
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState([]);
  const [totalCities, setTotalCities] = useState(0);
  const [totalTerritories, setTotalTerritories] = useState(0);

  // Fixed overhead
  const [fixedMonthlyCost, setFixedMonthlyCost] = useState(() => {
    const s = localStorage.getItem("pnl_fixedMonthlyCost");
    return s ? Number(s) : 15000;
  });

  // Editable cost % per stream
  const [costPcts, setCostPcts] = useState(() => {
    const s = localStorage.getItem("pnl_costPcts");
    if (s) return JSON.parse(s);
    const def = {};
    Object.entries(DEFAULT_COSTS).forEach(([k, v]) => { def[k] = v.varPct; });
    return def;
  });

  useEffect(() => {
    localStorage.setItem("pnl_fixedMonthlyCost", fixedMonthlyCost);
    localStorage.setItem("pnl_costPcts", JSON.stringify(costPcts));
  }, [fixedMonthlyCost, costPcts]);

  // ── Load data (same as ComprehensiveRevenue) ──
  const loadValue = (k, d) => {
    const s = localStorage.getItem(`comprehensive_revenue_${k}`);
    return s !== null ? JSON.parse(s) : d;
  };

  const [vendorSubPrice, setVendorSubPrice] = useState(() => loadValue("vendorSubPrice", 19));
  const [vendorChurnRate, setVendorChurnRate] = useState(() => loadValue("vendorChurnRate", 4));
  const [vendorNewPerTerritoryPerMonth, setVendorNewPerTerritoryPerMonth] = useState(() => loadValue("vendorNewPerTerritoryPerMonth", 2));
  const [avgAnnualSalesPerOperator, setAvgAnnualSalesPerOperator] = useState(() => loadValue("avgAnnualSalesPerOperator", 6));
  const [avgItemsPostedPerSale, setAvgItemsPostedPerSale] = useState(() => loadValue("avgItemsPostedPerSale", 50));
  const [marketplaceGrowth, setMarketplaceGrowth] = useState(() => loadValue("marketplaceGrowth", 5));
  const [agentMonthlyFee, setAgentMonthlyFee] = useState(() => loadValue("agentMonthlyFee", 27));
  const [agentMonthlyPct, setAgentMonthlyPct] = useState(() => loadValue("agentMonthlyPct", 30));
  const [agentTerritoryBuyInAvg, setAgentTerritoryBuyInAvg] = useState(() => loadValue("agentTerritoryBuyInAvg", 5000));
  const [agentTerritoryBuyInPerMonth, setAgentTerritoryBuyInPerMonth] = useState(() => loadValue("agentTerritoryBuyInPerMonth", 5));
  const [agentGrowth, setAgentGrowth] = useState(() => loadValue("agentGrowth", 3));
  const [annualReferralConv, setAnnualReferralConv] = useState(() => loadValue("annualReferralConv", 3));
  const [refAvgPropertyValue, setRefAvgPropertyValue] = useState(() => loadValue("refAvgPropertyValue", 350000));
  const [platformIncomePercent, setPlatformIncomePercent] = useState(() => loadValue("platformIncomePercent", 70));
  const [referralGrowth, setReferralGrowth] = useState(() => loadValue("referralGrowth", 3));
  const [nationalFeaturePrice, setNationalFeaturePrice] = useState(() => loadValue("nationalFeaturePrice", 179));
  const [localFeaturePrice, setLocalFeaturePrice] = useState(() => loadValue("localFeaturePrice", 97));
  const [featureGrowth, setFeatureGrowth] = useState(() => loadValue("featureGrowth", 5));
  const [adBasicPrice, setAdBasicPrice] = useState(() => loadValue("adBasicPrice", 29));
  const [adProPrice, setAdProPrice] = useState(() => loadValue("adProPrice", 49));
  const [adPremiumPrice, setAdPremiumPrice] = useState(() => loadValue("adPremiumPrice", 179));
  const [adGrowth, setAdGrowth] = useState(() => loadValue("adGrowth", 3));
  const [websiteSetupFee, setWebsiteSetupFee] = useState(() => loadValue("websiteSetupFee", 397));
  const [websiteMonthlyFee, setWebsiteMonthlyFee] = useState(() => loadValue("websiteMonthlyFee", 79));
  const [websiteNewPerMonth, setWebsiteNewPerMonth] = useState(() => loadValue("websiteNewPerMonth", 10));
  const [websiteGrowthAfterY1, setWebsiteGrowthAfterY1] = useState(() => loadValue("websiteGrowthAfterY1", 5));

  const DEALER_TYPES = [
    { name: "Antique Store", count: 15000 }, { name: "Art Gallery", count: 10000 },
    { name: "Estate Jewelry Buyer", count: 11500 }, { name: "Coin Shop", count: 4500 },
    { name: "Sports Card Shop", count: 3750 }, { name: "Comic Shop", count: 3250 },
    { name: "Game & Toy Shop", count: 6500 }, { name: "Vintage Furniture Dealer", count: 6000 },
    { name: "Architectural Salvage Dealer", count: 1000 }, { name: "Record Store", count: 2250 },
    { name: "Book Dealer", count: 3000 }, { name: "Collectible Shop", count: 7500 },
    { name: "Luxury Consignment Store", count: 3500 },
  ];
  const RESELLER_TYPES = [
    { name: "eBay Seller (Pro)", count: 50000 }, { name: "Online Reseller", count: 75000 },
    { name: "Auction Company", count: 5000 }, { name: "Consignment Shop", count: 7000 },
    { name: "Antique Dealer", count: 8000 }, { name: "Collectible Buyer", count: 5000 },
    { name: "Liquidator", count: 3000 }, { name: "Estate Buyer", count: 6000 },
    { name: "Furniture Dealer", count: 8000 }, { name: "Vintage Dealer", count: 12000 },
    { name: "Buyout Company", count: 2000 }, { name: "Cleanout Specialist", count: 4000 },
    { name: "Other", count: 10000 },
  ];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      let ops = [], skip = 0;
      while (true) {
        const batch = await base44.entities.FutureEstateOperator.filter({}, "-created_date", 5000, skip);
        if (!batch.length) break;
        ops = [...ops, ...batch]; skip += 5000;
        if (batch.length < 5000) break;
      }
      setOperators(ops);
      const res = await base44.functions.invoke("fetchHousioTerritories", { action: "list" });
      if (res.data?.territories?.length) setTotalTerritories(res.data.territories.length);
      if (res.data?.total_cities) setTotalCities(res.data.total_cities);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="animate-pulse text-slate-900 text-xl font-serif">Loading P&amp;L data...</div>
      </div>
    );
  }

  // ── Revenue Calculations (same model as ComprehensiveRevenue) ──
  const totalOperators = operators.length;
  const currentOperatorMonthlyRevenue = operators.reduce((sum, op) => {
    const pkg = op.package_type === "Unknown" ? "Basic" : op.package_type;
    const mp = PACKAGE_PRICES[pkg] || 0;
    let ps = 0;
    if (pkg === "Basic") ps = 99 * 6 / 12;
    else if (pkg === "Bronze") ps = 64 * 1.25;
    return sum + mp + ps;
  }, 0);
  const opProj = Array(120).fill(currentOperatorMonthlyRevenue);

  const vendorProj = calculateSimpleSubRevenue(vendorSubPrice, totalTerritories * vendorNewPerTerritoryPerMonth, vendorChurnRate, 120);
  const mktMonthlyItems = totalOperators * (avgAnnualSalesPerOperator / 12) * avgItemsPostedPerSale;
  const mktProj = calculateProjections(mktMonthlyItems * 3, marketplaceGrowth, 120);

  const agMonthlySub = totalCities * (agentMonthlyPct / 100) * agentMonthlyFee;
  const agBuyIn = agentTerritoryBuyInPerMonth * agentTerritoryBuyInAvg;
  const agMonProj = calculateProjections(agMonthlySub, agentGrowth, 120);
  const agBuyProj = calculateProjections(agBuyIn, agentGrowth, 120);
  const agProj = agMonProj.map((v, i) => v + agBuyProj[i]);

  const refIncPer = refAvgPropertyValue * 0.02 * 0.25 * (platformIncomePercent / 100);
  const refProj = calculateProjections(totalOperators * (annualReferralConv / 12) * refIncPer, referralGrowth, 120);

  const featProj = calculateProjections(
    ((totalOperators * 0.1) / 12) * nationalFeaturePrice + (totalOperators / 12) * localFeaturePrice,
    featureGrowth, 120
  );
  const adProj = calculateProjections(totalTerritories * (adBasicPrice + adProPrice + adPremiumPrice), adGrowth, 120);

  let cumSites = 0, curNew = websiteNewPerMonth;
  const webProj = [];
  for (let i = 0; i < 120; i++) {
    if (i >= 12) curNew *= (1 + websiteGrowthAfterY1 / 100);
    cumSites += curNew;
    webProj.push(curNew * websiteSetupFee + cumSites * websiteMonthlyFee);
  }

  const dlrBase = Math.round(DEALER_TYPES.reduce((s, t) => s + t.count, 0) * 0.05 * 147);
  const dlrProj = calculateProjections(dlrBase, 3, 120);
  const resBase = Math.round(RESELLER_TYPES.reduce((s, t) => s + t.count, 0) * 0.03 * 47);
  const resProj = calculateProjections(resBase, 3, 120);

  // ── Stream projections map ──
  const streamProj = {
    operator_subs: opProj, vendor_subs: vendorProj, marketplace: mktProj,
    re_agents: agProj, referrals: refProj, features: featProj,
    advertising: adProj, websites: webProj, dealer_subs: dlrProj, reseller_subs: resProj,
  };

  // ── P&L Calculations ──
  const totalRevProj = Array.from({ length: 120 }, (_, i) =>
    Object.values(streamProj).reduce((s, p) => s + p[i], 0)
  );

  const totalCostProj = Array.from({ length: 120 }, (_, i) => {
    let cost = fixedMonthlyCost;
    Object.entries(streamProj).forEach(([k, p]) => {
      cost += p[i] * ((costPcts[k] || 0) / 100);
    });
    return cost;
  });

  const marginProj = totalRevProj.map((r, i) => r - totalCostProj[i]);
  const marginPctProj = totalRevProj.map((r, i) => (r > 0 ? ((r - totalCostProj[i]) / r) * 100 : 0));

  // ── Yearly summary ──
  const yr3Rev = getYearProjection(totalRevProj, 3);
  const yr3Cost = getYearProjection(totalCostProj, 3);
  const yr3Margin = yr3Rev - yr3Cost;
  const yr3MarginPct = yr3Rev > 0 ? (yr3Margin / yr3Rev) * 100 : 0;

  // ── Chart data: 36-month ──
  const chartData = Array.from({ length: 36 }, (_, i) => ({
    month: `M${i + 1}`,
    Revenue: Math.round(totalRevProj[i]),
    Costs: Math.round(totalCostProj[i]),
    Margin: Math.round(marginProj[i]),
  }));

  // ── Stream margin breakdown (3-year) ──
  const streamBreakdown = Object.entries(streamProj).map(([key, proj]) => {
    const rev = getYearProjection(proj, 3);
    const cost = rev * ((costPcts[key] || 0) / 100);
    const margin = rev - cost;
    const marginPct = rev > 0 ? (margin / rev) * 100 : 0;
    return { key, label: DEFAULT_COSTS[key].label, rev, cost, margin, marginPct, color: STREAM_COLORS[key] };
  }).sort((a, b) => b.margin - a.margin);

  // ── Pie data ──
  const pieData = streamBreakdown.map(s => ({ name: s.label, value: s.margin }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-4">
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Estimated P&amp;L Dashboard</h1>
          <p className="text-slate-600">Projected margins based on Comprehensive Revenue model with adjustable costs</p>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm opacity-80">3-Year Revenue</span><DollarSign className="w-4 h-4 opacity-75" />
              </div>
              <div className="text-2xl font-bold">${(yr3Rev / 1e6).toFixed(2)}M</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm opacity-80">3-Year Costs</span><TrendingDown className="w-4 h-4 opacity-75" />
              </div>
              <div className="text-2xl font-bold">${(yr3Cost / 1e6).toFixed(2)}M</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm opacity-80">3-Year Margin</span><Calculator className="w-4 h-4 opacity-75" />
              </div>
              <div className="text-2xl font-bold">${(yr3Margin / 1e6).toFixed(2)}M</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm opacity-80">Margin %</span><Percent className="w-4 h-4 opacity-75" />
              </div>
              <div className="text-2xl font-bold">{yr3MarginPct.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* ── 36-Month P&L Chart ── */}
        <Card>
          <CardHeader><CardTitle>36-Month P&amp;L Projection</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                <Legend />
                <Area type="monotone" dataKey="Revenue" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                <Area type="monotone" dataKey="Costs" stackId="2" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.3} />
                <Area type="monotone" dataKey="Margin" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ── Cost Controls ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-slate-600" />
              Cost Assumptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Label>Fixed Monthly Overhead ($)</Label>
              <Input type="number" value={fixedMonthlyCost}
                onChange={e => setFixedMonthlyCost(Number(e.target.value) || 0)}
                className="w-48" />
              <p className="text-xs text-slate-400 mt-1">Platform hosting, admin tools, support desk, etc.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(DEFAULT_COSTS).map(([key, cfg]) => (
                <div key={key} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STREAM_COLORS[key] }} />
                    <span className="text-xs font-medium text-slate-700 truncate">{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input type="number" min="0" max="100"
                      value={costPcts[key] || 0}
                      onChange={e => setCostPcts(p => ({ ...p, [key]: Number(e.target.value) || 0 }))}
                      className="w-16 h-8 text-xs" />
                    <span className="text-xs text-slate-400">% var</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Stream Margin Breakdown + Pie ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-slate-600" />
                Margin by Channel (3-Year)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {streamBreakdown.map(s => (
                  <div key={s.key} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-sm flex-1 text-slate-700 truncate">{s.label}</span>
                    <div className="text-right">
                      <div className="text-sm font-semibold">${(s.margin / 1e6).toFixed(2)}M</div>
                      <div className="text-xs" style={{ color: s.marginPct >= 80 ? "#16a34a" : s.marginPct >= 50 ? "#ca8a04" : "#dc2626" }}>
                        {s.marginPct.toFixed(1)}% margin
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>3-Year Margin Mix</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie data={pieData.filter(d => d.value > 0)} cx="50%" cy="50%"
                    labelLine={false} outerRadius={110} dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}>
                    {pieData.filter(d => d.value > 0).map((_, i) => (
                      <Cell key={i} fill={streamBreakdown.filter(s => s.margin > 0)[i]?.color || "#ccc"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => `$${(v / 1e6).toFixed(2)}M`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* ── Yearly P&L Table ── */}
        <Card>
          <CardHeader><CardTitle>Yearly P&amp;L Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="text-left py-2">Year</th>
                    <th className="text-right py-2">Revenue</th>
                    <th className="text-right py-2">Costs</th>
                    <th className="text-right py-2">Margin</th>
                    <th className="text-right py-2">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 3, 5, 10].map(yr => {
                    const rev = getYearProjection(totalRevProj, yr);
                    const cost = getYearProjection(totalCostProj, yr);
                    const m = rev - cost;
                    const mp = rev > 0 ? (m / rev) * 100 : 0;
                    return (
                      <tr key={yr} className="border-b last:border-0">
                        <td className="py-3 font-medium">Year {yr}</td>
                        <td className="text-right py-3 font-mono">${(rev / 1e6).toFixed(2)}M</td>
                        <td className="text-right py-3 font-mono text-red-600">${(cost / 1e6).toFixed(2)}M</td>
                        <td className="text-right py-3 font-mono font-bold" style={{ color: m >= 0 ? "#16a34a" : "#dc2626" }}>
                          ${(m / 1e6).toFixed(2)}M
                        </td>
                        <td className="text-right py-3 font-mono">{mp.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}