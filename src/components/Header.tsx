import React from 'react';
import { 
  FileText, 
  Layers, 
  FileEdit, 
  FileCode, 
  Scissors, 
  Stamp, 
  PenTool, 
  Image, 
  Minimize2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { ToolId } from '../types';

interface HeaderProps {
  activeTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
  onOpenSampleModal: () => void;
  filesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTool,
  onSelectTool,
  onOpenSampleModal,
  filesCount,
}) => {
  const tools: Array<{ id: ToolId; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'merge', label: 'Merge PDF', icon: <Layers className="w-4 h-4" /> },
    { id: 'edit', label: 'Edit & Organize', icon: <FileEdit className="w-4 h-4" /> },
    { id: 'to-word', label: 'Turn to Word', icon: <FileCode className="w-4 h-4" />, badge: 'DOCX' },
    { id: 'compress', label: 'Compress PDF', icon: <Minimize2 className="w-4 h-4" /> },
    { id: 'sign', label: 'Sign PDF', icon: <PenTool className="w-4 h-4" /> },
    { id: 'split', label: 'Split PDF', icon: <Scissors className="w-4 h-4" /> },
    { id: 'watermark', label: 'Watermark', icon: <Stamp className="w-4 h-4" /> },
    { id: 'images', label: 'Images & PDF', icon: <Image className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTool('merge')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white font-sans">PDF Studio</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">Client-Side</span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Edit, Merge & Word Converter</p>
            </div>
          </div>

          {/* Quick Actions / Sample PDF */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              id="header-samples-btn"
              onClick={onOpenSampleModal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition"
              title="Load ready-to-test sample documents"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Sample Docs</span>
            </button>

            <div className="hidden md:flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-800/40">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Private (Runs in Browser)</span>
            </div>
          </div>
        </div>

        {/* Tools Tab Bar */}
        <div className="flex space-x-1 overflow-x-auto no-scrollbar py-2 border-t border-slate-800/80">
          {tools.map((t) => {
            const isActive = activeTool === t.id;
            return (
              <button
                key={t.id}
                id={`nav-tab-${t.id}`}
                onClick={() => onSelectTool(t.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                {t.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      isActive ? 'bg-red-700 text-red-100' : 'bg-slate-800 text-blue-400 border border-slate-700'
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
