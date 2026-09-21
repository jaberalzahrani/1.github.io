import * as pdfjsLib from 'pdfjs-dist';

// Configure worker safely for Vite environment
try {
  if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    // Use unpkg/cdnjs worker matching version or local worker URL
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
} catch (e) {
  console.warn('PDF.js worker initialization notice:', e);
}

export { pdfjsLib };
