import React, { useState, useEffect, useRef } from 'react';
import { 
  FileEdit, 
  RotateCw, 
  RotateCcw, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Copy, 
  Download, 
  PenTool, 
  Type, 
  Stamp, 
  Save, 
  Loader2, 
  Eye, 
  X, 
  Check, 
  Undo,
  Palette,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UploadedFileItem, PageInfo, AnnotationItem } from '../../types';
import { 
  getPdfPagesInfo, 
  organizePdf, 
  applyAnnotationsToPdf, 
  renderPageToDataUrl,
  getSafeFileBuffer
} from '../../services/pdfService';
import { DropZone } from '../DropZone';

interface EditToolProps {
  files: UploadedFileItem[];
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onAddFiles: (files: File[]) => void;
  onLoadSample: (type: 'contract' | 'report' | 'proposal') => void;
}

export const EditTool: React.FC<EditToolProps> = ({
  files,
  selectedFileId,
  onSelectFile,
  onAddFiles,
  onLoadSample,
}) => {
  const currentFile = files.find((f) => f.id === selectedFileId) || files[0];

  const [pages, setPages] = useState<PageInfo[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Active page for visual annotation
  const [annotatingPageIndex, setAnnotatingPageIndex] = useState<number | null>(null);
  const [pageHighResUrl, setPageHighResUrl] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);

  // Annotation tool states
  const [activeTool, setActiveTool] = useState<'text' | 'stamp' | 'signature' | 'draw'>('text');
  const [textColor, setTextColor] = useState('#DC2626');
  const [textSize, setTextSize] = useState(18);
  const [newTextValue, setNewTextValue] = useState('Reviewed & Approved');
  const [selectedStamp, setSelectedStamp] = useState('APPROVED');

  // Drawing canvas states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Load pages information when current file changes
  useEffect(() => {
    let isCancelled = false;

    async function loadPages() {
      if (!currentFile) {
        setPages([]);
        return;
      }

      try {
        setIsLoadingPages(true);
        const buffer = await getSafeFileBuffer(currentFile);

        const pageInfos = await getPdfPagesInfo(buffer);
        if (!isCancelled) {
          setPages(pageInfos);
        }
      } catch (e) {
        console.error('Error loading PDF pages:', e);
      } finally {
        if (!isCancelled) {
          setIsLoadingPages(false);
        }
      }
    }

    loadPages();

    return () => {
      isCancelled = true;
    };
  }, [currentFile?.id]);

  // Load high-res view when entering annotation mode
  useEffect(() => {
    if (annotatingPageIndex === null || !currentFile) return;

    let isCancelled = false;
    async function loadHighRes() {
      try {
        const buffer = await getSafeFileBuffer(currentFile);
        const url = await renderPageToDataUrl(buffer, (annotatingPageIndex ?? 0) + 1, 1.6);
        if (!isCancelled) setPageHighResUrl(url);
      } catch (err) {
        console.error('Error loading high res page:', err);
      }
    }

    loadHighRes();
    return () => {
      isCancelled = true;
    };
  }, [annotatingPageIndex, currentFile]);

  // Rotate a page
  const rotatePage = (index: number, direction: 'cw' | 'ccw') => {
    setPages((prev) => {
      const copy = [...prev];
      const delta = direction === 'cw' ? 90 : -90;
      copy[index] = {
        ...copy[index],
        rotation: (copy[index].rotation + delta + 360) % 360,
      };
      return copy;
    });
  };

  // Toggle page deletion status
  const toggleDeletePage = (index: number) => {
    setPages((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        isDeleted: !copy[index].isDeleted,
      };
      return copy;
    });
  };

  // Move page position left or right
  const movePage = (fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= pages.length) return;

    setPages((prev) => {
      const copy = [...prev];
      const temp = copy[fromIndex];
      copy[fromIndex] = copy[toIndex];
      copy[toIndex] = temp;
      return copy;
    });
  };

  // Add text box annotation to canvas
  const handleAddTextAnnotation = () => {
    if (annotatingPageIndex === null) return;
    const newAnn: AnnotationItem = {
      id: `text_${Date.now()}`,
      type: 'text',
      pageIndex: annotatingPageIndex,
      x: 30, // 30% from left
      y: 30, // 30% from top
      text: newTextValue,
      fontSize: textSize,
      color: textColor,
    };
    setAnnotations((prev) => [...prev, newAnn]);
  };

  // Add stamp annotation to canvas
  const handleAddStampAnnotation = (stampName: string) => {
    if (annotatingPageIndex === null) return;
    const stampColors: Record<string, string> = {
      APPROVED: '#059669',
      CONFIDENTIAL: '#DC2626',
      DRAFT: '#D97706',
      PAID: '#2563EB',
      FINAL: '#7C3AED',
      REJECTED: '#EF4444',
    };

    const newAnn: AnnotationItem = {
      id: `stamp_${Date.now()}`,
      type: 'stamp',
      pageIndex: annotatingPageIndex,
      x: 35,
      y: 25,
      text: stampName,
      color: stampColors[stampName] || '#DC2626',
    };
    setAnnotations((prev) => [...prev, newAnn]);
  };

  // Signature drawing pad logic
  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const handleStopDraw = () => {
    setIsDrawing(false);
  };

  const handleClearSignaturePad = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleApplyDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || annotatingPageIndex === null) return;
    const dataUrl = canvas.toDataURL('image/png');

    const newAnn: AnnotationItem = {
      id: `sig_${Date.now()}`,
      type: 'signature',
      pageIndex: annotatingPageIndex,
      x: 35,
      y: 60,
      width: 140,
      height: 60,
      imageDataUrl: dataUrl,
    };
    setAnnotations((prev) => [...prev, newAnn]);
    handleClearSignaturePad();
  };

  // Remove an annotation
  const handleRemoveAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  };

  // Save and export final modified PDF
  const handleSaveEditedPdf = async () => {
    if (!currentFile) return;

    try {
      setIsExporting(true);
      const buffer = await getSafeFileBuffer(currentFile);

      // 1. Organize: reorder, apply rotations, filter deleted
      const activePages = pages
        .map((p, idx) => ({ ...p, originalIndex: idx }))
        .filter((p) => !p.isDeleted);

      if (activePages.length === 0) {
        alert('You must keep at least one page in the document.');
        return;
      }

      const reorderedBytes = await organizePdf(
        buffer,
        activePages.map((p) => ({
          originalIndex: p.originalIndex,
          rotation: p.rotation,
        }))
      );

      // 2. Apply annotations if any
      let finalBytes = reorderedBytes;
      if (annotations.length > 0) {
        finalBytes = await applyAnnotationsToPdf(reorderedBytes.buffer as ArrayBuffer, annotations);
      }

      // Download
      const blob = new Blob([finalBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited_${currentFile.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (err: any) {
      console.error('Save error:', err);
      alert(`Could not save PDF: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!currentFile) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 text-xs font-semibold mb-3">
            <FileEdit className="w-3.5 h-3.5" />
            <span>Visual PDF Editor</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Edit, Reorder, Rotate & Annotate PDF Pages
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            Organize pages, rotate orientation, remove unwanted sections, and add custom text, stamps, and signatures directly in your browser.
          </p>
        </div>

        <DropZone
          onFilesSelected={onAddFiles}
          onLoadSample={onLoadSample}
          label="Drag & Drop a PDF to Edit"
          description="Drop any PDF file here to rotate, rearrange pages, and add annotations"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400">
              <FileEdit className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                PDF Page Editor & Organizer
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Active Document:{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {currentFile.name}
                </span>{' '}
                ({pages.filter((p) => !p.isDeleted).length} of {pages.length} pages kept)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            id="save-edited-pdf-btn"
            type="button"
            disabled={isExporting || pages.length === 0}
            onClick={handleSaveEditedPdf}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/30 disabled:opacity-50 transition"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Compiling Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save & Export PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pages Grid Layout */}
      {isLoadingPages ? (
        <div className="h-96 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Rendering PDF page thumbnails...
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              All Pages ({pages.length}) — Click "Annotate / Stamp" to draw or add text
            </h3>
            <span className="text-xs text-slate-400">Rotate, reorder or delete pages</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {pages.map((page, index) => {
              const isDeleted = page.isDeleted;
              const pageAnnotationsCount = annotations.filter((a) => a.pageIndex === index).length;

              return (
                <div
                  key={index}
                  id={`page-card-${index + 1}`}
                  className={`relative flex flex-col bg-white dark:bg-slate-900 border rounded-2xl p-4 transition-all ${
                    isDeleted
                      ? 'border-red-300 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 opacity-60'
                      : 'border-slate-200 dark:border-slate-800 hover:border-red-300 hover:shadow-md'
                  }`}
                >
                  {/* Page Card Header */}
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                      Page {index + 1}
                    </span>
                    {pageAnnotationsCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 font-semibold">
                        {pageAnnotationsCount} edits
                      </span>
                    )}
                  </div>

                  {/* Thumbnail Container */}
                  <div
                    className="relative w-full aspect-[1/1.414] bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center group cursor-pointer"
                    onClick={() => setAnnotatingPageIndex(index)}
                  >
                    {page.thumbnailUrl ? (
                      <img
                        src={page.thumbnailUrl}
                        alt={`Page ${index + 1}`}
                        className="w-full h-full object-contain transition-transform duration-300"
                        style={{
                          transform: `rotate(${page.rotation}deg)`,
                        }}
                      />
                    ) : (
                      <span className="text-xs text-slate-400">Rendering...</span>
                    )}

                    {/* Deleted overlay */}
                    {isDeleted && (
                      <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center">
                        <span className="text-white text-xs font-bold px-2 py-1 bg-red-600 rounded">
                          Marked for Removal
                        </span>
                      </div>
                    )}

                    {/* Hover Overlay to Edit */}
                    {!isDeleted && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-bold flex items-center space-x-1 shadow">
                          <PenTool className="w-3.5 h-3.5 text-red-600" />
                          <span>Annotate / Stamp</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Page Controls Toolbar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => rotatePage(index, 'ccw')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition"
                        title="Rotate 90° counter-clockwise"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => rotatePage(index, 'cw')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition"
                        title="Rotate 90° clockwise"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => movePage(index, 'left')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 text-slate-500"
                        title="Move left"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === pages.length - 1}
                        onClick={() => movePage(index, 'right')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-20 text-slate-500"
                        title="Move right"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleDeletePage(index)}
                      className={`p-1.5 rounded-lg transition ${
                        isDeleted
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600'
                      }`}
                      title={isDeleted ? 'Restore page' : 'Delete page'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Annotation Canvas Modal */}
      {annotatingPageIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PenTool className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Annotate Page {annotatingPageIndex + 1}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAnnotatingPageIndex(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 p-6 overflow-y-auto">
              {/* Left Col: Tools Toolbar */}
              <div className="space-y-6">
                {/* Tool Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                    Select Tool
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTool('text')}
                      className={`p-2 rounded-xl text-xs font-semibold flex flex-col items-center space-y-1 transition ${
                        activeTool === 'text'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Type className="w-4 h-4" />
                      <span>Text</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTool('stamp')}
                      className={`p-2 rounded-xl text-xs font-semibold flex flex-col items-center space-y-1 transition ${
                        activeTool === 'stamp'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Stamp className="w-4 h-4" />
                      <span>Stamp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTool('signature')}
                      className={`p-2 rounded-xl text-xs font-semibold flex flex-col items-center space-y-1 transition ${
                        activeTool === 'signature'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <PenTool className="w-4 h-4" />
                      <span>Sign</span>
                    </button>
                  </div>
                </div>

                {/* Sub-tool panels */}
                {activeTool === 'text' && (
                  <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Text to insert
                    </label>
                    <input
                      type="text"
                      value={newTextValue}
                      onChange={(e) => setNewTextValue(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />

                    <div className="flex items-center space-x-2">
                      <label className="text-xs text-slate-500">Color:</label>
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-7 h-7 rounded border cursor-pointer"
                      />
                      <label className="text-xs text-slate-500 pl-2">Size:</label>
                      <input
                        type="number"
                        min="10"
                        max="48"
                        value={textSize}
                        onChange={(e) => setTextSize(Number(e.target.value))}
                        className="w-16 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddTextAnnotation}
                      className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition"
                    >
                      Insert Text Onto Page
                    </button>
                  </div>
                )}

                {activeTool === 'stamp' && (
                  <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Choose Stamp
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['APPROVED', 'CONFIDENTIAL', 'DRAFT', 'PAID', 'FINAL', 'REJECTED'].map(
                        (stamp) => (
                          <button
                            key={stamp}
                            type="button"
                            onClick={() => handleAddStampAnnotation(stamp)}
                            className="p-2 text-xs font-extrabold border-2 rounded-lg border-slate-300 dark:border-slate-700 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                          >
                            {stamp}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                {activeTool === 'signature' && (
                  <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Draw Signature
                      </label>
                      <button
                        type="button"
                        onClick={handleClearSignaturePad}
                        className="text-[10px] text-slate-500 hover:text-red-600"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="border border-slate-300 dark:border-slate-600 rounded-lg bg-white overflow-hidden shadow-inner">
                      <canvas
                        ref={canvasRef}
                        width={280}
                        height={120}
                        onMouseDown={handleStartDraw}
                        onMouseMove={handleDraw}
                        onMouseUp={handleStopDraw}
                        onMouseLeave={handleStopDraw}
                        className="cursor-crosshair w-full block"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyDrawnSignature}
                      className="w-full py-2 rounded-lg bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold transition"
                    >
                      Place Signature Onto Page
                    </button>
                  </div>
                )}

                {/* List of active annotations on this page */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Page Edits ({annotations.filter((a) => a.pageIndex === annotatingPageIndex).length})
                  </span>
                  {annotations
                    .filter((a) => a.pageIndex === annotatingPageIndex)
                    .map((ann) => (
                      <div
                        key={ann.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs"
                      >
                        <span className="truncate max-w-[160px] font-medium text-slate-700 dark:text-slate-300">
                          {ann.type.toUpperCase()}: {ann.text || 'Signature'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAnnotation(ann.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Right 2 Cols: Page Preview & Canvas */}
              <div className="md:col-span-2 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="relative max-w-md w-full shadow-lg rounded overflow-hidden bg-white">
                  {pageHighResUrl ? (
                    <img
                      src={pageHighResUrl}
                      alt="Annotation Target Page"
                      className="w-full block pointer-events-none select-none"
                    />
                  ) : (
                    <div className="h-96 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-red-600" />
                    </div>
                  )}

                  {/* Render Annotations Overlay */}
                  {annotations
                    .filter((a) => a.pageIndex === annotatingPageIndex)
                    .map((ann) => {
                      if (ann.type === 'text') {
                        return (
                          <div
                            key={ann.id}
                            className="absolute font-bold cursor-move select-none p-1 border border-dashed border-red-400 bg-white/70 rounded shadow-xs"
                            style={{
                              left: `${ann.x}%`,
                              top: `${ann.y}%`,
                              color: ann.color,
                              fontSize: `${Math.max(12, (ann.fontSize || 16) * 0.8)}px`,
                            }}
                          >
                            {ann.text}
                          </div>
                        );
                      } else if (ann.type === 'stamp') {
                        return (
                          <div
                            key={ann.id}
                            className="absolute font-extrabold uppercase px-2 py-1 border-2 rounded shadow-xs select-none"
                            style={{
                              left: `${ann.x}%`,
                              top: `${ann.y}%`,
                              borderColor: ann.color,
                              color: ann.color,
                              backgroundColor: `${ann.color}15`,
                              transform: 'rotate(-5deg)',
                              fontSize: '14px',
                            }}
                          >
                            {ann.text}
                          </div>
                        );
                      } else if (ann.type === 'signature' && ann.imageDataUrl) {
                        return (
                          <img
                            key={ann.id}
                            src={ann.imageDataUrl}
                            alt="Signature"
                            className="absolute w-28 h-12 object-contain select-none border border-dashed border-slate-400 rounded bg-white/40"
                            style={{
                              left: `${ann.x}%`,
                              top: `${ann.y}%`,
                            }}
                          />
                        );
                      }
                      return null;
                    })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setAnnotatingPageIndex(null)}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow transition"
              >
                Done Editing Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
