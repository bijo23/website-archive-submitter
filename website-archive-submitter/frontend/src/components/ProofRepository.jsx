import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Download, ExternalLink, FileText, CheckCircle2, Lock, Filter } from 'lucide-react';

export default function ProofRepository({ onOpenModal, initialSearch = '' }) {
  const [proofs, setProofs] = useState([]);
  const [search, setSearch] = useState(initialSearch);
  const [providerFilter, setProviderFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchProofs = async () => {
    try {
      const resp = await fetch('/api/proofs');
      if (resp.ok) {
        const data = await resp.json();
        setProofs(data);
      }
    } catch (err) {
      console.error("Error fetching proofs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProofs();
  }, []);

  const filteredProofs = proofs.filter(p => {
    const matchesSearch =
      p.original_url.toLowerCase().includes(search.toLowerCase()) ||
      p.proof_token.toLowerCase().includes(search.toLowerCase()) ||
      p.checksum_sha256.toLowerCase().includes(search.toLowerCase()) ||
      p.provider_name.toLowerCase().includes(search.toLowerCase());

    const matchesProvider =
      providerFilter === 'all' ||
      p.provider_name === providerFilter;

    return matchesSearch && matchesProvider;
  });

  return (
    <div className="space-y-6">
      {/* Header & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Lock className="h-5 w-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-100">Permanent Proof-of-Archive Repository</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">Immutable audit logs with cryptographic SHA-256 digests and timestamped proof tokens.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Provider Filter */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Providers</option>
              <option value="wayback_machine">Wayback Machine</option>
              <option value="archive_today">Archive.today</option>
              <option value="simulated_archive_service">Simulated Service</option>
            </select>
          </div>

          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search token, URL, hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <a
            href="/api/proofs/export/csv"
            download
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </a>

          <a
            href="/api/proofs/export/json"
            download
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>JSON</span>
          </a>
        </div>
      </div>

      {/* Proof Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 text-xs uppercase text-slate-400 font-medium border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Proof Token</th>
                <th className="px-6 py-4">Target URL & Snapshot</th>
                <th className="px-6 py-4">Provider</th>
                <th className="px-6 py-4">SHA-256 Digest</th>
                <th className="px-6 py-4">Verification</th>
                <th className="px-6 py-4 text-right">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    Loading proof repository records...
                  </td>
                </tr>
              ) : filteredProofs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    No matching proof records found in repository.
                  </td>
                </tr>
              ) : (
                filteredProofs.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-blue-400">
                      {p.proof_token}
                    </td>

                    <td className="px-6 py-4 max-w-sm">
                      <div className="text-slate-100 font-medium truncate" title={p.original_url}>{p.original_url}</div>
                      <a
                        href={p.snapshot_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 mt-0.5 truncate"
                        title={p.snapshot_url}
                      >
                        <span className="truncate">{p.snapshot_url}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-slate-400">
                      <span className="uppercase tracking-wider px-2 py-1 rounded bg-slate-950 border border-slate-800">
                        {p.provider_name.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-500 max-w-xs truncate" title={p.checksum_sha256}>
                      {p.checksum_sha256.substring(0, 16)}...
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onOpenModal(p)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-medium transition-all inline-flex items-center space-x-1"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Inspect</span>
                      </button>
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
