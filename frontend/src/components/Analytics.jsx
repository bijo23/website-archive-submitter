import React, { useState, useEffect } from 'react';
import { BarChart2, CheckCircle2, Globe, ShieldCheck, Download, RefreshCw, Layers } from 'lucide-react';

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const resp = await fetch('/api/stats');
      if (resp.ok) {
        const data = await resp.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading repository analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between card-hover-effect">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-blue-400" />
            <span>Repository Analytics & Exports</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Global performance metrics, multi-domain coverage, and bulk audit exports.</p>
        </div>

        <button
          onClick={fetchStats}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Stats</span>
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg card-hover-effect">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase">Domains</span>
            <Globe className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-100">{stats.total_domains || 1}</p>
          <span className="text-xs text-slate-500 mt-1 block">Registered domains</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg card-hover-effect">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase">Total Jobs</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-100">{stats.total_jobs}</p>
          <span className="text-xs text-slate-500 mt-1 block">{stats.completed_jobs} completed</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg card-hover-effect">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase">Discovered URLs</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-extrabold text-indigo-400">{stats.total_discovered_urls}</p>
          <span className="text-xs text-slate-500 mt-1 block">Valid targets</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg card-hover-effect">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase">Archive Proofs</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400">{stats.total_archive_proofs}</p>
          <span className="text-xs text-slate-500 mt-1 block">Saved snapshots</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg card-hover-effect">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase">Success Rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-100">{stats.success_rate_pct}%</p>
          <span className="text-xs text-slate-500 mt-1 block">Archival completion</span>
        </div>
      </div>

      {/* Bulk Exports Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 card-hover-effect">
        <h3 className="text-lg font-semibold text-slate-100">Bulk Archive Records Export</h3>
        <p className="text-xs text-slate-400">Download complete proof manifest packages containing all snapshot URLs, cryptographic SHA-256 hashes, and submission timestamps.</p>

        <div className="flex flex-wrap gap-4 pt-2">
          <a
            href="/api/proofs/export/csv"
            download
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-blue-500/20 transition-all transform active:scale-[0.99]"
          >
            <Download className="h-4 w-4" />
            <span>Download CSV Spreadsheet</span>
          </a>

          <a
            href="/api/proofs/export/json"
            download
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Download JSON Proof Manifest</span>
          </a>
        </div>
      </div>
    </div>
  );
}
