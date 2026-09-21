import React, { useState } from 'react';
import { 
  Minimize2, 
  Download, 
  Loader2, 
  FileText, 
  CheckCircle2, 
  Sliders, 
  Sparkles, 
  Zap, 
  ShieldCheck,
  Eye,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UploadedFileItem, CompressionOptions, CompressionLevel } from '../../types';
import { compressPdf, getSafeFileBuffer, renderPageToDataUrl } from '../../services/pdfService';
import { DropZone } from '../DropZone';

interface CompressToolProps {
  files: UploadedFileItem[];
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onAddFiles: (files: File[]) => void;
  onLoadSample: (type: 'contract' | 'report' | 'proposal') => void;
}

export const CompressTool: React.FC<CompressToolProps> = ({
  files,
  selectedFileId,
  onSelectFile,
  onAddFiles,
  onLoadSample,
}) => {
  const currentFile = files.find((f) => f.id === selectedFileId) || files[0];

  const [level, setLevel] = useState<CompressionLevel>('recommended');
  const [customQuality, setCustomQuality] = useState<number>(0.7);
  const [customScale, setCustomScale] = useState<number>(1.0);
  const [grayscale, setGrayscale] = useState<boolean>(false);

  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [progressInfo, setProgressInfo] = useState<{ current: number; total: number } | null>(null);

  const [result, setResult] = useState<{
    blobUrl: string;
    originalSize: number;
    compressedSize: number;
    previewUrl?: string;
  } | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCompress = async () => {
    if (!currentFile) return;

    try {
      setIsCompressing(true);
      setProgressInfo(null);
      setResult(null);

      const buffer = await getSafeFileBuffer(currentFile);

      const options: CompressionOptions = {
        level,
        quality: level === 'custom' ? customQuality : 0.72,
        scale: level === 'custom' ? customScale : 1.1,
        grayscale: level === 'custom' ? grayscale : false,
      };

      const { buffer: compressedBuffer, originalSize, compressedSize } = await compressPdf(
        buffer,
        options,
        (current, total) => setProgressInfo({ current, total })
      );

      const blob = new Blob([compressedBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      // Generate preview of page 1 of compressed output
      let previewUrl: string | undefined;
      try {
        previewUrl = await renderPageToDataUrl(compressedBuffer, 1, 0.9);
      } catch (err) {
        console.warn('Could not generate preview of compressed PDF:', err);
      }

      setResult({
        blobUrl,
        originalSize,
        compressedSize,
        previewUrl,
      });

      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (err: any) {
      console.error('Compression error:', err);
      alert(`Compression error: ${err.message || err}`);
    } finally {
      setIsCompressing(false);
      setProgressInfo(null);
    }
  };

  const savedPercent = result
    ? Math.max(0, Math.round(((result.originalSize - result.compressedSize) / result.originalSize) * 100))
    : 0;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <span className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <Minimize2 className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Compress PDF
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Reduce file size dramatically for faster emailing, portals, and web sharing.
            </p>
          </div>
        </div>

        {files.length > 1 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Select Document:</span>
            <select
              value={currentFile?.id}
              onChange={(e) => {
                onSelectFile(e.target.value);
                setResult(null);
              }}
              className="text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200"
            >
              {files.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({formatBytes(f.size)})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!currentFile ? (
        <div className="mt-6">
          <DropZone
            onFilesSelected={onAddFiles}
            onLoadSample={onLoadSample}
            label="Drag & Drop PDF here to compress"
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Preset Options & Configuration */}
          <div className="lg:col-span-7 space-y-6">
            {/* Active File Card */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {currentFile.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    Original Size: <span className="font-semibold text-slate-600 dark:text-slate-300">{formatBytes(currentFile.size)}</span>
                    {currentFile.pageCount ? ` • ${currentFile.pageCount} pages` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1 text-xs text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">100% In-Browser</span>
              </div>
            </div>

            {/* Compression Presets */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Select Compression Preset</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Extreme */}
                <button
                  type="button"
                  onClick={() => setLevel('extreme')}
                  className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    level === 'extreme'
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-slate-900 dark:text-white ring-1 ring-amber-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold">Extreme</span>
                    {level === 'extreme' && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Smallest file size. Best for email limits & strict upload portals.
                  </p>
                  <div className="mt-3 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                    ~65% - 80% Smaller
                  </div>
                </button>

                {/* Recommended */}
                <button
                  type="button"
                  onClick={() => setLevel('recommended')}
                  className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between relative ${
                    level === 'recommended'
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-slate-900 dark:text-white ring-1 ring-amber-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold flex items-center gap-1">
                      Recommended
                      <Sparkles className="w-3 h-3 text-amber-500" />
                    </span>
                    {level === 'recommended' && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Balanced quality and size. Crisp text with high visual clarity.
                  </p>
                  <div className="mt-3 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                    ~45% - 65% Smaller
                  </div>
                </button>

                {/* Light */}
                <button
                  type="button"
                  onClick={() => setLevel('light')}
                  className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    level === 'light'
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-slate-900 dark:text-white ring-1 ring-amber-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold">Light</span>
                    {level === 'light' && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Maximum sharpness for high-res presentations and portfolios.
                  </p>
                  <div className="mt-3 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                    ~25% - 40% Smaller
                  </div>
                </button>
              </div>

              {/* Custom Level Switch */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setLevel((prev) => (prev === 'custom' ? 'recommended' : 'custom'))}
                  className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-600 transition"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{level === 'custom' ? 'Hide Custom Sliders' : 'Fine-Tune Settings (Advanced)'}</span>
                </button>

                {level === 'custom' && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-4">
                    {/* Quality Slider */}
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span>Image Quality</span>
                        <span className="font-mono font-bold text-amber-600">{Math.round(customQuality * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="0.95"
                        step="0.05"
                        value={customQuality}
                        onChange={(e) => setCustomQuality(parseFloat(e.target.value))}
                        className="w-full accent-amber-600"
                      />
                    </div>

                    {/* Resolution Scale */}
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span>Resolution Scale</span>
                        <span className="font-mono font-bold text-amber-600">{customScale.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.6"
                        max="1.6"
                        step="0.1"
                        value={customScale}
                        onChange={(e) => setCustomScale(parseFloat(e.target.value))}
                        className="w-full accent-amber-600"
                      />
                    </div>

                    {/* Grayscale Toggle */}
                    <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer text-slate-700 dark:text-slate-300 pt-1">
                      <input
                        type="checkbox"
                        checked={grayscale}
                        onChange={(e) => setGrayscale(e.target.checked)}
                        className="rounded accent-amber-600"
                      />
                      <span>Convert document to Grayscale (B&W) for extra compression</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <button
              id="compress-pdf-btn"
              type="button"
              disabled={isCompressing}
              onClick={handleCompress}
              className="w-full py-3.5 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {progressInfo
                      ? `Compressing page ${progressInfo.current} of ${progressInfo.total}...`
                      : 'Optimizing PDF Objects...'}
                  </span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span>Compress {currentFile.name}</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Results & Preview */}
          <div className="lg:col-span-5">
            {result ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
                <div className="flex items-center space-x-2 text-emerald-500 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Compression Complete!</span>
                </div>

                {/* Stats comparison box */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Original Size</span>
                    <span className="font-mono line-through text-slate-400">
                      {formatBytes(result.originalSize)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Compressed Size</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {formatBytes(result.compressedSize)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Saved Space
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                      -{savedPercent}% ({formatBytes(Math.max(0, result.originalSize - result.compressedSize))} less)
                    </span>
                  </div>
                </div>

                {/* Page Preview */}
                {result.previewUrl && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-semibold">
                        <Eye className="w-3.5 h-3.5" />
                        Compressed Output Preview
                      </span>
                      <span className="text-[10px] text-slate-400">Page 1</span>
                    </div>
                    <div className="aspect-[1/1.4] bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 shadow-inner">
                      <img
                        src={result.previewUrl}
                        alt="Compressed PDF preview"
                        className="w-full h-full object-contain bg-white shadow-2xs"
                      />
                    </div>
                  </div>
                )}

                {/* Download Button */}
                <a
                  id="download-compressed-pdf-btn"
                  href={result.blobUrl}
                  download={`compressed_${currentFile.name}`}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center space-x-2 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Compressed PDF</span>
                </a>
              </div>
            ) : (
              <div className="bg-slate-50/70 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center flex flex-col items-center justify-center h-80">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                  <Minimize2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Ready to Compress
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Choose a preset on the left and click "Compress" to generate your optimized document.
                </p>
                <div className="mt-4 flex items-center space-x-2 text-[11px] text-slate-400">
                  <span>Fast processing</span>
                  <span>•</span>
                  <span>Zero server uploads</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
