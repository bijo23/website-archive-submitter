import React from 'react';
import { X, ShieldCheck, ExternalLink, Printer, Copy, Check } from 'lucide-react';

export default function ProofModal({ proof, onClose }) {
  const [copied, setCopied] = React.useState(false);

  if (!proof) return null;

  const copyHash = () => {
    navigator.clipboard.writeText(proof.checksum_sha256);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Cryptographic Proof Certificate</h3>
              <p className="text-xs font-mono text-blue-400">{proof.proof_token}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Certificate Metadata Grid */}
        <div className="space-y-4 text-sm">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div>
              <span className="text-xs text-slate-500 block uppercase font-medium">Original Target URL</span>
              <a href={proof.original_url} target="_blank" rel="noreferrer" className="text-slate-200 font-medium hover:text-blue-400 break-all">
                {proof.original_url}
              </a>
            </div>

            <div className="border-t border-slate-800/80 pt-3">
              <span className="text-xs text-slate-500 block uppercase font-medium">Verifiable Snapshot Link</span>
              <a href={proof.snapshot_url} target="_blank" rel="noreferrer" className="text-emerald-400 font-medium hover:text-emerald-300 flex items-center space-x-1 break-all">
                <span>{proof.snapshot_url}</span>
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-500 block uppercase font-medium">Provider</span>
              <span className="text-slate-200 font-semibold uppercase">{proof.provider_name}</span>
            </div>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-500 block uppercase font-medium">HTTP Archive Status</span>
              <span className="text-emerald-400 font-semibold font-mono">{proof.http_status} OK</span>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 uppercase font-medium">SHA-256 Verification Digest</span>
              <button
                onClick={copyHash}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy Hash'}</span>
              </button>
            </div>
            <p className="font-mono text-xs text-slate-300 break-all bg-slate-900/80 p-2 rounded border border-slate-800">
              {proof.checksum_sha256}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <a
            href={`/api/proofs/${proof.proof_token}/certificate`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all flex items-center space-x-2 shadow-lg shadow-blue-500/20"
          >
            <Printer className="h-4 w-4" />
            <span>Open Certificate Document</span>
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
