import React, { useState } from 'react';
import { Globe, Layers, Zap, ToggleLeft, ToggleRight, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

export default function DomainForm({ onJobCreated, setActiveTab }) {
  const [targetDomain, setTargetDomain] = useState('example.com');
  const [maxDepth, setMaxDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(30);
  const [simulateMode, setSimulateMode] = useState(true);
  const [serviceTarget, setServiceTarget] = useState('simulated');
  const [isIncremental, setIsIncremental] = useState(false);
  const [rateLimitSec, setRateLimitSec] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetDomain.trim()) {
      setError('Please enter a valid domain or URL.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resp = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_domain: targetDomain,
          max_depth: parseInt(maxDepth),
          max_pages: parseInt(maxPages),
          simulate_mode: simulateMode,
          service_target: serviceTarget,
          rate_limit_sec: parseFloat(rateLimitSec),
          is_incremental: isIncremental
        })
      });

      if (!resp.ok) {
        throw new Error('Failed to create archiving job');
      }

      const jobData = await resp.json();
      onJobCreated(jobData);
      setActiveTab('monitor');
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Start New Website Archiving Task</h2>
            <p className="text-xs text-slate-400">Discover accessible URLs, submit to archive providers, and generate proof records.</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Target Domain or Website URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={targetDomain}
                onChange={(e) => setTargetDomain(e.target.value)}
                placeholder="e.g. wikipedia.org or https://news.ycombinator.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Supports single or multi-domain projects. Sitemap, robots.txt, canonical links, and RSS feeds will be scanned automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <span>Target Archive Service</span>
              </label>
              <select
                value={serviceTarget}
                onChange={(e) => {
                  setServiceTarget(e.target.value);
                  if (e.target.value !== 'simulated') setSimulateMode(false);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="simulated">Simulated Local Provider (Fastest Test)</option>
                <option value="wayback_machine">Internet Archive / Wayback Machine</option>
                <option value="archive_today">Archive.today / Archive.ph</option>
                <option value="both">Both Services (Wayback + Archive.today)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
                <Layers className="h-4 w-4 text-slate-400" />
                <span>Max Crawl Depth</span>
              </label>
              <select
                value={maxDepth}
                onChange={(e) => setMaxDepth(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 (Homepage & Direct Links)</option>
                <option value={2}>2 (Standard Deep Crawl)</option>
                <option value={3}>3 (Exhaustive Sub-pages)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
                <Zap className="h-4 w-4 text-slate-400" />
                <span>Max Pages Limit</span>
              </label>
              <input
                type="number"
                min="5"
                max="200"
                value={maxPages}
                onChange={(e) => setMaxPages(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-3 pt-6">
              <input
                type="checkbox"
                id="incremental"
                checked={isIncremental}
                onChange={(e) => setIsIncremental(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="incremental" className="text-xs text-slate-300 font-medium">
                Incremental Scan Mode <br />
                <span className="text-slate-500 font-normal">Only process new URLs (Skip already archived URLs for this domain).</span>
              </label>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-slate-200">Execution Mode</h4>
                <p className="text-xs text-slate-400">
                  {simulateMode
                    ? 'Simulated Mode: Rapid local testing & instant proof generation (Recommended for demos).'
                    : 'Live Mode: Submits real API calls to public web-archiving providers.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !simulateMode;
                  setSimulateMode(next);
                  if (next) setServiceTarget('simulated');
                }}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                {simulateMode ? (
                  <ToggleLeft className="h-8 w-8 text-blue-500" />
                ) : (
                  <ToggleRight className="h-8 w-8 text-emerald-500" />
                )}
              </button>
            </div>

            <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">Rate Limit Delay (sec/request):</span>
              <select
                value={rateLimitSec}
                onChange={(e) => setRateLimitSec(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
              >
                <option value={0.1}>0.1s (Fastest)</option>
                <option value={0.5}>0.5s (Balanced)</option>
                <option value={1.0}>1.0s (Polite)</option>
                <option value={2.0}>2.0s (Strict Throttling)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span>Initializing Crawler...</span>
            ) : (
              <>
                <span>Launch Archiving Job</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
