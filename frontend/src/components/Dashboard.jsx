import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Globe, Layers, CheckCircle2, AlertTriangle, Clock, Archive, ExternalLink, RefreshCw, Activity, ShieldCheck } from 'lucide-react';

export default function Dashboard({ setActiveTab, onSelectJob }) {
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, jobsRes, proofsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/jobs'),
        fetch('/api/proofs')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (jobsRes.ok) setJobs(await jobsRes.json());
      if (proofsRes.ok) setProofs(await proofsRes.json());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatProviderName = (name) => {
    if (!name) return 'Unknown Provider';
    if (name.includes('simulated')) return 'Simulated Service';
    if (name.includes('wayback')) return 'Wayback Machine';
    if (name.includes('archive_today') || name.includes('archive_ph')) return 'Archive.today';
    return name.replace(/_/g, ' ');
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading executive dashboard...</span>
      </div>
    );
  }

  const queuedCount = jobs.filter(j => j.status === 'queued' || j.status === 'crawling' || j.status === 'archiving').length;
  const pendingUrlsCount = jobs.reduce((acc, j) => acc + (j.total_urls_found - j.total_archived - j.total_failed), 0);
  const failedSubmissionsCount = jobs.reduce((acc, j) => acc + j.total_failed, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title & Refresh */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between card-hover-effect">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-blue-400" />
            <span>Website Archiving Command Dashboard</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Real-time domain inventory, submission queues, archival status, and historical records.</p>
        </div>

        <button
          onClick={fetchDashboardData}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* 12-Section Metric KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg card-hover-effect">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase">Registered Domains</span>
            <Globe className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-3xl font-extrabold text-slate-100">{stats?.total_domains || jobs.length}</p>
          <span className="text-xs text-slate-500 mt-1 block">Active domain targets</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg card-hover-effect">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase">Discovered URLs</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-3xl font-extrabold text-indigo-400">{stats?.total_discovered_urls || 0}</p>
          <span className="text-xs text-slate-500 mt-1 block">{pendingUrlsCount > 0 ? `${pendingUrlsCount} pending processing` : 'All processed'}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg card-hover-effect">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase">Successful Archivals</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-400">{stats?.total_archive_proofs || 0}</p>
          <span className="text-xs text-slate-500 mt-1 block">Verifiable archive proofs</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg card-hover-effect">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase">Failed Submissions</span>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <p className="text-3xl font-extrabold text-red-400">{failedSubmissionsCount}</p>
          <span className="text-xs text-slate-500 mt-1 block">{queuedCount} active queue jobs</span>
        </div>
      </div>

      {/* Domain Status Overview Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-semibold text-slate-200 flex items-center space-x-2">
            <Globe className="h-4 w-4 text-blue-400" />
            <span>Domain Pipeline Status & Scan Telemetry</span>
          </h3>
          <button
            onClick={() => setActiveTab('new')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
          >
            + Add Domain
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No active domain jobs found. Click "+ Add Domain" to start archiving.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.slice(0, 6).map((job) => (
              <div key={job.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 card-hover-effect">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 truncate max-w-[180px]" title={job.target_domain}>
                    {job.target_domain}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    job.status === 'archiving' || job.status === 'crawling' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {job.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block">Discovered</span>
                    <span className="font-bold text-slate-200">{job.total_urls_found} URLs</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block">Archived</span>
                    <span className="font-bold text-emerald-400">{job.total_archived} URLs</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Archive Service:</span>
                    <span className="text-slate-300 font-semibold">{formatProviderName(job.service_target)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scan Started:</span>
                    <span className="text-slate-300">{new Date(job.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSelectJob(job.id);
                    setActiveTab('monitor');
                  }}
                  className="w-full py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-medium transition-colors"
                >
                  Inspect Live Queue
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Archival Proof Links Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-200 flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Recent Permanent Archive Proof Links</span>
          </h3>
          <button
            onClick={() => setActiveTab('proofs')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
          >
            View Repository All ({proofs.length})
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 font-medium">
              <tr>
                <th className="px-6 py-3">Proof Token</th>
                <th className="px-6 py-3">Target URL</th>
                <th className="px-6 py-3">Provider</th>
                <th className="px-6 py-3">Archive Link</th>
                <th className="px-6 py-3 text-right">HTTP Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {proofs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No archive proofs generated yet. Submit a domain to populate archive repository links.
                  </td>
                </tr>
              ) : (
                proofs.slice(0, 5).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-blue-400 whitespace-nowrap">
                      {p.proof_token}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate" title={p.original_url}>
                      {p.original_url}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-300 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-950 border border-slate-800 whitespace-nowrap font-sans font-semibold">
                        {formatProviderName(p.provider_name)}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <a
                        href={p.snapshot_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 truncate"
                      >
                        <span className="truncate">{p.snapshot_url}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-mono text-emerald-400 font-bold whitespace-nowrap">
                      {p.http_status} OK
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
