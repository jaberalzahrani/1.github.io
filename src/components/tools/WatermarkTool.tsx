import React, { useState, useEffect } from 'react';
import { 
  Stamp, 
  Download, 
  Loader2, 
  Eye, 
  Check, 
  Sliders, 
  FileText 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UploadedFileItem, WatermarkOptions } from '../../types';
import { applyWatermark, renderPageToDataUrl, getSafeFileBuffer } from '../../services/pdfService';
import { DropZone } from '../DropZone';

interface WatermarkToolProps {
  files: UploadedFileItem[];
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onAddFiles: (files: File[]) => void;
  onLoadSample: (type: 'contract' | 'report' | 'proposal') => void;
}

export const WatermarkTool: React.FC<WatermarkToolProps> = ({
  files,
  selectedFileId,
  onSelectFile,
  onAddFiles,
  onLoadSample,
}) => {
  const currentFile = files.find((f) => f.id === selectedFileId) || files[0];

  const [options, setOptions] = useState<WatermarkOptions>({
    text: 'CONFIDENTIAL',
    opacity: 0.25,
    rotation: 45,
    fontSize: 48,
    color: '#DC2626',
    position: 'diagonal',
    includePageNumbers: true,
    pageNumberFormat: 'page_of_total',
  });

  const [pagePreviewUrl, setPagePreviewUrl] = useState<string | null>(null);
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load preview of page 1
  useEffect(() => {
    if (!currentFile) return;

    let isCancelled = false;
    async function loadPreview() {
      try {
        setIsRenderingPreview(true);
        const buffer = await getSafeFileBuffer(currentFile);

        const url = await renderPageToDataUrl(buffer, 1, 1.4);
        if (!isCancelled) setPagePreviewUrl(url);
      } catch (e) {
        console.error('Error rendering page 1 preview:', e);
      } finally {
        if (!isCancelled) setIsRenderingPreview(false);
      }
    }

    loadPreview();
    return () => {
      isCancelled = true;
    };
  }, [currentFile?.id]);

  const handleApplyAndDownload = async () => {
    if (!currentFile) return;

    try {
      setIsExporting(true);
      const buffer = await getSafeFileBuffer(currentFile);

      const watermarkedBytes = await applyWatermark(buffer, options);
      const blob = new Blob([watermarkedBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `watermarked_${currentFile.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      try {
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (err: any) {
      console.error('Watermark error:', err);
      alert(`Could not watermark PDF: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!currentFile) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 text-xs font-semibold mb-3">
            <Stamp className="w-3.5 h-3.5" />
            <span>Watermark & Page Numbers</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Protect & Number Your Documents
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            Stamp customizable watermarks and continuous header/footer page numbering across all pages instantly.
          </p>
        </div>

        <DropZone
          onFilesSelected={onAddFiles}
          onLoadSample={onLoadSample}
          label="Drag & Drop a PDF to Watermark"
          description="Drop any PDF file here to apply custom text watermarks and page numbers"
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Stamp className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                Watermark & Page Numbers
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Document: <span className="font-semibold text-slate-700 dark:text-slate-300">{currentFile.name}</span>
              </p>
            </div>
          </div>
        </div>

        <button
          id="export-watermark-btn"
          type="button"
          disabled={isExporting}
          onClick={handleApplyAndDownload}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/30 disabled:opacity-50 transition"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Applying Watermark...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Apply & Download PDF</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        {/* Left Col: Watermark & Numbering Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-purple-500" />
              <span>Watermark Configuration</span>
            </h3>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Watermark Text
              </label>
              <input
                type="text"
                value={options.text}
                onChange={(e) => setOptions((prev) => ({ ...prev, text: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
              <div className="flex gap-1.5 mt-2">
                {['CONFIDENTIAL', 'DRAFT', 'DO NOT COPY', 'SAMPLE'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setOptions((prev) => ({ ...prev, text: preset }))}
                    className="px-2 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Position & Orientation
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'diagonal', label: 'Diagonal 45°' },
                  { id: 'center', label: 'Centered' },
                  { id: 'header', label: 'Header' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() =>
                      setOptions((prev) => ({
                        ...prev,
                        position: pos.id as any,
                        rotation: pos.id === 'diagonal' ? 45 : 0,
                      }))
                    }
                    className={`p-2 rounded-lg text-xs font-semibold border text-center transition ${
                      options.position === pos.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Opacity Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>Opacity</span>
                <span className="font-mono">{Math.round(options.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={options.opacity}
                onChange={(e) => setOptions((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                className="w-full accent-purple-600"
              />
            </div>

            {/* Font Size & Color */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                  Font Size
                </label>
                <input
                  type="number"
                  min="20"
                  max="100"
                  value={options.fontSize}
                  onChange={(e) => setOptions((prev) => ({ ...prev, fontSize: Number(e.target.value) }))}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                  Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={options.color}
                    onChange={(e) => setOptions((prev) => ({ ...prev, color: e.target.value }))}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                    {options.color}
                  </span>
                </div>
              </div>
            </div>

            {/* Page Numbering Section */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includePageNumbers}
                  onChange={(e) =>
                    setOptions((prev) => ({ ...prev, includePageNumbers: e.target.checked }))
                  }
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <span>Add Page Numbering in Footer</span>
              </label>

              {options.includePageNumbers && (
                <div className="flex gap-2 pl-6">
                  <button
                    type="button"
                    onClick={() => setOptions((prev) => ({ ...prev, pageNumberFormat: 'page_of_total' }))}
                    className={`px-2 py-1 text-[11px] rounded border ${
                      options.pageNumberFormat === 'page_of_total'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    "Page 1 of {currentFile.pageCount || 1}"
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptions((prev) => ({ ...prev, pageNumberFormat: 'page' }))}
                    className={`px-2 py-1 text-[11px] rounded border ${
                      options.pageNumberFormat === 'page'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    "1"
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Live Interactive Preview (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 mb-3 flex items-center space-x-1.5">
            <Eye className="w-3.5 h-3.5 text-purple-500" />
            <span>Watermark Preview (Page 1)</span>
          </span>

          <div className="relative max-w-md w-full shadow-2xl rounded-lg overflow-hidden bg-white">
            {isRenderingPreview ? (
              <div className="h-96 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : pagePreviewUrl ? (
              <img
                src={pagePreviewUrl}
                alt="Watermark preview page"
                className="w-full block select-none pointer-events-none"
              />
            ) : (
              <div className="h-96 flex items-center justify-center text-xs text-slate-400">
                Rendering preview...
              </div>
            )}

            {/* Live Watermark Overlay */}
            {options.text && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                style={{
                  alignItems:
                    options.position === 'header'
                      ? 'flex-start'
                      : options.position === 'footer'
                      ? 'flex-end'
                      : 'center',
                  paddingTop: options.position === 'header' ? '24px' : '0px',
                  paddingBottom: options.position === 'footer' ? '30px' : '0px',
                }}
              >
                <span
                  style={{
                    color: options.color,
                    opacity: options.opacity,
                    fontSize: `${options.fontSize * 0.75}px`,
                    transform: `rotate(${options.rotation}deg)`,
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                  }}
                >
                  {options.text}
                </span>
              </div>
            )}

            {/* Live Page Number Overlay */}
            {options.includePageNumbers && (
              <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none select-none text-[9px] font-mono text-slate-500">
                {options.pageNumberFormat === 'page_of_total'
                  ? `Page 1 of ${currentFile.pageCount || 1}`
                  : '1'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
