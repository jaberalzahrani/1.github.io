import React from 'react';
import { Sparkles, X, FileText, Check } from 'lucide-react';

interface SampleDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (type: 'contract' | 'report' | 'proposal') => void;
}

export const SampleDocsModal: React.FC<SampleDocsModalProps> = ({
  isOpen,
  onClose,
  onSelectSample,
}) => {
  if (!isOpen) return null;

  const samples = [
    {
      id: 'contract' as const,
      title: 'Services Agreement & Terms',
      desc: '2-page business contract with clauses, signature block, and execution dates. Ideal for testing signatures, editing, and Word conversion.',
      badge: '2 Pages',
      icon: '📄',
      highlights: ['Structured Legal Clauses', 'Signature Execution Box', 'Date & Terms'],
    },
    {
      id: 'report' as const,
      title: 'Quarterly Executive Report',
      desc: '3-page business report containing multi-level headings, bullet points, metrics, and multi-page layout. Perfect for PDF to Word conversion.',
      badge: '3 Pages',
      icon: '📊',
      highlights: ['H1 & H2 Headings', 'Bullet Lists & Numbers', 'Financial Overview'],
    },
    {
      id: 'proposal' as const,
      title: 'Product Proposal & Specification',
      desc: '1-page single-sheet proposal with header, summary, and scope. Great for quick watermarking, rotation, and single-page edits.',
      badge: '1 Page',
      icon: '📝',
      highlights: ['Compact Single Sheet', 'Fast Processing', 'Clean Typography'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Load Instant Sample Documents
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select a pre-compiled sample PDF to immediately test editing, merging, converting to Word (.docx), watermarking, and signing without needing to find a file on your device.
          </p>

          <div className="grid grid-cols-1 gap-3">
            {samples.map((sample) => (
              <div
                key={sample.id}
                onClick={() => {
                  onSelectSample(sample.id);
                  onClose();
                }}
                className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-red-400 dark:hover:border-red-500/70 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-red-50/20 dark:hover:bg-red-950/10 cursor-pointer transition-all flex items-start space-x-4 shadow-2xs"
              >
                <div className="text-3xl p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform flex-shrink-0">
                  {sample.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      {sample.title}
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                      {sample.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    {sample.desc}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {sample.highlights.map((h, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium"
                      >
                        ✓ {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
