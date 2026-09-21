import React, { useState } from 'react';
import { 
  Scissors, 
  Download, 
  Loader2, 
  FileText, 
  Check, 
  Layers, 
  Filter
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UploadedFileItem } from '../../types';
import { splitPdf, getSafeFileBuffer } from '../../services/pdfService';
import { DropZone } from '../DropZone';

interface SplitToolProps {
  files: UploadedFileItem[];
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onAddFiles: (files: File[]) => void;
  onLoadSample: (type: 'contract' | 'report' | 'proposal') => void;
}

export const SplitTool: React.FC<SplitToolProps> = ({
  files,
  selectedFileId,
  onSelectFile,
  onAddFiles,
  onLoadSample,
}) => {
  const currentFile = files.find((f) => f.id === selectedFileId) || files[0];

  const [mode, setMode] = useState<'single' | 'range'>('range');
  const [rangeInput, setRangeInput] = useState('1-2');
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitResults, setSplitResults] = useState<Array<{ filename: string; blobUrl: string; pageNumber?: number }> | null>(null);

  const totalPages = currentFile?.pageCount || 1;

  const handleSplit = async () => {
    if (!currentFile) return;

    try {
      setIsProcessing(true);
      const buffer = await getSafeFileBuffer(currentFile);

      const output = await splitPdf(buffer, mode, rangeInput);
      const resultsWithUrls = output.map((item) => {
        const blob = new Blob([item.bytes as any], { type: 'application/pdf' });
        return {
          filename: item.filename,
          blobUrl: URL.createObjectURL(blob),
          pageNumber: item.pageNumber,
        };
      });

      setSplitResults(resultsWithUrls);

      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (err: any) {
      console.error('Split error:', err);
      alert(`Error splitting PDF: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSingle = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAll = () => {
    if (!splitResults) return;
    splitResults.forEach((res, index) => {
      setTimeout(() => {
        handleDownloadSingle(res.blobUrl, res.filename);
      }, index * 250);
    });
  };

  if (!currentFile) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-xs font-semibold mb-3">
            <Scissors className="w-3.5 h-3.5" />
            <span>PDF Splitter</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Split PDF Pages & Extract Custom Ranges
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            Separate single pages or extract specific chapters and ranges into standalone high-quality PDF files.
          </p>
        </div>

        <DropZone
          onFilesSelected={onAddFiles}
          onLoadSample={onLoadSample}
          label="Drag & Drop a PDF to Split"
          description="Drop any multi-page PDF here to extract or separate pages"
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Scissors className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                Split PDF Document
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Splitting: <span className="font-semibold text-slate-700 dark:text-slate-300">{currentFile.name}</span> ({totalPages} total pages)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        {/* Left Col: Split Modes & Options */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Split Mode
            </h3>

            <div className="space-y-2">
              <label
                onClick={() => setMode('range')}
                className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition ${
                  mode === 'range'
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="splitMode"
                  checked={mode === 'range'}
                  onChange={() => setMode('range')}
                  className="mt-1 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Extract Specific Range
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Extract custom page numbers (e.g. 1-2, 4, 6-8) into a unified PDF.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setMode('single')}
                className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition ${
                  mode === 'single'
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="splitMode"
                  checked={mode === 'single'}
                  onChange={() => setMode('single')}
                  className="mt-1 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Extract All Pages Individually
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Split every single page into its own distinct 1-page PDF file.
                  </p>
                </div>
              </label>
            </div>

            {mode === 'range' && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Page Range Expression
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder={`1-${Math.min(3, totalPages)}`}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-400">
                  Examples: "1-2", "1, 3", "2-{totalPages}".
                </p>
              </div>
            )}

            <button
              id="execute-split-btn"
              type="button"
              disabled={isProcessing}
              onClick={handleSplit}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/30 disabled:opacity-50 flex items-center justify-center space-x-2 transition"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Splitting Pages...</span>
                </>
              ) : (
                <>
                  <Scissors className="w-4 h-4" />
                  <span>Split Document Now</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right 2 Cols: Results and Download Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center justify-between">
              <span>Split Output Files</span>
              {splitResults && splitResults.length > 1 && (
                <button
                  type="button"
                  onClick={handleDownloadAll}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 inline-flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download All ({splitResults.length} files)</span>
                </button>
              )}
            </h3>

            {!splitResults ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <Scissors className="w-8 h-8 mb-2 opacity-40 text-amber-500" />
                <p className="text-xs font-medium">Select your split preferences and click "Split Document Now"</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                {splitResults.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {item.filename}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {item.pageNumber ? `Individual Page ${item.pageNumber}` : 'Extracted Custom Set'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <a
                        href={item.blobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200"
                      >
                        Preview
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDownloadSingle(item.blobUrl, item.filename)}
                        className="px-3 py-1 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center space-x-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
