import React, { useState, useEffect } from 'react';
import { 
  ToolId, 
  UploadedFileItem 
} from './types';
import { Header } from './components/Header';
import { FileShelf } from './components/FileShelf';
import { SampleDocsModal } from './components/SampleDocsModal';
import { MergeTool } from './components/tools/MergeTool';
import { WordConverterTool } from './components/tools/WordConverterTool';
import { EditTool } from './components/tools/EditTool';
import { SignTool } from './components/tools/SignTool';
import { SplitTool } from './components/tools/SplitTool';
import { WatermarkTool } from './components/tools/WatermarkTool';
import { ImageConvertTool } from './components/tools/ImageConvertTool';
import { CompressTool } from './components/tools/CompressTool';
import { loadPdfDocument, renderPdfPageToDataUrl, generateSamplePdf } from './services/pdfService';
import { ShieldCheck, Sparkles, Layers, FileEdit, FileCode, PenTool } from 'lucide-react';

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId>('merge');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);

  // Initialize with a default sample file so the user immediately sees a working, interactive suite!
  useEffect(() => {
    let isCancelled = false;
    async function initDefaultSample() {
      try {
        const sample = await generateSamplePdf('contract');
        const pdfDoc = await loadPdfDocument(sample.buffer);
        const firstPage = await pdfDoc.getPage(1);
        const thumbUrl = await renderPdfPageToDataUrl(firstPage, 0.4);
        const file = new File([sample.buffer.slice(0)], sample.name, { type: 'application/pdf' });

        if (!isCancelled) {
          const sampleItem: UploadedFileItem = {
            id: 'sample_default',
            file,
            name: sample.name,
            size: sample.buffer.byteLength,
            type: 'application/pdf',
            pageCount: pdfDoc.numPages,
            thumbnailUrl: thumbUrl,
            arrayBuffer: sample.buffer.slice(0),
          };
          setUploadedFiles([sampleItem]);
          setSelectedFileId(sampleItem.id);
        }
      } catch (err) {
        console.error('Failed to init sample:', err);
      }
    }

    initDefaultSample();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Process and ingest user files
  const handleAddFiles = async (filesToAdd: File[]) => {
    const newItems: UploadedFileItem[] = [];

    for (const file of filesToAdd) {
      const id = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const buffer = await file.arrayBuffer();
      let pageCount = 1;
      let thumbnailUrl: string | undefined;

      if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const pdf = await loadPdfDocument(buffer);
          pageCount = pdf.numPages;
          const firstPage = await pdf.getPage(1);
          thumbnailUrl = await renderPdfPageToDataUrl(firstPage, 0.4);
        } catch (e) {
          console.warn('Could not parse PDF preview:', e);
        }
      } else if (file.type.startsWith('image/')) {
        thumbnailUrl = URL.createObjectURL(file);
      }

      newItems.push({
        id,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        pageCount,
        thumbnailUrl,
        arrayBuffer: buffer.slice(0),
      });
    }

    setUploadedFiles((prev) => [...prev, ...newItems]);
    if (newItems.length > 0) {
      setSelectedFileId(newItems[0].id);
    }
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      if (selectedFileId === id) {
        setSelectedFileId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  const handleLoadSample = async (type: 'contract' | 'report' | 'proposal') => {
    try {
      const sample = await generateSamplePdf(type);
      const pdf = await loadPdfDocument(sample.buffer);
      const firstPage = await pdf.getPage(1);
      const thumbUrl = await renderPdfPageToDataUrl(firstPage, 0.4);
      const file = new File([sample.buffer.slice(0)], sample.name, { type: 'application/pdf' });

      const sampleItem: UploadedFileItem = {
        id: `sample_${Date.now()}`,
        file,
        name: sample.name,
        size: sample.buffer.byteLength,
        type: 'application/pdf',
        pageCount: pdf.numPages,
        thumbnailUrl: thumbUrl,
        arrayBuffer: sample.buffer.slice(0),
      };

      setUploadedFiles((prev) => [sampleItem, ...prev]);
      setSelectedFileId(sampleItem.id);
    } catch (e) {
      console.error('Error loading sample:', e);
    }
  };

  // Global Drag and Drop event listeners for high usability
  const handleGlobalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGlobalDragging(true);
  };

  const handleGlobalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.relatedTarget === null) {
      setIsGlobalDragging(false);
    }
  };

  const handleGlobalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGlobalDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div
      id="app-root-container"
      onDragOver={handleGlobalDragOver}
      onDragLeave={handleGlobalDragLeave}
      onDrop={handleGlobalDrop}
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors"
    >
      {/* Global Drag Overlay */}
      {isGlobalDragging && (
        <div className="fixed inset-0 z-50 bg-red-600/20 backdrop-blur-xs border-4 border-dashed border-red-500 pointer-events-none flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl text-center border border-red-200 dark:border-red-900">
            <p className="text-xl font-extrabold text-red-600 dark:text-red-400">
              Drop your files here to import
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports PDF documents, Word documents, and images
            </p>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <Header
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        onOpenSampleModal={() => setIsSampleModalOpen(true)}
        filesCount={uploadedFiles.length}
      />

      {/* File Shelf for multi-document workflows */}
      <FileShelf
        files={uploadedFiles}
        selectedFileId={selectedFileId}
        onSelectFile={setSelectedFileId}
        onRemoveFile={handleRemoveFile}
        onSelectTool={setActiveTool}
        activeTool={activeTool}
      />

      {/* Main Tool Content Workspace */}
      <main className="flex-1 pb-16">
        {activeTool === 'merge' && (
          <MergeTool
            files={uploadedFiles}
            onAddFiles={handleAddFiles}
            onRemoveFile={handleRemoveFile}
            onLoadSample={handleLoadSample}
          />
        )}

        {activeTool === 'to-word' && (
          <WordConverterTool
            files={uploadedFiles}
            selectedFileId={selectedFileId}
            onSelectFile={setSelectedFileId}
            onAddFiles={handleAddFiles}
            onLoadSample={handleLoadSample}
          />
        )}

        {activeTool === 'compress' && (
          <CompressTool
            files={uploadedFiles}
            selectedFileId={selectedFileId}
            onSelectFile={setSelectedFileId}
            onAddFiles={handleAddFiles}
            onLoadSample={handleLoadSample}
          />
        )}

        {activeTool === 'edit' && (
          <EditTool
            files={uploadedFiles}
            selectedFileId={selectedFileId}
            onSelectFile={setSelectedFileId}
            onAddFiles={handleAddFiles}
            onLoadSample={handleLoadSample}
          />
        )}

        {activeTool === 'sign' && (
          <SignTool
            files={uploadedFiles}
            selectedFileId={selectedFileId}
            onSelectFile={setSelectedFileId}
            onAddFiles={handleAddFiles}
            onLoadSample={handleLoadSample}
          />
        )}

        {activeTool === 'split' && (
          <SplitTool
            files={uploadedFiles}
            selectedFileId={selectedFileId}
            onSelectFile={setSelectedFileId}
            onAddFiles={handleAddFiles}
            onLoadSample={handleLoadSample}
          />
        )}

        {activeTool === 'watermark' && (
          <WatermarkTool
            files={uploadedFiles}
            selectedFileId={selectedFileId}
            onSelectFile={setSelectedFileId}
            onAddFiles={handleAddFiles}
            onLoadSample={handleLoadSample}
          />
        )}

        {activeTool === 'images' && (
          <ImageConvertTool
            files={uploadedFiles}
            selectedFileId={selectedFileId}
            onSelectFile={setSelectedFileId}
            onAddFiles={handleAddFiles}
            onLoadSample={handleLoadSample}
          />
        )}
      </main>

      {/* Footer with Security & Privacy Guarantee */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md py-6 px-4 text-center">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="font-medium">
              Zero Server Uploads: All PDF manipulation & Word conversion runs client-side in your browser.
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <button
              onClick={() => setIsSampleModalOpen(true)}
              className="hover:text-red-500 transition underline underline-offset-2"
            >
              Load Sample Documents
            </button>
            <span>•</span>
            <span>PDF Studio v2.4</span>
          </div>
        </div>
      </footer>

      {/* Sample Documents Modal */}
      <SampleDocsModal
        isOpen={isSampleModalOpen}
        onClose={() => setIsSampleModalOpen(false)}
        onSelectSample={handleLoadSample}
      />
    </div>
  );
}
