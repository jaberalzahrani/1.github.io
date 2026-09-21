import React, { useState, useEffect } from 'react';
import { 
  FileCode, 
  Download, 
  Copy, 
  Check, 
  Loader2, 
  Sparkles, 
  Settings2, 
  BookOpen, 
  Eye, 
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UploadedFileItem, DocxConversionOptions } from '../../types';
import { convertPdfToDocx, downloadBlob, DocxConversionResult } from '../../services/docxService';
import { getSafeFileBuffer } from '../../services/pdfService';
import { DropZone } from '../DropZone';

interface WordConverterToolProps {
  files: UploadedFileItem[];
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onAddFiles: (files: File[]) => void;
  onLoadSample: (type: 'contract' | 'report' | 'proposal') => void;
}

export const WordConverterTool: React.FC<WordConverterToolProps> = ({
  files,
  selectedFileId,
  onSelectFile,
  onAddFiles,
  onLoadSample,
}) => {
  const currentFile = files.find((f) => f.id === selectedFileId) || files[0];

  const [options, setOptions] = useState<DocxConversionOptions>({
    includeHeadings: true,
    detectParagraphs: true,
    pageBreaks: true,
    fontFamily: 'Calibri',
  });

  const [isConverting, setIsConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<DocxConversionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'formatted' | 'raw'>('formatted');

  // Trigger conversion whenever currentFile or options change
  useEffect(() => {
    let isCancelled = false;

    async function runConversion() {
      if (!currentFile) {
        setConversionResult(null);
        return;
      }

      try {
        setIsConverting(true);
        const buffer = await getSafeFileBuffer(currentFile);

        const result = await convertPdfToDocx(buffer, options);
        if (!isCancelled) {
          setConversionResult(result);
        }
      } catch (err: any) {
        console.error('Word conversion error:', err);
      } finally {
        if (!isCancelled) {
          setIsConverting(false);
        }
      }
    }

    runConversion();

    return () => {
      isCancelled = true;
    };
  }, [currentFile?.id, options]);

  const handleDownloadWord = () => {
    if (!conversionResult || !currentFile) return;

    const baseName = currentFile.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}_converted.docx`;
    downloadBlob(conversionResult.blob, filename);

    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {}
  };

  const handleCopyAllText = () => {
    if (!conversionResult) return;
    const allText = conversionResult.pages.map((p) => p.text).join('\n\n--- PAGE BREAK ---\n\n');
    navigator.clipboard.writeText(allText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentFile) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 text-xs font-semibold mb-3">
            <FileCode className="w-3.5 h-3.5" />
            <span>PDF to Word Converter</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Turn PDF into Editable Microsoft Word (.docx)
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            Extract text, preserve heading hierarchies, detect lists and paragraphs, and export directly to clean Word (.docx) format right in your browser.
          </p>
        </div>

        <DropZone
          onFilesSelected={onAddFiles}
          onLoadSample={onLoadSample}
          label="Drag & Drop a PDF to convert to Word"
          description="Drop any PDF file here to extract and generate an editable .docx document"
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <FileCode className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                Turn PDF to Word (.docx)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Converting: <span className="font-semibold text-slate-700 dark:text-slate-300">{currentFile.name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Download & Copy Buttons */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleCopyAllText}
            disabled={!conversionResult}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition"
            title="Copy extracted text to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copy Text</span>
              </>
            )}
          </button>

          <button
            id="download-docx-btn"
            type="button"
            disabled={isConverting || !conversionResult}
            onClick={handleDownloadWord}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30 disabled:opacity-50 transition"
          >
            {isConverting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Parsing PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Word (.docx)</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-6">
        {/* Left Col: Conversion Options & Document Stats */}
        <div className="space-y-6">
          {/* Document Stats */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              <span>Document Metrics</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <p className="text-[10px] text-slate-500 uppercase font-medium">Pages</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {conversionResult?.pages.length || currentFile.pageCount || 1}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <p className="text-[10px] text-slate-500 uppercase font-medium">Words</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {conversionResult?.totalWordCount || 0}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <p className="text-[10px] text-slate-500 uppercase font-medium">Characters</p>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {conversionResult?.totalCharacters || 0}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <p className="text-[10px] text-slate-500 uppercase font-medium">Read Time</p>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {Math.ceil((conversionResult?.totalWordCount || 0) / 200)} min
                </p>
              </div>
            </div>
          </div>

          {/* Formatting Options */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <Settings2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Word Formatting</span>
            </h3>

            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Detect Headings & Hierarchy
                </span>
                <input
                  type="checkbox"
                  checked={options.includeHeadings}
                  onChange={(e) =>
                    setOptions((prev) => ({ ...prev, includeHeadings: e.target.checked }))
                  }
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Preserve Page Breaks
                </span>
                <input
                  type="checkbox"
                  checked={options.pageBreaks}
                  onChange={(e) =>
                    setOptions((prev) => ({ ...prev, pageBreaks: e.target.checked }))
                  }
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Word Typography
                </label>
                <select
                  value={options.fontFamily}
                  onChange={(e) =>
                    setOptions((prev) => ({ ...prev, fontFamily: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Calibri">Calibri (Standard Office)</option>
                  <option value="Arial">Arial (Clean Modern)</option>
                  <option value="Times New Roman">Times New Roman (Academic)</option>
                  <option value="Georgia">Georgia (Editorial)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick Drop Zone */}
          <DropZone
            onFilesSelected={onAddFiles}
            onLoadSample={onLoadSample}
            isCompact={true}
            label="Convert another PDF"
          />
        </div>

        {/* Right 3 Cols: Document Preview & Output */}
        <div className="lg:col-span-3 space-y-4">
          {/* Tab selector */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setActiveTab('formatted')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'formatted'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center space-x-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Word Document Layout</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'raw'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center space-x-1.5">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Extracted Text</span>
                </span>
              </button>
            </div>

            <span className="text-[11px] text-slate-500 dark:text-slate-400 px-2 font-mono">
              {isConverting ? 'Processing...' : 'Ready for .docx export'}
            </span>
          </div>

          {/* Document Content Viewport */}
          {isConverting ? (
            <div className="h-96 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Extracting text structure and formatting...
              </p>
              <p className="text-xs text-slate-400 mt-1">Analyzing pages and font coordinates</p>
            </div>
          ) : !conversionResult || conversionResult.pages.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <p className="text-sm text-slate-500">No readable text found in this PDF.</p>
            </div>
          ) : activeTab === 'formatted' ? (
            /* Authentic Word Paper Layout */
            <div className="space-y-6">
              {conversionResult.pages.map((page) => (
                <div
                  key={page.pageNumber}
                  className="relative bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-md rounded-xl p-8 sm:p-12 max-w-3xl mx-auto min-h-[500px]"
                  style={{ fontFamily: options.fontFamily }}
                >
                  {/* Page Top Header Bar */}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-3 mb-6">
                    <span className="font-mono">Microsoft Word Preview</span>
                    <span className="font-mono">Page {page.pageNumber} of {conversionResult.pages.length}</span>
                  </div>

                  {/* Paragraphs and Headings */}
                  <div className="space-y-3.5 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
                    {page.paragraphs.map((para, idx) => {
                      if (para.isHeading) {
                        return (
                          <h3
                            key={idx}
                            className={`font-bold text-slate-900 dark:text-white pt-2 ${
                              para.headingLevel === 1
                                ? 'text-xl sm:text-2xl border-b pb-1 border-slate-200 dark:border-slate-800 text-blue-950 dark:text-blue-200'
                                : para.headingLevel === 2
                                ? 'text-lg font-bold'
                                : 'text-base font-semibold'
                            }`}
                          >
                            {para.text}
                          </h3>
                        );
                      } else if (para.isBullet) {
                        return (
                          <div key={idx} className="flex items-start space-x-2 pl-3">
                            <span className="text-blue-500 font-bold">•</span>
                            <p className="flex-1">{para.text.replace(/^[•\-*]\s*/, '')}</p>
                          </div>
                        );
                      } else {
                        return <p key={idx}>{para.text}</p>;
                      }
                    })}
                  </div>

                  {/* Footer Page Number */}
                  <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-slate-400 font-mono">
                    — {page.pageNumber} —
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Raw Extracted Text View */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
              <textarea
                readOnly
                value={conversionResult.pages
                  .map((p) => `--- PAGE ${p.pageNumber} ---\n\n${p.text}`)
                  .join('\n\n')}
                className="w-full h-[520px] p-4 text-xs font-mono bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 resize-none focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
