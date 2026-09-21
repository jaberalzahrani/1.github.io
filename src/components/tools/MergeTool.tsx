import React, { useState } from 'react';
import { 
  Layers, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Download, 
  Check, 
  Loader2, 
  FileText,
  Sparkles,
  RefreshCw,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UploadedFileItem } from '../../types';
import { mergePdfs, getSafeFileBuffer } from '../../services/pdfService';
import { DropZone } from '../DropZone';

interface MergeToolProps {
  files: UploadedFileItem[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onLoadSample: (type: 'contract' | 'report' | 'proposal') => void;
}

interface MergeItemConfig {
  fileId: string;
  pageRange: string; // e.g. "" for all, or "1, 3-5"
}

export const MergeTool: React.FC<MergeToolProps> = ({
  files,
  onAddFiles,
  onRemoveFile,
  onLoadSample,
}) => {
  const [itemsOrder, setItemsOrder] = useState<string[]>([]);
  const [pageRanges, setPageRanges] = useState<Record<string, string>>({});
  const [outputName, setOutputName] = useState('merged_document.pdf');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergedBlobUrl, setMergedBlobUrl] = useState<string | null>(null);
  const [mergedPageCount, setMergedPageCount] = useState<number | null>(null);

  // Synchronize items order when files change
  React.useEffect(() => {
    const currentFileIds = files.map((f) => f.id);
    setItemsOrder((prev) => {
      const validPrev = prev.filter((id) => currentFileIds.includes(id));
      const newIds = currentFileIds.filter((id) => !prev.includes(id));
      return [...validPrev, ...newIds];
    });
  }, [files]);

  const orderedFiles = itemsOrder
    .map((id) => files.find((f) => f.id === id))
    .filter((f): f is UploadedFileItem => f !== undefined);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...itemsOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    setItemsOrder(newOrder);
  };

  const handleMerge = async () => {
    if (orderedFiles.length < 2) {
      alert('Please add at least 2 PDF files to merge.');
      return;
    }

    try {
      setIsProcessing(true);
      const mergePayload: Array<{ buffer: ArrayBuffer; name: string; pageRange?: string }> = [];

      for (const item of orderedFiles) {
        const buffer = await getSafeFileBuffer(item);
        mergePayload.push({
          buffer,
          name: item.name,
          pageRange: pageRanges[item.id] || undefined,
        });
      }

      const mergedBytes = await mergePdfs(mergePayload);
      const blob = new Blob([mergedBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setMergedBlobUrl(url);

      // Trigger confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      // Calculate total combined pages
      const totalEstimated = orderedFiles.reduce((acc, f) => acc + (f.pageCount || 1), 0);
      setMergedPageCount(totalEstimated);
    } catch (err: any) {
      console.error('Merge error:', err);
      alert(`Error merging PDFs: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!mergedBlobUrl) return;
    const a = document.createElement('a');
    a.href = mergedBlobUrl;
    a.download = outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (files.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 text-xs font-semibold mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>PDF Combiner</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Merge Multiple PDFs into One Document
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            Combine any number of PDF files in your preferred sequence. Specify custom page ranges, reorder files effortlessly, and merge instantly right in your browser.
          </p>
        </div>

        <DropZone
          onFilesSelected={onAddFiles}
          onLoadSample={onLoadSample}
          label="Drag & Drop multiple PDFs to merge"
          description="Drop 2 or more PDF documents here to combine them into one file"
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Layers className="w-6 h-6 text-red-600" />
            <span>Merge PDF Files</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Drag to reorder files, set custom page ranges if needed, then merge.
          </p>
        </div>

        {/* Quick Add button */}
        <div className="flex items-center space-x-2">
          <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition">
            <Plus className="w-4 h-4 text-red-600" />
            <span>Add More PDFs</span>
            <input
              type="file"
              multiple
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) onAddFiles(Array.from(e.target.files));
              }}
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        {/* Left 2 Cols: File List and Ordering */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
            <span>Merge Sequence ({orderedFiles.length} files)</span>
            <span>Order</span>
          </div>

          <div className="space-y-2.5">
            {orderedFiles.map((file, index) => (
              <div
                key={file.id}
                id={`merge-item-${file.id}`}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition"
              >
                {/* File Thumbnail & Name */}
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex-shrink-0">
                    {index + 1}
                  </div>

                  <div className="w-9 h-11 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {file.thumbnailUrl ? (
                      <img src={file.thumbnailUrl} alt="Thumb" className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-5 h-5 text-red-500" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {file.pageCount ? `${file.pageCount} pages` : 'PDF'} •{' '}
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                {/* Page Range & Controls */}
                <div className="flex items-center space-x-2 self-end sm:self-center">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      Pages:
                    </span>
                    <input
                      type="text"
                      placeholder="All (e.g. 1-3)"
                      value={pageRanges[file.id] || ''}
                      onChange={(e) =>
                        setPageRanges((prev) => ({ ...prev, [file.id]: e.target.value }))
                      }
                      className="w-24 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  {/* Move Up / Down Buttons */}
                  <div className="flex items-center space-x-1 border-l border-slate-200 dark:border-slate-800 pl-2">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveItem(index, 'up')}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-slate-600 dark:text-slate-400"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === orderedFiles.length - 1}
                      onClick={() => moveItem(index, 'down')}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-slate-600 dark:text-slate-400"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveFile(file.id)}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 transition"
                      title="Remove from merge"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <DropZone
              onFilesSelected={onAddFiles}
              onLoadSample={onLoadSample}
              isCompact={true}
            />
          </div>
        </div>

        {/* Right Col: Configuration & Action Card */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Output Options
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Output File Name
              </label>
              <input
                type="text"
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
              <div className="flex justify-between">
                <span>Total Files:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">{orderedFiles.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Pages:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {orderedFiles.reduce((sum, f) => sum + (f.pageCount || 1), 0)} pages
                </span>
              </div>
            </div>

            <button
              id="execute-merge-btn"
              type="button"
              disabled={isProcessing || orderedFiles.length < 2}
              onClick={handleMerge}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Merging Documents...</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>Merge {orderedFiles.length} PDFs</span>
                </>
              )}
            </button>

            {/* Download Card if merged */}
            {mergedBlobUrl && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300">
                  <Check className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-bold">Merge Complete!</span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Your unified document is ready with {mergedPageCount} total pages.
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    id="download-merged-pdf-btn"
                    onClick={handleDownload}
                    className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center justify-center space-x-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Merged PDF</span>
                  </button>

                  <a
                    href={mergedBlobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 text-center transition"
                  >
                    Preview in Tab
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
