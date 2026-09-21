import React, { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Download, 
  Loader2, 
  Plus, 
  Trash2, 
  FileText, 
  RefreshCw, 
  Sliders, 
  ArrowRight,
  Layers,
  Sparkles,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UploadedFileItem, ImageFormat, ConvertedImageItem } from '../../types';
import { 
  getSafeFileBuffer, 
  loadPdfDocument, 
  renderPdfPageToDataUrl,
  convertImageFile,
  imagesToPdf
} from '../../services/pdfService';
import { DropZone } from '../DropZone';

interface ImageConvertToolProps {
  files: UploadedFileItem[];
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onAddFiles: (files: File[]) => void;
  onLoadSample: (type: 'contract' | 'report' | 'proposal') => void;
}

export const ImageConvertTool: React.FC<ImageConvertToolProps> = ({
  files,
  selectedFileId,
  onSelectFile,
  onAddFiles,
  onLoadSample,
}) => {
  const currentFile = files.find((f) => f.id === selectedFileId) || files[0];

  const [activeTab, setActiveTab] = useState<'pdf-to-img' | 'type-change' | 'img-to-pdf'>('pdf-to-img');

  // --- PDF to Images State ---
  const [outputFormat, setOutputFormat] = useState<ImageFormat>('png');
  const [outputScale, setOutputScale] = useState<number>(1.5);
  const [outputQuality, setOutputQuality] = useState<number>(0.92);
  const [pageImages, setPageImages] = useState<Array<{ pageNumber: number; dataUrl: string }>>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  // --- Image Type Changer State ---
  const [converterTargetFormat, setConverterTargetFormat] = useState<ImageFormat>('webp');
  const [converterQuality, setConverterQuality] = useState<number>(0.85);
  const [converterScale, setConverterScale] = useState<number>(1.0);
  const [convertedImages, setConvertedImages] = useState<ConvertedImageItem[]>([]);
  const [isConvertingTypes, setIsConvertingTypes] = useState<boolean>(false);

  // --- Images to PDF State ---
  const [inputImages, setInputImages] = useState<Array<{ id: string; name: string; dataUrl: string }>>([]);
  const [isCreatingPdf, setIsCreatingPdf] = useState(false);
  const [compiledPdfUrl, setCompiledPdfUrl] = useState<string | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Extract PDF pages as images whenever currentFile, format, scale, or quality changes
  useEffect(() => {
    if (!currentFile || activeTab !== 'pdf-to-img') return;

    let isCancelled = false;
    async function extractAll() {
      try {
        setIsExtracting(true);
        const buffer = await getSafeFileBuffer(currentFile);
        const pdf = await loadPdfDocument(buffer);
        const count = pdf.numPages;
        const imagesList: Array<{ pageNumber: number; dataUrl: string }> = [];

        const mime = outputFormat === 'png' ? 'image/png' : outputFormat === 'webp' ? 'image/webp' : 'image/jpeg';

        for (let i = 1; i <= count; i++) {
          const page = await pdf.getPage(i);
          const url = await renderPdfPageToDataUrl(page, outputScale, mime, outputQuality);
          imagesList.push({ pageNumber: i, dataUrl: url });
        }

        if (!isCancelled) setPageImages(imagesList);
      } catch (err) {
        console.error('PDF page extraction error:', err);
      } finally {
        if (!isCancelled) setIsExtracting(false);
      }
    }

    extractAll();
    return () => {
      isCancelled = true;
    };
  }, [currentFile?.id, activeTab, outputFormat, outputScale, outputQuality]);

  const handleDownloadSinglePdfImage = (dataUrl: string, pageNum: number) => {
    const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${currentFile?.name.replace(/\.[^/.]+$/, '')}_page_${pageNum}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAllPdfImages = () => {
    pageImages.forEach((img, idx) => {
      setTimeout(() => {
        handleDownloadSinglePdfImage(img.dataUrl, img.pageNumber);
      }, idx * 250);
    });
  };

  // --- Image Type Changer Handlers ---
  const handleTypeChangeUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsConvertingTypes(true);

    try {
      const filesArray = Array.from(fileList);
      const newConverted: ConvertedImageItem[] = [];

      for (const file of filesArray) {
        const item = await convertImageFile(
          file,
          converterTargetFormat,
          converterQuality,
          converterScale
        );
        newConverted.push(item);
      }

      setConvertedImages((prev) => [...prev, ...newConverted]);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (err: any) {
      alert(`Error converting images: ${err.message || err}`);
    } finally {
      setIsConvertingTypes(false);
    }
  };

  const handleDownloadConvertedImage = (item: ConvertedImageItem) => {
    const a = document.createElement('a');
    a.href = item.dataUrl;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAllConvertedImages = () => {
    convertedImages.forEach((img, idx) => {
      setTimeout(() => {
        handleDownloadConvertedImage(img);
      }, idx * 200);
    });
  };

  // --- Images to PDF Handlers ---
  const handleImageUploadForPdf = (filesList: FileList | null) => {
    if (!filesList) return;
    Array.from(filesList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setInputImages((prev) => [
            ...prev,
            {
              id: `${Date.now()}_${Math.random()}`,
              name: file.name,
              dataUrl: e.target!.result as string,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreatePdfFromImages = async () => {
    if (inputImages.length === 0) return;

    try {
      setIsCreatingPdf(true);
      const pdfBytes = await imagesToPdf(inputImages);
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setCompiledPdfUrl(url);

      try {
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (e: any) {
      alert(`Error creating PDF: ${e.message}`);
    } finally {
      setIsCreatingPdf(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <span className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
            <ImageIcon className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Images & PDF Studio
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Convert PDF to PNG/JPG/WebP, change image types (PNG ⇄ JPG ⇄ WebP), or build PDFs from photos.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('pdf-to-img')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'pdf-to-img'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            PDF to Images
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('type-change')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
              activeTab === 'type-change'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3 h-3" />
            <span>Change Image Types</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('img-to-pdf')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'img-to-pdf'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Images to PDF
          </button>
        </div>
      </div>

      {/* --- TAB 1: PDF to Images --- */}
      {activeTab === 'pdf-to-img' && (
        <div className="mt-6 space-y-6">
          {!currentFile ? (
            <DropZone
              onFilesSelected={onAddFiles}
              onLoadSample={onLoadSample}
              label="Drag & Drop PDF to extract pages as Images"
            />
          ) : (
            <>
              {/* Controls Bar */}
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Format Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Target Format
                    </label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setOutputFormat('png')}
                        className={`px-3 py-1 rounded-md transition ${
                          outputFormat === 'png'
                            ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        PNG (Lossless)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOutputFormat('jpeg')}
                        className={`px-3 py-1 rounded-md transition ${
                          outputFormat === 'jpeg'
                            ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        JPG / JPEG
                      </button>
                      <button
                        type="button"
                        onClick={() => setOutputFormat('webp')}
                        className={`px-3 py-1 rounded-md transition ${
                          outputFormat === 'webp'
                            ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        WebP (Modern)
                      </button>
                    </div>
                  </div>

                  {/* Resolution Scale */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Resolution
                    </label>
                    <select
                      value={outputScale}
                      onChange={(e) => setOutputScale(parseFloat(e.target.value))}
                      className="text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200"
                    >
                      <option value={1.0}>1.0x (Standard - 72 DPI)</option>
                      <option value={1.5}>1.5x (High Res - 110 DPI)</option>
                      <option value={2.0}>2.0x (Ultra HD - 150 DPI)</option>
                    </select>
                  </div>

                  {/* Quality (for JPG and WebP) */}
                  {outputFormat !== 'png' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Quality ({Math.round(outputQuality * 100)}%)
                      </label>
                      <input
                        type="range"
                        min="0.4"
                        max="1.0"
                        step="0.05"
                        value={outputQuality}
                        onChange={(e) => setOutputQuality(parseFloat(e.target.value))}
                        className="w-24 accent-teal-600 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Batch Download button */}
                {pageImages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadAllPdfImages}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download All ({outputFormat.toUpperCase()})</span>
                  </button>
                )}
              </div>

              {/* Extraction Status & Grid */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <p>
                  Pages in <span className="text-slate-800 dark:text-slate-200">{currentFile.name}</span>: {pageImages.length}
                </p>
                <span className="text-slate-400">
                  Target: <strong className="text-teal-600 uppercase">{outputFormat}</strong> • {outputScale}x resolution
                </span>
              </div>

              {isExtracting ? (
                <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-2" />
                  <p className="text-xs text-slate-500">Rendering {outputFormat.toUpperCase()} images from PDF pages...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {pageImages.map((item) => (
                    <div
                      key={item.pageNumber}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-center text-xs mb-3">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Page {item.pageNumber}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 font-mono font-bold uppercase">
                          {outputFormat}
                        </span>
                      </div>

                      <div className="aspect-[1/1.4] bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 mb-4 flex items-center justify-center p-2">
                        <img
                          src={item.dataUrl}
                          alt={`Page ${item.pageNumber}`}
                          className="w-full h-full object-contain bg-white shadow-2xs"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadSinglePdfImage(item.dataUrl, item.pageNumber)}
                        className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download {outputFormat.toUpperCase()}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* --- TAB 2: Image Type Changes (PNG ⇄ JPG ⇄ WebP) --- */}
      {activeTab === 'type-change' && (
        <div className="mt-6 space-y-6">
          {/* Conversion Configuration Bar */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-teal-600" />
                  <span>Convert Image Types</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Switch between PNG, JPG, and WebP instantly with zero loss of quality or customized compression.
                </p>
              </div>

              {/* Upload Button */}
              <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition">
                <Plus className="w-4 h-4" />
                <span>Select Images to Convert</span>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => handleTypeChangeUpload(e.target.files)}
                />
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-6">
              {/* Target Format */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Convert To Format
                </label>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setConverterTargetFormat('png')}
                    className={`px-3 py-1 rounded-md transition ${
                      converterTargetFormat === 'png'
                        ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => setConverterTargetFormat('jpeg')}
                    className={`px-3 py-1 rounded-md transition ${
                      converterTargetFormat === 'jpeg'
                        ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    JPG / JPEG
                  </button>
                  <button
                    type="button"
                    onClick={() => setConverterTargetFormat('webp')}
                    className={`px-3 py-1 rounded-md transition ${
                      converterTargetFormat === 'webp'
                        ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    WebP (Recommended)
                  </button>
                </div>
              </div>

              {/* Resize Scaling */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Resize Scale
                </label>
                <select
                  value={converterScale}
                  onChange={(e) => setConverterScale(parseFloat(e.target.value))}
                  className="text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200"
                >
                  <option value={1.0}>100% (Original Dimensions)</option>
                  <option value={0.75}>75% Scale</option>
                  <option value={0.5}>50% Scale (Half Size)</option>
                  <option value={0.25}>25% Scale (Thumbnail)</option>
                </select>
              </div>

              {/* Quality Slider (for JPG and WebP) */}
              {converterTargetFormat !== 'png' && (
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                    <span>Quality</span>
                    <span className="text-teal-600 font-mono font-bold">{Math.round(converterQuality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="1.0"
                    step="0.05"
                    value={converterQuality}
                    onChange={(e) => setConverterQuality(parseFloat(e.target.value))}
                    className="w-32 accent-teal-600 cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Converted Images List */}
          {convertedImages.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center">
              <RefreshCw className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No images converted yet
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Click "Select Images to Convert" above to batch convert PNG to JPG, JPG to PNG, or modern WebP.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Converted Files ({convertedImages.length})
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setConvertedImages([])}
                    className="text-xs font-semibold text-slate-500 hover:text-red-500 transition px-2.5 py-1 rounded-lg"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadAllConvertedImages}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download All</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {convertedImages.map((img) => {
                  const sizeDiff = img.originalSize - img.targetSize;
                  const percentSaved = Math.round((sizeDiff / img.originalSize) * 100);

                  return (
                    <div
                      key={img.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {img.originalFormat} ➔ <strong className="text-teal-600">{img.targetFormat.toUpperCase()}</strong>
                        </span>
                        {percentSaved > 0 && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                            -{percentSaved}%
                          </span>
                        )}
                      </div>

                      <div className="aspect-square bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 mb-3 flex items-center justify-center p-1.5">
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="space-y-1 mb-3">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={img.name}>
                          {img.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {img.width}×{img.height}px • {formatBytes(img.targetSize)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadConvertedImage(img)}
                        className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download {img.targetFormat.toUpperCase()}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: Images to PDF --- */}
      {activeTab === 'img-to-pdf' && (
        <div className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Compile Photos / Images into a Unified PDF
              </h3>
              <p className="text-xs text-slate-500">
                Select or drop image files (PNG, JPG, WebP, GIF, SVG) to merge into a single PDF.
              </p>
            </div>

            <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition">
              <Plus className="w-4 h-4" />
              <span>Select Photos</span>
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp,image/svg+xml"
                className="hidden"
                onChange={(e) => handleImageUploadForPdf(e.target.files)}
              />
            </label>
          </div>

          {inputImages.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center">
              <ImageIcon className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No images added yet
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Click "Select Photos" or drag PNG, JPG, or WebP images here to convert them into a PDF document.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {inputImages.map((img, idx) => (
                  <div
                    key={img.id}
                    className="relative group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-2xs"
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2">
                      <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[10px] font-semibold truncate text-slate-700 dark:text-slate-300">
                      {idx + 1}. {img.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => setInputImages((prev) => prev.filter((item) => item.id !== img.id))}
                      className="absolute top-3 right-3 p-1 rounded-md bg-red-600 text-white opacity-0 group-hover:opacity-100 transition shadow cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isCreatingPdf}
                  onClick={handleCreatePdfFromImages}
                  className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/30 flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  {isCreatingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Convert {inputImages.length} Images to PDF</span>
                    </>
                  )}
                </button>

                {compiledPdfUrl && (
                  <a
                    href={compiledPdfUrl}
                    download="converted_images.pdf"
                    className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center justify-center space-x-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Compiled PDF</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
