import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Sparkles, Plus, CheckCircle2 } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSample: (type: 'contract' | 'report' | 'proposal') => void;
  isCompact?: boolean;
  accept?: string;
  label?: string;
  description?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  onLoadSample,
  isCompact = false,
  accept = '.pdf,application/pdf,image/png,image/jpeg,image/jpg',
  label = 'Drag & Drop your PDF files here',
  description = 'Supports PDF documents, Word documents, and high-resolution images',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesSelected(filesArray);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
      // Reset input so same file can be selected again if needed
      e.target.value = '';
    }
  };

  if (isCompact) {
    return (
      <div
        id="compact-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
            : 'border-slate-300 dark:border-slate-700 hover:border-red-400 dark:hover:border-red-500/70 bg-white dark:bg-slate-800/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
        />
        <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Add more PDF or image files
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag and drop here or click to browse
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        id="main-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${
          isDragOver
            ? 'border-red-500 bg-red-500/5 ring-4 ring-red-500/20 scale-[1.005]'
            : 'border-slate-300 dark:border-slate-700 hover:border-red-500 dark:hover:border-red-500/80 bg-white dark:bg-slate-900/60 shadow-sm hover:shadow-md'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Upload Icon */}
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 shadow-sm group-hover:scale-110 group-hover:bg-red-100 dark:group-hover:bg-red-900/60 transition-all duration-200">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-white rounded-full shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Text */}
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 text-center mb-1">
          {label}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
          {description}
        </p>

        {/* Button */}
        <div className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-md shadow-red-600/25 group-hover:bg-red-500 transition-colors">
          <FileText className="w-4 h-4" />
          <span>Choose PDF Files</span>
        </div>

        {/* Feature Badges */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            Client-Side Fast Processing
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            No File Size Limit
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            100% Private in Browser
          </span>
        </div>
      </div>

      {/* Quick Sample Documents Section */}
      <div className="mt-5 p-4 rounded-xl bg-slate-100/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Don't have a PDF ready? Test with instant samples:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="sample-contract-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample('contract');
              }}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs transition"
            >
              📄 Agreement (2 pages)
            </button>
            <button
              id="sample-report-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample('report');
              }}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs transition"
            >
              📊 Executive Report (3 pages)
            </button>
            <button
              id="sample-proposal-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample('proposal');
              }}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs transition"
            >
              📝 Proposal (1 page)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
