import { getStatsSummary, formatToIST } from '@/lib/posts';
import { BarChart3, Layers, MapPin, Database, CheckCircle2, AlertTriangle, ArrowLeft, Zap, Target } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 300; // ISR revalidate every 300s (PRD Section 8)

export default async function StatsPage() {
  const stats = await getStatsSummary();

  const sortedRoles = Object.entries(stats.rolesBreakdown).sort((a, b) => b[1] - a[1]);
  const sortedCities = Object.entries(stats.citiesBreakdown).sort((a, b) => b[1] - a[1]);
  const sortedSources = Object.entries(stats.sourcesBreakdown).sort((a, b) => b[1] - a[1]);

  const maxRoleCount = sortedRoles.length > 0 ? sortedRoles[0][1] : 1;
  const maxCityCount = sortedCities.length > 0 ? sortedCities[0][1] : 1;
  const maxSourceCount = sortedSources.length > 0 ? sortedSources[0][1] : 1;

  return (
    <div className="space-y-8">
      {/* Back button and page title */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Job Feed</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#101828]">
          Platform & Ingestion Analytics
        </h1>
        <p className="text-sm text-[#475467] mt-1">
          Detailed metrics covering role taxonomy distribution, city geographic spread, deduplication efficiency, and pipeline execution logs.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 1. Active Fresher Roles */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[#667085]">
            <span>Active Roles</span>
            <div className="p-1.5 rounded-lg bg-[#ECFDF3] text-[#027A48]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#101828]">
            {stats.activeTotal.toLocaleString()}
          </div>
          <p className="text-[11px] text-[#027A48] mt-1 font-medium">0-2 yrs fresher only</p>
        </div>

        {/* 2. Role Tagging Accuracy */}
        <div className="bg-white rounded-xl border border-[#D6BBFB] bg-[#F9F5FF]/40 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[#6941C6]">
            <span>Role Accuracy</span>
            <div className="p-1.5 rounded-lg bg-[#F4EBFF] text-[#6941C6]">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#6941C6]">
            {stats.roleAccuracy.pct.toFixed(1)}%
          </div>
          <p className="text-[11px] text-[#475467] mt-1 font-medium">
            {stats.roleAccuracy.correct}/{stats.roleAccuracy.total} hand-verified
          </p>
        </div>

        {/* 3. City Tagging Accuracy */}
        <div className="bg-white rounded-xl border border-[#B2DDFF] bg-[#EFF8FF]/40 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[#0D81FC]">
            <span>City Accuracy</span>
            <div className="p-1.5 rounded-lg bg-[#D1E9FF] text-[#0D81FC]">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#0D81FC]">
            {stats.cityAccuracy.pct.toFixed(1)}%
          </div>
          <p className="text-[11px] text-[#475467] mt-1 font-medium">
            {stats.cityAccuracy.correct}/{stats.cityAccuracy.total} hand-verified
          </p>
        </div>

        {/* 4. LLM Tagging Cost / 1k Posts */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[#667085]">
            <span>Cost / 1k Posts</span>
            <div className="p-1.5 rounded-lg bg-[#EFF8FF] text-[#0D81FC]">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#101828]">
            ${stats.costPer1kUSD.toFixed(3)}
          </div>
          <p className="text-[11px] text-[#475467] mt-1 font-medium">
            ≈ ₹{stats.costPer1kINR.toFixed(2)} INR
          </p>
        </div>

        {/* 5. Duplicates Removed */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[#667085]">
            <span>Duplicates Filtered</span>
            <div className="p-1.5 rounded-lg bg-[#F2F4F7] text-[#344054]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#101828]">
            {stats.totalDuplicatesRemoved.toLocaleString()}
          </div>
          <p className="text-[11px] text-[#667085] mt-1">Hash & trigram &gt;0.85</p>
        </div>

        {/* 6. Role Categories */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[#667085]">
            <span>Role Taxonomy</span>
            <div className="p-1.5 rounded-lg bg-[#F9F5FF] text-[#6941C6]">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-[#101828]">
            {sortedRoles.length}
          </div>
          <p className="text-[11px] text-[#667085] mt-1">Defined categories</p>
        </div>
      </div>

      {/* Sources Breakdown */}
      <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs">
        <h2 className="text-base font-bold text-[#101828] mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-[#0D81FC]" />
          <span>Posts by Ingestion Source</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {sortedSources.map(([source, count]) => (
            <div key={source} className="border border-[#EAECF0] rounded-xl p-4 bg-[#F9FAFB]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">{source}</span>
              <div className="text-xl font-bold text-[#101828] mt-1">{count} posts</div>
              <div className="w-full h-1.5 rounded-full bg-[#EAECF0] mt-2 overflow-hidden">
                <div
                  className="h-full bg-[#0D81FC] rounded-full"
                  style={{ width: `${(count / maxSourceCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role and City Distribution Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Breakdown */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#101828] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#0D81FC]" />
              <span>Posts by Role</span>
            </h2>
            <span className="text-xs text-[#667085]">{sortedRoles.length} taxonomies</span>
          </div>

          <div className="space-y-3">
            {sortedRoles.map(([role, count]) => {
              const pct = stats.activeTotal > 0 ? Math.round((count / stats.activeTotal) * 100) : 0;
              return (
                <div key={role}>
                  <div className="flex items-center justify-between text-xs font-medium mb-1">
                    <span className="text-[#344054]">{role}</span>
                    <span className="text-[#667085]">
                      {count} <span className="text-[#98A2B3]">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#F2F4F7] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0D81FC] transition-all duration-500"
                      style={{ width: `${(count / maxRoleCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* City Breakdown */}
        <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#101828] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#12B76A]" />
              <span>Posts by City</span>
            </h2>
            <span className="text-xs text-[#667085]">{sortedCities.length} canonical locations</span>
          </div>

          <div className="space-y-3">
            {sortedCities.map(([city, count]) => {
              const pct = stats.activeTotal > 0 ? Math.round((count / stats.activeTotal) * 100) : 0;
              return (
                <div key={city}>
                  <div className="flex items-center justify-between text-xs font-medium mb-1">
                    <span className="text-[#344054]">{city}</span>
                    <span className="text-[#667085]">
                      {count} <span className="text-[#98A2B3]">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#F2F4F7] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#12B76A] transition-all duration-500"
                      style={{ width: `${(count / maxCityCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Last 10 Pipeline Runs Table */}
      <div className="bg-white rounded-xl border border-[#EAECF0] p-6 shadow-xs overflow-hidden">
        <h2 className="text-base font-bold text-[#101828] mb-1">Recent Pipeline Execution History</h2>
        <p className="text-xs text-[#667085] mb-4">
          Logs recorded in <code className="text-[#0D81FC] font-mono">pipeline_runs</code> table across recent executions.
        </p>

        {stats.recentRuns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#344054]">
              <thead className="bg-[#F9FAFB] border-b border-[#EAECF0] text-[#667085] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Run Started (IST)</th>
                  <th className="py-2.5 px-3">Raw Fetched</th>
                  <th className="py-2.5 px-3">After Pre-filter</th>
                  <th className="py-2.5 px-3">Duplicates Removed</th>
                  <th className="py-2.5 px-3">Tagged</th>
                  <th className="py-2.5 px-3">Active Total</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F7]">
                {stats.recentRuns.map((run: any) => (
                  <tr key={run.id || run.started_at} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3 px-3 font-medium text-[#101828] whitespace-nowrap">
                      {formatToIST(run.started_at)}
                    </td>
                    <td className="py-3 px-3">{run.fetched?.toLocaleString() || '-'}</td>
                    <td className="py-3 px-3">{run.after_prefilter?.toLocaleString() || '-'}</td>
                    <td className="py-3 px-3 text-[#B42318] font-medium">{run.duplicates_removed || 0}</td>
                    <td className="py-3 px-3">{run.tagged || 0}</td>
                    <td className="py-3 px-3 font-bold text-[#027A48]">{run.active_total || '-'}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#ECFDF3] text-[#027A48] border border-[#ABEFC6]">
                        Success
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[#667085]">
            No pipeline runs logged yet. Execute <code className="text-[#0D81FC]">npm run pipeline</code> to record the first run.
          </div>
        )}
      </div>
    </div>
  );
}
