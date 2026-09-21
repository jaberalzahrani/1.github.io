export type ToolId = 
  | 'merge' 
  | 'edit' 
  | 'to-word' 
  | 'compress'
  | 'sign' 
  | 'split' 
  | 'watermark' 
  | 'images';

export interface UploadedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  pageCount?: number;
  thumbnailUrl?: string;
  arrayBuffer?: ArrayBuffer;
}

export interface PageInfo {
  pageNumber: number;
  rotation: number;
  thumbnailUrl?: string;
  isDeleted?: boolean;
}

export interface AnnotationItem {
  id: string;
  type: 'text' | 'signature' | 'stamp' | 'drawing' | 'highlight' | 'rectangle';
  pageIndex: number;
  x: number; // percentage or px
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  opacity?: number;
  drawingData?: { x: number; y: number }[];
  imageDataUrl?: string;
  rotation?: number;
}

export interface DocxConversionOptions {
  includeHeadings: boolean;
  detectParagraphs: boolean;
  pageBreaks: boolean;
  fontFamily: string;
}

export interface WatermarkOptions {
  text: string;
  opacity: number;
  rotation: number;
  fontSize: number;
  color: string;
  position: 'center' | 'header' | 'footer' | 'diagonal';
  includePageNumbers: boolean;
  pageNumberFormat: 'page' | 'page_of_total';
}

export type CompressionLevel = 'extreme' | 'recommended' | 'light' | 'custom';

export interface CompressionOptions {
  level: CompressionLevel;
  quality: number; // 0.1 to 1.0 (e.g. 0.72)
  scale: number; // e.g. 0.8 to 1.5
  grayscale: boolean;
}

export type ImageFormat = 'png' | 'jpeg' | 'webp';

export interface ConvertedImageItem {
  id: string;
  name: string;
  originalFormat: string;
  originalSize: number;
  targetFormat: ImageFormat;
  targetSize: number;
  dataUrl: string;
  width: number;
  height: number;
}
