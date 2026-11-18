import { getStatsSummary, formatToIST } from '@/lib/posts';
import { BarChart3, Layers, MapPin, Database, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
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
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Platform & Ingestion Analytics
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Detailed metrics covering role taxonomy distribution, city geographic spread, deduplication efficiency, and pipeline execution logs.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Active Fresher Roles</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
            {stats.activeTotal.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">100% verified 0-2 yrs experience</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Duplicates Removed</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
            {stats.totalDuplicatesRemoved.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Via exact hash & trigram &gt;0.85</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Role Categories</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
            {sortedRoles.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Fixed role taxonomy</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Logged Pipeline Runs</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
            {stats.recentRuns.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Refreshed daily via GitHub Actions</p>
        </div>
      </div>

      {/* Role and City Distribution Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Posts by Role</span>
            </h2>
            <span className="text-xs text-slate-500">{sortedRoles.length} taxonomies</span>
          </div>

          <div className="space-y-3">
            {sortedRoles.map(([role, count]) => {
              const pct = stats.activeTotal > 0 ? Math.round((count / stats.activeTotal) * 100) : 0;
              return (
                <div key={role}>
                  <div className="flex items-center justify-between text-xs font-medium mb-1">
                    <span className="text-slate-800">{role}</span>
                    <span className="text-slate-500">
                      {count} <span className="text-slate-400">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
                      style={{ width: `${(count / maxRoleCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* City Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Posts by City</span>
            </h2>
            <span className="text-xs text-slate-500">{sortedCities.length} canonical locations</span>
          </div>

          <div className="space-y-3">
            {sortedCities.map(([city, count]) => {
              const pct = stats.activeTotal > 0 ? Math.round((count / stats.activeTotal) * 100) : 0;
              return (
                <div key={city}>
                  <div className="flex items-center justify-between text-xs font-medium mb-1">
                    <span className="text-slate-800">{city}</span>
                    <span className="text-slate-500">
                      {count} <span className="text-slate-400">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                      style={{ width: `${(count / maxCityCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sources Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-600" />
          <span>Posts by Ingestion Source</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {sortedSources.map(([source, count]) => (
            <div key={source} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{source}</span>
              <div className="text-xl font-bold text-slate-900 mt-1">{count} posts</div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 mt-2 overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full"
                  style={{ width: `${(count / maxSourceCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Last 10 Pipeline Runs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden">
        <h2 className="text-base font-bold text-slate-900 mb-1">Recent Pipeline Execution History</h2>
        <p className="text-xs text-slate-500 mb-4">
          Logs recorded in <code className="text-indigo-600 font-mono">pipeline_runs</code> table across recent executions.
        </p>

        {stats.recentRuns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
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
              <tbody className="divide-y divide-slate-100">
                {stats.recentRuns.map((run: any) => (
                  <tr key={run.id || run.started_at} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-900 whitespace-nowrap">
                      {formatToIST(run.started_at)}
                    </td>
                    <td className="py-3 px-3">{run.fetched?.toLocaleString() || '-'}</td>
                    <td className="py-3 px-3">{run.after_prefilter?.toLocaleString() || '-'}</td>
                    <td className="py-3 px-3 text-rose-600 font-medium">{run.duplicates_removed || 0}</td>
                    <td className="py-3 px-3">{run.tagged || 0}</td>
                    <td className="py-3 px-3 font-bold text-emerald-600">{run.active_total || '-'}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Success
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            No pipeline runs logged yet. Execute <code className="text-indigo-600">npm run pipeline</code> to record the first run.
          </div>
        )}
      </div>
    </div>
  );
}
