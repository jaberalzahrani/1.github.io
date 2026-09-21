import React from 'react';
import { FileText, Trash2, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { UploadedFileItem, ToolId } from '../types';

interface FileShelfProps {
  files: UploadedFileItem[];
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onRemoveFile: (id: string) => void;
  onSelectTool: (tool: ToolId) => void;
  activeTool: ToolId;
}

export const FileShelf: React.FC<FileShelfProps> = ({
  files,
  selectedFileId,
  onSelectFile,
  onRemoveFile,
  onSelectTool,
  activeTool,
}) => {
  if (files.length === 0) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 sm:p-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Loaded Files ({files.length})
          </span>
          {files.length > 1 && activeTool !== 'merge' && (
            <button
              onClick={() => onSelectTool('merge')}
              className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline inline-flex items-center space-x-1"
            >
              <span>Merge all together</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Horizontal scrollable shelf */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
          {files.map((file) => {
            const isSelected = file.id === selectedFileId;
            return (
              <div
                key={file.id}
                id={`shelf-file-${file.id}`}
                onClick={() => onSelectFile(file.id)}
                className={`group relative flex items-center space-x-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                }`}
              >
                {/* Thumbnail or icon */}
                <div className="w-8 h-10 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-2xs">
                  {file.thumbnailUrl ? (
                    <img
                      src={file.thumbnailUrl}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="w-4 h-4 text-red-500" />
                  )}
                </div>

                <div className="max-w-[140px] sm:max-w-[180px] truncate">
                  <p
                    className={`text-xs font-semibold truncate ${
                      isSelected
                        ? 'text-red-950 dark:text-red-200'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {file.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {file.pageCount ? `${file.pageCount} pages • ` : ''}
                    {formatFileSize(file.size)}
                  </p>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(file.id);
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  title="Remove file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
