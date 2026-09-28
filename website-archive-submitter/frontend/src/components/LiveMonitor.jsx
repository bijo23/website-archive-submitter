import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, CheckCircle2, Clock, AlertTriangle, ExternalLink, ShieldCheck, Pause, Play, RotateCcw } from 'lucide-react';

export default function LiveMonitor({ selectedJobId, onSelectProof }) {
  const [jobs, setJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const formatProviderName = (name) => {
    if (!name) return 'Unknown Provider';
    const lower = name.toLowerCase();
    if (lower.includes('simulated')) return 'Simulated Service';
    if (lower.includes('wayback')) return 'Wayback Machine';
    if (lower.includes('archive_today') || lower.includes('archive_ph') || lower.includes('archive.today')) return 'Archive.today';
    if (lower.includes('both') || lower.includes('dual')) return 'Dual Submission';
    return name.replace(/_/g, ' ');
  };

  const fetchJobs = async () => {
    try {
      const resp = await fetch('/api/jobs');
      if (resp.ok) {
        const data = await resp.json();
        setJobs(data);

        if (data.length > 0) {
          const targetId = selectedJobId || data[0].id;
          const found = data.find(j => j.id === targetId) || data[0];

          const detailResp = await fetch(`/api/jobs/${found.id}`);
          if (detailResp.ok) {
            const detailData = await detailResp.json();
            setActiveJob(detailData);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 2500);
    return () => clearInterval(interval);
  }, [selectedJobId]);

  const handlePause = async () => {
    if (!activeJob) return;
    setActionLoading(true);
    try {
      await fetch(`/api/jobs/${activeJob.id}/pause`, { method: 'POST' });
      await fetchJobs();
    } catch (err) {
      console.error("Error pausing job:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!activeJob) return;
    setActionLoading(true);
    try {
      await fetch(`/api/jobs/${activeJob.id}/resume`, { method: 'POST' });
      await fetchJobs();
    } catch (err) {
      console.error("Error resuming job:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!activeJob) return;
    setActionLoading(true);
    try {
      await fetch(`/api/jobs/${activeJob.id}/retry`, { method: 'POST' });
      await fetchJobs();
    } catch (err) {
      console.error("Error retrying job:", err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !activeJob) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading execution telemetry...</span>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <Activity className="h-12 w-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-200">No Archiving Jobs Active</h3>
        <p className="text-sm text-slate-400 mt-1">Submit a domain in the "Submit Domain" tab to start automated crawling and submission.</p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1"/> Completed</span>;
      case 'paused':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"><Pause className="w-3 h-3 mr-1"/> Paused</span>;
      case 'crawling':
      case 'archiving':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"><RefreshCw className="w-3 h-3 mr-1 animate-spin"/> {status.toUpperCase()}</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400"><Clock className="w-3 h-3 mr-1"/> {status}</span>;
    }
  };

  const formatDomainLabel = (domain) => {
    if (!domain) return '';
    return domain.length > 40 ? domain.substring(0, 37) + '...' : domain;
  };

  return (
    <div className="space-y-6">
      {/* Job Selector Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl min-w-0 max-w-full">
        <div className="flex items-center space-x-3 min-w-0 max-w-full overflow-hidden">
          <Activity className="h-5 w-5 text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-300 flex-shrink-0">Active Job selector:</span>
          <select
            value={activeJob?.id || ''}
            onChange={(e) => {
              const selected = jobs.find(j => j.id === parseInt(e.target.value));
              if (selected) setActiveJob(selected);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[240px] xs:max-w-[320px] sm:max-w-md md:max-w-xl truncate flex-1 min-w-0"
            title={activeJob ? `Job #${activeJob.id} - ${activeJob.target_domain}` : ''}
          >
            {jobs.map(j => (
              <option key={j.id} value={j.id} title={j.target_domain}>
                Job #{j.id} - {formatDomainLabel(j.target_domain)} ({j.status})
              </option>
            ))}
          </select>
        </div>

        {/* Action Controls: Pause, Resume, Retry */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {activeJob?.status === 'archiving' || activeJob?.status === 'crawling' ? (
            <button
              onClick={handlePause}
              disabled={actionLoading}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-xs font-medium transition-colors"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Pause Job</span>
            </button>
          ) : activeJob?.status === 'paused' ? (
            <button
              onClick={handleResume}
              disabled={actionLoading}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Resume Job</span>
            </button>
          ) : null}

          {activeJob?.total_failed > 0 && (
            <button
              onClick={handleRetry}
              disabled={actionLoading}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 text-xs font-medium transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retry Failed ({activeJob.total_failed})</span>
            </button>
          )}

          <button
            onClick={fetchJobs}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {activeJob && (
        <>
          {/* Status Header Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 min-w-0 overflow-hidden">
              <span className="text-xs text-slate-400 font-medium">Target Domain</span>
              <p className="text-lg font-bold text-slate-100 truncate mt-1" title={activeJob.target_domain}>
                {activeJob.target_domain}
              </p>
              <span className="text-xs text-slate-500">Depth: {activeJob.max_depth} | Service: {formatProviderName(activeJob.service_target)}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium">Job Status</span>
              <div className="mt-2">{getStatusBadge(activeJob.status)}</div>
              <span className="text-xs text-slate-500 mt-1 block">
                {activeJob.is_incremental ? 'Incremental Mode' : 'Full Scan Mode'}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium">URLs Discovered</span>
              <p className="text-2xl font-bold text-blue-400 mt-1">{activeJob.total_urls_found}</p>
              <span className="text-xs text-slate-500">({activeJob.new_urls_found} new URLs)</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium">Archived Proofs</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{activeJob.total_archived}</p>
              <span className="text-xs text-slate-500">Saved & Verifiable</span>
            </div>
          </div>

          {/* Live Progress Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Execution Progress</span>
              <span>
                {activeJob.total_urls_found > 0
                  ? `${Math.round((activeJob.total_archived / activeJob.total_urls_found) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    activeJob.total_urls_found > 0
                      ? (activeJob.total_archived / activeJob.total_urls_found) * 100
                      : 0
                  }%`
                }}
              ></div>
            </div>
          </div>

          {/* Discovered URLs Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold text-slate-200">Discovered URLs & Archive Queue</h3>
              <span className="text-xs text-slate-400">{activeJob.urls.length} URLs tracked</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 font-medium">
                  <tr>
                    <th className="px-6 py-3">Page Title / URL</th>
                    <th className="px-6 py-3">Source</th>
                    <th className="px-6 py-3">HTTP</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {activeJob.urls.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                        Crawling target domain... Discovered URLs will appear here in real-time.
                      </td>
                    </tr>
                  ) : (
                    activeJob.urls.map((urlItem) => (
                      <tr key={urlItem.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 max-w-xs sm:max-w-md">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-slate-100 truncate" title={urlItem.page_title}>
                              {urlItem.page_title || 'Untitled Page'}
                            </span>
                            {urlItem.is_new_url && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                NEW
                              </span>
                            )}
                          </div>
                          <a
                            href={urlItem.original_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-slate-400 hover:text-blue-400 flex items-center space-x-1 mt-0.5 truncate"
                            title={urlItem.original_url}
                          >
                            <span className="truncate">{urlItem.original_url}</span>
                            <ExternalLink className="h-3 w-3 inline flex-shrink-0" />
                          </a>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-400">
                          <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800">
                            {urlItem.discovery_source}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <span className="text-emerald-400 font-mono font-bold">
                            {urlItem.status_code || 200} OK
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {urlItem.status === 'archived' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Archived
                            </span>
                          )}
                          {urlItem.status === 'submitting' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Submitting
                            </span>
                          )}
                          {urlItem.status === 'skipped_already_archived' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400">
                              Skipped (Already Archived)
                            </span>
                          )}
                          {urlItem.status === 'failed' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Failed
                            </span>
                          )}
                          {urlItem.status === 'accessible' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300">
                              Verified Accessible
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => onSelectProof(urlItem.original_url)}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center justify-end space-x-1 ml-auto"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>View Proof</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
