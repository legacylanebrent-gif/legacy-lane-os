import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Rocket, Activity, AlertTriangle, Database, Shield, BarChart3, Users, ImageIcon, Search, Brain, Globe, ShoppingCart, GitBranch, Mail, Share2, Target, Building2 } from 'lucide-react';
import SystemHealthWidget from '@/components/launch-cc/SystemHealthWidget';
import LaunchCountdown from '@/components/launch-cc/LaunchCountdown';
import ErrorMonitorWidget from '@/components/launch-cc/ErrorMonitorWidget';
import RepositoryStatsWidget from '@/components/launch-cc/RepositoryStatsWidget';
import LaunchReadinessScorecard from '@/components/launch-cc/LaunchReadinessScorecard';
import AuditSection from '@/components/launch-cc/AuditSection';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Rocket },
  { id: 'onboarding', label: 'Onboarding', icon: Users },
  { id: 'sales', label: 'Sale Creation', icon: Building2 },
  { id: 'images', label: 'Image Pipeline', icon: ImageIcon },
  { id: 'serp', label: 'SERP API', icon: Search },
  { id: 'ai', label: 'AI Research', icon: Brain },
  { id: 'seo', label: 'SEO Engine', icon: Globe },
  { id: 'repository', label: 'Repository', icon: Database },
  { id: 'pos', label: 'POS', icon: ShoppingCart },
  { id: 'referrals', label: 'Referrals', icon: GitBranch },
  { id: 'email', label: 'Email / CIO', icon: Mail },
  { id: 'social', label: 'Social', icon: Share2 },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'load', label: 'Load Testing', icon: BarChart3 },
];

export default function LaunchCommandCenter() {

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 px-6 py-5">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-wider">🚨 Launch Command Center</h1>
              <p className="text-slate-400 text-xs">Pre-Launch War Room — Platform Hardening Mode Active</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-red-600/20 border border-red-500 rounded-full text-red-400 text-xs font-black uppercase tracking-widest animate-pulse">
              🔴 Hardening Mode
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">

        {/* Launch Readiness Scorecard — always visible at top */}
        <LaunchReadinessScorecard />

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="bg-slate-800 border border-slate-700 rounded-xl p-1 h-auto flex flex-wrap gap-1 w-full">
            {TABS.map(({ id, label, icon: Icon }) => (
              <TabsTrigger key={id} value={id}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-slate-400 data-[state=active]:bg-red-600 data-[state=active]:text-white transition-all">
                <Icon className="w-3.5 h-3.5" />{label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <SystemHealthWidget />
                <ErrorMonitorWidget />
              </div>
              <div className="space-y-4">
                <LaunchCountdown />
                <RepositoryStatsWidget />
              </div>
            </div>
          </TabsContent>

          {/* ONBOARDING AUDIT */}
          <TabsContent value="onboarding" className="mt-4">
            <AuditSection
              title="Estate Sale Company Owner Onboarding Audit"
              description="Registration, login, and onboarding workflow tests"
              sections={[
                {
                  heading: 'Registration Tests',
                  checks: [
                    { label: 'New Estate Sale Company Owner Signup', status: 'pending' },
                    { label: 'Duplicate Email Prevention', status: 'pending' },
                    { label: 'Password Reset Flow', status: 'pending' },
                    { label: 'Email Verification', status: 'pending' },
                  ]
                },
                {
                  heading: 'Login Tests',
                  checks: [
                    { label: 'Desktop Login', status: 'pending' },
                    { label: 'Tablet Login', status: 'pending' },
                    { label: 'Mobile Login', status: 'pending' },
                    { label: 'Session Persistence After Refresh', status: 'pending' },
                    { label: 'Logout Flow', status: 'pending' },
                  ]
                },
                {
                  heading: 'Onboarding Completion',
                  checks: [
                    { label: 'Company Creation', status: 'pending' },
                    { label: 'Logo Upload', status: 'pending' },
                    { label: 'Territory Selection', status: 'pending' },
                    { label: 'Billing Setup', status: 'pending' },
                    { label: 'Profile Completion', status: 'pending' },
                  ]
                }
              ]}
              weight={15}
            />
          </TabsContent>

          {/* SALE CREATION */}
          <TabsContent value="sales" className="mt-4">
            <AuditSection
              title="Sale Creation Audit"
              description="Test sales with varying photo loads and browser recovery"
              sections={[
                {
                  heading: 'Photo Load Tests',
                  checks: [
                    { label: 'Group A: 10 Photos — Save Speed', status: 'pending' },
                    { label: 'Group B: 50 Photos — Save Speed', status: 'pending' },
                    { label: 'Group C: 100 Photos — Save Speed', status: 'pending' },
                    { label: 'Group D: 300 Photos — Save Speed', status: 'pending' },
                    { label: 'Group E: 500 Photos — Save Speed', status: 'pending' },
                    { label: 'Thumbnail Generation Time', status: 'pending' },
                    { label: 'Database Write Time', status: 'pending' },
                  ]
                },
                {
                  heading: 'Browser Recovery Tests',
                  checks: [
                    { label: 'Browser Closed — No Data Loss', status: 'pending' },
                    { label: 'Browser Crash — No Data Loss', status: 'pending' },
                    { label: 'Page Refresh — No Data Loss', status: 'pending' },
                    { label: 'Internet Disconnect — No Data Loss', status: 'pending' },
                  ]
                }
              ]}
              weight={15}
            />
          </TabsContent>

          {/* IMAGE PIPELINE */}
          <TabsContent value="images" className="mt-4">
            <AuditSection
              title="Image Pipeline Audit"
              description="Upload, compression, duplicate detection, and format tests"
              sections={[
                {
                  heading: 'Stress Tests',
                  checks: [
                    { label: '50 Images — Upload Time', status: 'pending' },
                    { label: '100 Images — Upload Time', status: 'pending' },
                    { label: '300 Images — Upload Time', status: 'pending' },
                    { label: '500 Images — Upload Time', status: 'pending' },
                    { label: '1,000 Images — Upload Time', status: 'pending' },
                    { label: 'Thumbnail Generation', status: 'pending' },
                    { label: 'Queue Time Under Load', status: 'pending' },
                  ]
                },
                {
                  heading: 'Duplicate Detection',
                  checks: [
                    { label: 'Duplicate Detected', status: 'pending' },
                    { label: 'Duplicate Prevented', status: 'pending' },
                  ]
                },
                {
                  heading: 'Format Compatibility',
                  checks: [
                    { label: 'Mobile Upload (HEIC/HEIF)', status: 'pending' },
                    { label: 'DSLR Upload (RAW/Large JPG)', status: 'pending' },
                    { label: 'PNG Upload', status: 'pending' },
                    { label: 'JPG Upload', status: 'pending' },
                    { label: 'WEBP Upload', status: 'pending' },
                  ]
                }
              ]}
              weight={15}
            />
          </TabsContent>

          {/* SERP API */}
          <TabsContent value="serp" className="mt-4">
            <AuditSection
              title="SERP API Audit"
              description="Credit usage, failure rates, and stress tests"
              sections={[
                {
                  heading: 'Daily Tracking',
                  checks: [
                    { label: 'Daily Credits Used Tracked', status: 'pending' },
                    { label: 'Failed Searches Logged', status: 'pending' },
                    { label: 'Timeout Errors Logged', status: 'pending' },
                    { label: 'Retry Attempts Tracked', status: 'pending' },
                    { label: 'No Silent Failures', status: 'pending' },
                  ]
                },
                {
                  heading: 'Stress Tests',
                  checks: [
                    { label: '100 Searches — Success Rate', status: 'pending' },
                    { label: '500 Searches — Success Rate', status: 'pending' },
                    { label: '1,000 Searches — Success Rate', status: 'pending' },
                    { label: '3,000 Searches — Success Rate', status: 'pending' },
                  ]
                }
              ]}
              weight={10}
            />
          </TabsContent>

          {/* AI RESEARCH */}
          <TabsContent value="ai" className="mt-4">
            <AuditSection
              title="AI Research Audit"
              description="Quality scoring across 100 randomly sampled images"
              sections={[
                {
                  heading: 'Generation Quality Checks',
                  checks: [
                    { label: 'Title Generation — Quality Score', status: 'pending' },
                    { label: 'Description Generation — Quality Score', status: 'pending' },
                    { label: 'Pricing Suggestions — Accuracy', status: 'pending' },
                    { label: 'Category Detection — Accuracy', status: 'pending' },
                    { label: 'Brand Detection — Accuracy', status: 'pending' },
                    { label: 'Material Detection — Accuracy', status: 'pending' },
                    { label: 'Era Detection — Accuracy', status: 'pending' },
                    { label: 'Condition Detection — Accuracy', status: 'pending' },
                  ]
                },
                {
                  heading: 'Skip Search Persistence',
                  checks: [
                    { label: '100 Images Marked Skip — Selections Persist After Logout', status: 'pending' },
                    { label: 'Single DB Write Per Batch (Not Per Image)', status: 'pending' },
                  ]
                }
              ]}
              weight={10}
            />
          </TabsContent>

          {/* SEO ENGINE */}
          <TabsContent value="seo" className="mt-4">
            <AuditSection
              title="SEO Engine Audit"
              description="Every item must generate a complete, valid SEO record"
              sections={[
                {
                  heading: 'Page Generation Checks',
                  checks: [
                    { label: 'SEO Page Created Per Item', status: 'pending' },
                    { label: 'Slug Generated', status: 'pending' },
                    { label: 'Meta Title Present', status: 'pending' },
                    { label: 'Meta Description Present', status: 'pending' },
                    { label: 'Schema JSON Generated', status: 'pending' },
                    { label: 'Canonical URL Set', status: 'pending' },
                  ]
                },
                {
                  heading: 'Crawler Simulation',
                  checks: [
                    { label: 'No Broken URLs', status: 'pending' },
                    { label: 'No Missing Metadata', status: 'pending' },
                    { label: 'No Duplicate Titles', status: 'pending' },
                    { label: 'No Duplicate Descriptions', status: 'pending' },
                  ]
                }
              ]}
              weight={10}
            />
          </TabsContent>

          {/* REPOSITORY */}
          <TabsContent value="repository" className="mt-4">
            <AuditSection
              title="Central Repository Audit"
              description="Data integrity checks for every researched item"
              sections={[
                {
                  heading: 'Record Completeness',
                  checks: [
                    { label: 'Item Record Written', status: 'pending' },
                    { label: 'Brand Linked', status: 'pending' },
                    { label: 'Category Linked', status: 'pending' },
                    { label: 'Sale Source Recorded', status: 'pending' },
                    { label: 'Territory Recorded', status: 'pending' },
                    { label: 'Date Recorded', status: 'pending' },
                  ]
                },
                {
                  heading: 'Data Integrity',
                  checks: [
                    { label: 'No Duplicate Records', status: 'pending' },
                    { label: 'No Missing Relationships', status: 'pending' },
                    { label: 'No Null Critical Fields', status: 'pending' },
                    { label: 'No Failed Inserts', status: 'pending' },
                  ]
                }
              ]}
              weight={10}
            />
          </TabsContent>

          {/* POS */}
          <TabsContent value="pos" className="mt-4">
            <AuditSection
              title="POS System Audit"
              description="Transaction accuracy and reconciliation"
              sections={[
                {
                  heading: 'Transaction Types',
                  checks: [
                    { label: 'Single Item Sale', status: 'pending' },
                    { label: 'Multiple Items Sale', status: 'pending' },
                    { label: 'Bundle Sale', status: 'pending' },
                    { label: 'Discount Applied', status: 'pending' },
                    { label: 'Tax Calculated', status: 'pending' },
                    { label: 'Refund Processed', status: 'pending' },
                  ]
                },
                {
                  heading: 'Post-Transaction Verification',
                  checks: [
                    { label: 'Inventory Updates After Sale', status: 'pending' },
                    { label: 'Reports Update in Real-Time', status: 'pending' },
                    { label: 'Owner Summaries Update', status: 'pending' },
                    { label: 'POS Reconciliation Report Accurate', status: 'pending' },
                  ]
                }
              ]}
              weight={10}
            />
          </TabsContent>

          {/* REFERRALS */}
          <TabsContent value="referrals" className="mt-4">
            <AuditSection
              title="Referral System Audit"
              description="Every referral scenario must route successfully"
              sections={[
                {
                  heading: 'Referral Scenarios',
                  checks: [
                    { label: 'Estate Sale Company Owner → Agent Routing', status: 'pending' },
                    { label: 'Agent → Estate Sale Company Owner Routing', status: 'pending' },
                    { label: 'Territory Match', status: 'pending' },
                    { label: 'Territory Conflict Handling', status: 'pending' },
                    { label: 'No Territory Available — Fallback', status: 'pending' },
                    { label: 'Duplicate Referral Prevention', status: 'pending' },
                  ]
                },
                {
                  heading: 'Routing Guarantee',
                  checks: [
                    { label: '100% Routing Success Rate', status: 'pending' },
                    { label: 'No Silent Routing Failures', status: 'pending' },
                  ]
                }
              ]}
              weight={10}
            />
          </TabsContent>

          {/* EMAIL / CUSTOMER.IO */}
          <TabsContent value="email" className="mt-4">
            <AuditSection
              title="Email Automation Audit (Customer.io)"
              description="Verify all transactional and automated email flows"
              sections={[
                {
                  heading: 'Email Trigger Verification',
                  checks: [
                    { label: 'Sale Published — Email Sent', status: 'pending' },
                    { label: 'VIP Invite — Email Sent', status: 'pending' },
                    { label: 'Address Release — Email Sent', status: 'pending' },
                    { label: 'Last Chance — Email Sent', status: 'pending' },
                    { label: 'Price Reduction — Email Sent', status: 'pending' },
                    { label: 'Referral Lead — Email Sent', status: 'pending' },
                    { label: 'Estate Sale Company Owner Signup — Email Sent', status: 'pending' },
                    { label: 'Password Reset — Email Sent', status: 'pending' },
                  ]
                },
                {
                  heading: 'Deliverability Tracking',
                  checks: [
                    { label: 'Sent Tracked', status: 'pending' },
                    { label: 'Delivered Confirmed', status: 'pending' },
                    { label: 'Open Rates > 20%', status: 'pending' },
                    { label: 'Bounce Rate < 2%', status: 'pending' },
                  ]
                }
              ]}
              weight={0}
            />
          </TabsContent>

          {/* SOCIAL */}
          <TabsContent value="social" className="mt-4">
            <AuditSection
              title="Social Automation Audit"
              description="Verify social post generation across all platforms"
              sections={[
                {
                  heading: 'Platform Generation',
                  checks: [
                    { label: 'Facebook Post Generated', status: 'pending' },
                    { label: 'Instagram Post Generated', status: 'pending' },
                    { label: 'LinkedIn Post Generated', status: 'pending' },
                    { label: 'X (Twitter) Post Generated', status: 'pending' },
                  ]
                },
                {
                  heading: 'Content Accuracy',
                  checks: [
                    { label: 'Image Generated Correctly', status: 'pending' },
                    { label: 'Caption Generated', status: 'pending' },
                    { label: 'Link Accurate', status: 'pending' },
                    { label: 'Tracking Parameters Present', status: 'pending' },
                  ]
                }
              ]}
              weight={0}
            />
          </TabsContent>

          {/* SECURITY */}
          <TabsContent value="security" className="mt-4">
            <AuditSection
              title="Security Audit"
              description="Attempt every known access vector — all must be denied"
              sections={[
                {
                  heading: 'Access Control Tests',
                  checks: [
                    { label: 'Access Other Estate Sale Company Owner\'s Sales — Denied', status: 'pending' },
                    { label: 'Access Hidden Sales — Denied', status: 'pending' },
                    { label: 'Access Admin Pages Without Admin Role — Denied', status: 'pending' },
                    { label: 'Access Reseller Pages Without Reseller Role — Denied', status: 'pending' },
                    { label: 'Direct API Call Without Auth — Denied', status: 'pending' },
                    { label: 'Manipulated URL Access — Denied', status: 'pending' },
                  ]
                },
                {
                  heading: 'Reseller Event Security',
                  checks: [
                    { label: 'Consumer Cannot View Reseller Events', status: 'pending' },
                    { label: 'Google Cannot Index Reseller Events', status: 'pending' },
                    { label: 'Estate Sale Company Owner Can Manage Events', status: 'pending' },
                    { label: 'Reseller Can Register', status: 'pending' },
                  ]
                }
              ]}
              weight={10}
            />
          </TabsContent>

          {/* DATABASE */}
          <TabsContent value="database" className="mt-4">
            <AuditSection
              title="Database Health Audit"
              description="Integrity scans across all entities"
              sections={[
                {
                  heading: 'Integrity Checks',
                  checks: [
                    { label: 'No Orphan Records', status: 'pending' },
                    { label: 'No Duplicate IDs', status: 'pending' },
                    { label: 'No Broken Relationships', status: 'pending' },
                    { label: 'No Null Critical Fields', status: 'pending' },
                  ]
                },
                {
                  heading: 'Performance',
                  checks: [
                    { label: 'No Large Slow Queries Identified', status: 'pending' },
                    { label: 'Database Health Score ≥ 95', status: 'pending' },
                  ]
                }
              ]}
              weight={0}
            />
          </TabsContent>

          {/* LOAD TESTING */}
          <TabsContent value="load" className="mt-4">
            <AuditSection
              title="Load Testing"
              description="Simulate concurrent users and measure system performance"
              sections={[
                {
                  heading: 'Concurrent User Simulation',
                  checks: [
                    { label: '50 Concurrent Users — Page Load < 2s', status: 'pending' },
                    { label: '100 Concurrent Users — Page Load < 3s', status: 'pending' },
                    { label: '250 Concurrent Users — Page Load < 5s', status: 'pending' },
                    { label: '500 Concurrent Users — No Crashes', status: 'pending' },
                  ]
                },
                {
                  heading: 'System Metrics Under Load',
                  checks: [
                    { label: 'API Response Time < 500ms', status: 'pending' },
                    { label: 'Search Time < 1s', status: 'pending' },
                    { label: 'Queue Backlog < 100 items', status: 'pending' },
                    { label: 'Database CPU < 80%', status: 'pending' },
                    { label: 'No Memory Overflow', status: 'pending' },
                  ]
                }
              ]}
              weight={5}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}