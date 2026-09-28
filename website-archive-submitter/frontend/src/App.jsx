import React, { useState } from 'react';
import Navbar from './components/Navbar';
import DomainForm from './components/DomainForm';
import LiveMonitor from './components/LiveMonitor';
import ProofRepository from './components/ProofRepository';
import ProofModal from './components/ProofModal';
import Analytics from './components/Analytics';

export default function App() {
  const [activeTab, setActiveTab] = useState('new');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [selectedProof, setSelectedProof] = useState(null);
  const [proofFilterUrl, setProofFilterUrl] = useState('');

  const handleJobCreated = (job) => {
    setSelectedJobId(job.id);
  };

  const handleSelectProofByUrl = (url) => {
    setProofFilterUrl(url);
    setActiveTab('proofs');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'new' && (
          <DomainForm onJobCreated={handleJobCreated} setActiveTab={setActiveTab} />
        )}

        {activeTab === 'monitor' && (
          <LiveMonitor selectedJobId={selectedJobId} onSelectProof={handleSelectProofByUrl} />
        )}

        {activeTab === 'proofs' && (
          <ProofRepository
            initialSearch={proofFilterUrl}
            onOpenModal={(proof) => setSelectedProof(proof)}
          />
        )}

        {activeTab === 'analytics' && <Analytics />}
      </main>

      {selectedProof && (
        <ProofModal proof={selectedProof} onClose={() => setSelectedProof(null)} />
      )}

      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        Website Archive Submitter & Automated Backup Repository Engine
      </footer>
    </div>
  );
}
