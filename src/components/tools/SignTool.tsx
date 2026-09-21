import React, { useState, useRef, useEffect } from 'react';
import { 
  PenTool, 
  Download, 
  Eraser, 
  Type, 
  Calendar, 
  CheckCircle2, 
  Loader2, 
  FileText,
  Save,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UploadedFileItem } from '../../types';
import { renderPageToDataUrl, applyAnnotationsToPdf, getSafeFileBuffer } from '../../services/pdfService';
import { DropZone } from '../DropZone';

interface SignToolProps {
  files: UploadedFileItem[];
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onAddFiles: (files: File[]) => void;
  onLoadSample: (type: 'contract' | 'report' | 'proposal') => void;
}

export const SignTool: React.FC<SignToolProps> = ({
  files,
  selectedFileId,
  onSelectFile,
  onAddFiles,
  onLoadSample,
}) => {
  const currentFile = files.find((f) => f.id === selectedFileId) || files[0];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('Alex Morgan');
  const [typedFont, setTypedFont] = useState<'cursive' | 'serif'>('cursive');
  const [signatureColor, setSignatureColor] = useState('#0f172a');

  // Sign placement settings
  const [targetPageIndex, setTargetPageIndex] = useState<number>(0);
  const [includeDate, setIncludeDate] = useState(true);
  const [signerTitle, setSignerTitle] = useState('Authorized Signatory');
  const [posX, setPosX] = useState(55); // percent
  const [posY, setPosY] = useState(75); // percent

  const [pagePreviewUrl, setPagePreviewUrl] = useState<string | null>(null);
  const [isRenderingPage, setIsRenderingPage] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load preview of target page
  useEffect(() => {
    if (!currentFile) return;

    let isCancelled = false;
    async function loadPage() {
      try {
        setIsRenderingPage(true);
        const buffer = await getSafeFileBuffer(currentFile);

        const url = await renderPageToDataUrl(buffer, targetPageIndex + 1, 1.4);
        if (!isCancelled) setPagePreviewUrl(url);
      } catch (err) {
        console.error('Error rendering page for sign tool:', err);
      } finally {
        if (!isCancelled) setIsRenderingPage(false);
      }
    }

    loadPage();
    return () => {
      isCancelled = true;
    };
  }, [currentFile?.id, targetPageIndex]);

  // Drawing canvas events
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = signatureColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Get signature data URL
  const getSignatureDataUrl = (): string => {
    if (signatureMode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      return canvas.toDataURL('image/png');
    } else {
      // Generate canvas from typed text
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 320;
      tempCanvas.height = 100;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return '';

      ctx.fillStyle = signatureColor;
      ctx.font = typedFont === 'cursive' ? 'italic 34px "Brush Script MT", cursive, sans-serif' : 'italic 30px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, 160, 50);

      return tempCanvas.toDataURL('image/png');
    }
  };

  const handleExportSignedPdf = async () => {
    if (!currentFile) return;

    try {
      setIsExporting(true);
      const sigDataUrl = getSignatureDataUrl();
      const buffer = await getSafeFileBuffer(currentFile);

      const annotations: any[] = [
        {
          id: 'sig_main',
          type: 'signature',
          pageIndex: targetPageIndex,
          x: posX,
          y: posY,
          width: 140,
          height: 60,
          imageDataUrl: sigDataUrl,
        },
      ];

      if (includeDate) {
        const today = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        annotations.push({
          id: 'sig_date',
          type: 'text',
          pageIndex: targetPageIndex,
          x: posX,
          y: posY + 10,
          text: `Date: ${today}  |  ${signerTitle}`,
          fontSize: 9,
          color: '#334155',
        });
      }

      const signedBytes = await applyAnnotationsToPdf(buffer, annotations);
      const blob = new Blob([signedBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signed_${currentFile.name}`;
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
      console.error('Sign error:', err);
      alert(`Could not sign PDF: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!currentFile) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-3">
            <PenTool className="w-3.5 h-3.5" />
            <span>Digital Signature Suite</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Sign Any PDF Securely & Professionally
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            Draw your signature or type with elegant handwriting fonts, place it on any page, and append timestamps with zero upload or privacy concerns.
          </p>
        </div>

        <DropZone
          onFilesSelected={onAddFiles}
          onLoadSample={onLoadSample}
          label="Drag & Drop a PDF to Sign"
          description="Drop any document or contract here to apply digital signatures"
        />
      </div>
    );
  }

  const totalPages = currentFile.pageCount || 1;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <PenTool className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                Sign PDF Document
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Signing: <span className="font-semibold text-slate-700 dark:text-slate-300">{currentFile.name}</span>
              </p>
            </div>
          </div>
        </div>

        <button
          id="export-signed-pdf-btn"
          type="button"
          disabled={isExporting}
          onClick={handleExportSignedPdf}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 disabled:opacity-50 transition"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Applying Signature...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Sign & Download PDF</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        {/* Left Column: Signature Creator & Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <PenTool className="w-3.5 h-3.5 text-emerald-500" />
              <span>Create Signature</span>
            </h3>

            {/* Mode Tabs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSignatureMode('draw')}
                className={`py-2 text-xs font-bold rounded-lg border transition ${
                  signatureMode === 'draw'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Draw Signature
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode('type')}
                className={`py-2 text-xs font-bold rounded-lg border transition ${
                  signatureMode === 'type'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Type Signature
              </button>
            </div>

            {/* Draw Area */}
            {signatureMode === 'draw' ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Sign with mouse or touch:</span>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-slate-500 hover:text-red-600 inline-flex items-center space-x-1"
                  >
                    <Eraser className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>

                <div className="border border-slate-300 dark:border-slate-700 rounded-xl bg-white overflow-hidden shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={360}
                    height={140}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="cursor-crosshair w-full block"
                  />
                </div>
              </div>
            ) : (
              /* Type Area */
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  <p
                    className="text-2xl text-slate-900 dark:text-slate-100"
                    style={{
                      fontFamily: typedFont === 'cursive' ? '"Brush Script MT", cursive' : 'Georgia, serif',
                      fontStyle: 'italic',
                    }}
                  >
                    {typedName || 'Your Signature'}
                  </p>
                </div>
              </div>
            )}

            {/* Ink Color Picker */}
            <div className="flex items-center space-x-3 pt-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Ink:</span>
              {['#0f172a', '#1e3a8a', '#047857', '#991b1b'].map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setSignatureColor(col)}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    signatureColor === col ? 'border-emerald-500 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>

          {/* Placement Settings */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Placement & Stamp Details
            </h3>

            {/* Target Page */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Select Page to Sign
              </label>
              <select
                value={targetPageIndex}
                onChange={(e) => setTargetPageIndex(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                {Array.from({ length: totalPages }, (_, i) => (
                  <option key={i} value={i}>
                    Page {i + 1} {i === totalPages - 1 ? '(Last Page)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Sliders for Placement */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span>Horizontal Position (X)</span>
                  <span className="font-mono">{posX}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={posX}
                  onChange={(e) => setPosX(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span>Vertical Position (Y)</span>
                  <span className="font-mono">{posY}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={posY}
                  onChange={(e) => setPosY(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>

            {/* Date & Title */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDate}
                  onChange={(e) => setIncludeDate(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>Include Date Stamp & Title</span>
              </label>

              {includeDate && (
                <input
                  type="text"
                  placeholder="Signer Title (e.g. Authorized Officer)"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Document Preview with Signature Stamp (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-500 mb-3 flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Interactive Placement Preview (Page {targetPageIndex + 1})</span>
          </div>

          <div className="relative max-w-md w-full shadow-2xl rounded-lg overflow-hidden bg-white">
            {isRenderingPage ? (
              <div className="h-96 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : pagePreviewUrl ? (
              <img
                src={pagePreviewUrl}
                alt="Page preview"
                className="w-full block select-none pointer-events-none"
              />
            ) : (
              <div className="h-96 flex items-center justify-center text-xs text-slate-400">
                Rendering preview...
              </div>
            )}

            {/* Signature Overlay Stamp */}
            <div
              className="absolute p-1 border border-dashed border-emerald-500 rounded bg-white/80 shadow-md cursor-move select-none"
              style={{
                left: `${posX}%`,
                top: `${posY}%`,
                transform: 'translate(-20%, -50%)',
              }}
            >
              <div className="text-center">
                <p
                  className="text-lg px-2"
                  style={{
                    color: signatureColor,
                    fontFamily: signatureMode === 'draw' ? 'sans-serif' : '"Brush Script MT", cursive',
                    fontStyle: 'italic',
                  }}
                >
                  {signatureMode === 'draw' ? '✍️ [Drawn Signature]' : typedName}
                </p>
                {includeDate && (
                  <p className="text-[8px] text-slate-600 border-t border-slate-300 pt-0.5 mt-0.5">
                    {new Date().toLocaleDateString()} • {signerTitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
