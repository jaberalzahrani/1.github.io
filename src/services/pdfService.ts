import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { pdfjsLib } from './pdfInit';
import { PageInfo, WatermarkOptions, AnnotationItem, CompressionOptions, ImageFormat, ConvertedImageItem } from '../types';

/**
 * Safely load a PDF document without detaching the caller's ArrayBuffer.
 * Clones the underlying ArrayBuffer so the PDF.js Web Worker's postMessage transfer
 * cannot detach the original buffer.
 */
export async function loadPdfDocument(pdfBuffer: ArrayBuffer) {
  // Always make an explicit copy so web worker transfers don't detach caller's ArrayBuffer
  const bufferCopy = pdfBuffer.slice(0);
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(bufferCopy),
    useSystemFonts: true,
  });
  return await loadingTask.promise;
}

/**
 * Render an already loaded PDFPageProxy to a Data URL
 * Supports output format ('image/png', 'image/jpeg', 'image/webp'), quality and grayscale.
 */
export async function renderPdfPageToDataUrl(
  page: any,
  scale: number = 1.0,
  format: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
  quality: number = 0.92,
  grayscale: boolean = false
): Promise<string> {
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: grayscale });
  if (!context) throw new Error('Canvas 2D context unavailable');

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // Background white fill (vital for JPEG/no alpha and sharp print preview)
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: context,
    viewport: viewport,
    canvas: canvas,
  } as any).promise;

  if (grayscale) {
    const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = avg;
      data[i + 1] = avg;
      data[i + 2] = avg;
    }
    context.putImageData(imgData, 0, 0);
  }

  return canvas.toDataURL(format, quality);
}

/**
 * Render a specific page of a PDF ArrayBuffer to an image Data URL for preview
 */
export async function renderPageToDataUrl(
  pdfBuffer: ArrayBuffer,
  pageNumber: number = 1,
  scale: number = 1.0,
  format: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
  quality: number = 0.92,
  grayscale: boolean = false
): Promise<string> {
  const pdf = await loadPdfDocument(pdfBuffer);
  const page = await pdf.getPage(pageNumber);
  return await renderPdfPageToDataUrl(page, scale, format, quality, grayscale);
}

/**
 * Compress a PDF document by re-encoding pages with selectable quality/scale presets
 * and generating a lean, optimized output PDF.
 */
export async function compressPdf(
  pdfBuffer: ArrayBuffer,
  options: CompressionOptions,
  onProgress?: (current: number, total: number) => void
): Promise<{ buffer: ArrayBuffer; originalSize: number; compressedSize: number }> {
  const originalSize = pdfBuffer.byteLength;
  const pdf = await loadPdfDocument(pdfBuffer);
  const numPages = pdf.numPages;

  let targetScale = options.scale;
  let targetQuality = options.quality;
  let isGrayscale = options.grayscale;

  if (options.level === 'extreme') {
    targetScale = 0.85;
    targetQuality = 0.52;
  } else if (options.level === 'recommended') {
    targetScale = 1.1;
    targetQuality = 0.72;
  } else if (options.level === 'light') {
    targetScale = 1.4;
    targetQuality = 0.86;
  }

  const newDoc = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) {
      onProgress(i, numPages);
    }
    const page = await pdf.getPage(i);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const originalWidth = unscaledViewport.width;
    const originalHeight = unscaledViewport.height;

    const jpegDataUrl = await renderPdfPageToDataUrl(
      page,
      targetScale,
      'image/jpeg',
      targetQuality,
      isGrayscale
    );

    const jpegBytes = await fetch(jpegDataUrl).then((res) => res.arrayBuffer());
    const embeddedImage = await newDoc.embedJpg(jpegBytes);

    const newPage = newDoc.addPage([originalWidth, originalHeight]);
    newPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: originalWidth,
      height: originalHeight,
    });
  }

  const compressedBytes = await newDoc.save({ useObjectStreams: true });
  const cleanBuffer = compressedBytes.buffer.slice(
    compressedBytes.byteOffset,
    compressedBytes.byteOffset + compressedBytes.byteLength
  ) as ArrayBuffer;

  return {
    buffer: cleanBuffer,
    originalSize,
    compressedSize: cleanBuffer.byteLength,
  };
}

/**
 * Convert any image file (PNG, JPG, WebP, GIF, SVG, BMP) to a target image type
 * with adjustable quality and dimension scaling.
 */
export async function convertImageFile(
  file: File,
  targetFormat: ImageFormat,
  quality: number = 0.9,
  scale: number = 1.0
): Promise<ConvertedImageItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        const targetWidth = Math.max(1, Math.round(img.naturalWidth * scale));
        const targetHeight = Math.max(1, Math.round(img.naturalHeight * scale));
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Fill background white for JPEG (prevents black background if source had transparent alpha)
        if (targetFormat === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const mime = targetFormat === 'png' ? 'image/png' : targetFormat === 'webp' ? 'image/webp' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, quality);

        // Approximate byte size
        const base64Str = dataUrl.split(',')[1] || '';
        const targetSize = Math.round((base64Str.length * 3) / 4);

        const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const newName = `${baseName}.${ext}`;

        resolve({
          id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: newName,
          originalFormat: file.name.split('.').pop()?.toUpperCase() || file.type.split('/')[1]?.toUpperCase() || 'IMG',
          originalSize: file.size,
          targetFormat,
          targetSize,
          dataUrl,
          width: targetWidth,
          height: targetHeight,
        });
      };
      img.onerror = () => reject(new Error('Failed to parse image file'));
      img.src = src;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Safely retrieve a valid non-detached ArrayBuffer from an UploadedFileItem
 */
export async function getSafeFileBuffer(item: { file: File; arrayBuffer?: ArrayBuffer }): Promise<ArrayBuffer> {
  if (item.arrayBuffer) {
    try {
      new Uint8Array(item.arrayBuffer, 0, 0);
      if (item.arrayBuffer.byteLength > 0) {
        return item.arrayBuffer.slice(0);
      }
    } catch {
      // Buffer was detached, re-read below
    }
  }
  const fresh = await item.file.arrayBuffer();
  item.arrayBuffer = fresh.slice(0);
  return fresh;
}

/**
 * Get detailed page count and thumbnail previews for all pages
 */
export async function getPdfPagesInfo(pdfBuffer: ArrayBuffer): Promise<PageInfo[]> {
  const pdf = await loadPdfDocument(pdfBuffer);
  const pages: PageInfo[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const thumb = await renderPdfPageToDataUrl(page, 0.4);
      pages.push({
        pageNumber: i,
        rotation: 0,
        thumbnailUrl: thumb,
        isDeleted: false,
      });
    } catch {
      pages.push({
        pageNumber: i,
        rotation: 0,
        isDeleted: false,
      });
    }
  }

  return pages;
}

/**
 * Merge multiple PDF documents into a single PDF
 */
export async function mergePdfs(
  files: Array<{ buffer: ArrayBuffer; name: string; pageRange?: string }>
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const srcPdf = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
    const totalPages = srcPdf.getPageCount();
    let pageIndices: number[] = [];

    if (file.pageRange && file.pageRange.trim() !== '') {
      // Parse custom range e.g. "1, 3-5"
      pageIndices = parsePageRange(file.pageRange, totalPages);
    } else {
      // All pages
      pageIndices = Array.from({ length: totalPages }, (_, i) => i);
    }

    if (pageIndices.length > 0) {
      const copiedPages = await mergedPdf.copyPages(srcPdf, pageIndices);
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
  }

  return await mergedPdf.save();
}

/**
 * Parse page range string like "1, 3-5, 8" into zero-based indices
 */
export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  const result = new Set<number>();
  const parts = rangeStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages);
      for (let i = start; i <= end; i++) {
        result.add(i - 1);
      }
    } else {
      const pageNum = parseInt(trimmed, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        result.add(pageNum - 1);
      }
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}

/**
 * Split a PDF into either separate single page PDFs or extract custom range
 */
export async function splitPdf(
  pdfBuffer: ArrayBuffer,
  mode: 'single' | 'range',
  rangeStr?: string
): Promise<Array<{ filename: string; bytes: Uint8Array; pageNumber?: number }>> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const output: Array<{ filename: string; bytes: Uint8Array; pageNumber?: number }> = [];

  if (mode === 'single') {
    for (let i = 0; i < totalPages; i++) {
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
      newDoc.addPage(copiedPage);
      const bytes = await newDoc.save();
      output.push({
        filename: `page_${i + 1}.pdf`,
        bytes,
        pageNumber: i + 1,
      });
    }
  } else {
    // Custom range
    const indices = parsePageRange(rangeStr || `1-${totalPages}`, totalPages);
    if (indices.length > 0) {
      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(srcDoc, indices);
      copiedPages.forEach((p) => newDoc.addPage(p));
      const bytes = await newDoc.save();
      output.push({
        filename: `split_pages_${rangeStr ? rangeStr.replace(/\s+/g, '') : 'all'}.pdf`,
        bytes,
      });
    }
  }

  return output;
}

/**
 * Organize PDF: reorder, rotate, delete pages
 */
export async function organizePdf(
  pdfBuffer: ArrayBuffer,
  pageOrder: Array<{ originalIndex: number; rotation: number }>
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();

  for (const item of pageOrder) {
    const [copiedPage] = await newDoc.copyPages(srcDoc, [item.originalIndex]);
    if (item.rotation) {
      const currentRotation = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentRotation + item.rotation) % 360));
    }
    newDoc.addPage(copiedPage);
  }

  return await newDoc.save();
}

/**
 * Apply watermark and/or page numbering to PDF
 */
export async function applyWatermark(
  pdfBuffer: ArrayBuffer,
  options: WatermarkOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  // Hex color to RGB
  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    return rgb(r, g, b);
  };

  const watermarkColor = hexToRgb(options.color || '#94A3B8');

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    // 1. Watermark Text
    if (options.text && options.text.trim()) {
      const textWidth = font.widthOfTextAtSize(options.text, options.fontSize);
      const textHeight = font.heightAtSize(options.fontSize);

      if (options.position === 'center' || options.position === 'diagonal') {
        const x = width / 2;
        const y = height / 2;
        const angle = options.position === 'diagonal' ? options.rotation || 45 : 0;

        page.drawText(options.text, {
          x: x - (textWidth / 2) * Math.cos((angle * Math.PI) / 180),
          y: y - (textWidth / 2) * Math.sin((angle * Math.PI) / 180),
          size: options.fontSize,
          font,
          color: watermarkColor,
          opacity: options.opacity,
          rotate: degrees(angle),
        });
      } else if (options.position === 'header') {
        page.drawText(options.text, {
          x: (width - textWidth) / 2,
          y: height - textHeight - 20,
          size: options.fontSize,
          font,
          color: watermarkColor,
          opacity: options.opacity,
        });
      } else if (options.position === 'footer') {
        page.drawText(options.text, {
          x: (width - textWidth) / 2,
          y: 30,
          size: options.fontSize,
          font,
          color: watermarkColor,
          opacity: options.opacity,
        });
      }
    }

    // 2. Page Numbering
    if (options.includePageNumbers) {
      const pageNumText =
        options.pageNumberFormat === 'page_of_total'
          ? `Page ${i + 1} of ${totalPages}`
          : `${i + 1}`;
      const numWidth = regularFont.widthOfTextAtSize(pageNumText, 10);

      page.drawText(pageNumText, {
        x: (width - numWidth) / 2,
        y: 18,
        size: 10,
        font: regularFont,
        color: rgb(0.3, 0.35, 0.4),
        opacity: 0.85,
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Apply annotations & signatures directly onto PDF
 */
export async function applyAnnotationsToPdf(
  pdfBuffer: ArrayBuffer,
  annotations: AnnotationItem[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    return rgb(r, g, b);
  };

  for (const ann of annotations) {
    if (ann.pageIndex < 0 || ann.pageIndex >= pages.length) continue;
    const page = pages[ann.pageIndex];
    const { width, height } = page.getSize();

    // Map canvas coordinates (0..1 percentage) to PDF coordinates
    const targetX = (ann.x / 100) * width;
    // PDF origin (0,0) is bottom-left, while canvas is top-left
    const targetY = height - (ann.y / 100) * height;

    if (ann.type === 'text' && ann.text) {
      const fontSize = ann.fontSize || 16;
      page.drawText(ann.text, {
        x: targetX,
        y: targetY - fontSize,
        size: fontSize,
        font: boldFont,
        color: hexToRgb(ann.color || '#1E293B'),
        opacity: ann.opacity ?? 1,
      });
    } else if (ann.type === 'stamp' && ann.text) {
      const fontSize = 18;
      const textWidth = boldFont.widthOfTextAtSize(ann.text, fontSize);
      const padding = 8;
      const boxWidth = textWidth + padding * 2;
      const boxHeight = fontSize + padding * 2;

      // Draw stamp border and background
      page.drawRectangle({
        x: targetX - padding,
        y: targetY - boxHeight + padding,
        width: boxWidth,
        height: boxHeight,
        borderColor: hexToRgb(ann.color || '#DC2626'),
        borderWidth: 2,
        color: hexToRgb(ann.color || '#DC2626'),
        opacity: 0.12,
      });

      page.drawText(ann.text, {
        x: targetX,
        y: targetY - fontSize + 2,
        size: fontSize,
        font: boldFont,
        color: hexToRgb(ann.color || '#DC2626'),
        opacity: 0.95,
      });
    } else if (ann.type === 'signature' && ann.imageDataUrl) {
      try {
        const imageBytes = await fetch(ann.imageDataUrl).then((res) => res.arrayBuffer());
        const signatureImage = await pdfDoc.embedPng(imageBytes);
        const imgWidth = ann.width || 140;
        const imgHeight = ann.height || 60;

        page.drawImage(signatureImage, {
          x: targetX,
          y: targetY - imgHeight,
          width: imgWidth,
          height: imgHeight,
          opacity: 1,
        });
      } catch (err) {
        console.warn('Could not embed signature PNG:', err);
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Convert an array of Image files/dataUrls to a multi-page PDF
 */
export async function imagesToPdf(
  images: Array<{ dataUrl: string; name: string }>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const img of images) {
    try {
      let isPng = img.dataUrl.startsWith('data:image/png');
      let isJpg = img.dataUrl.startsWith('data:image/jpeg') || img.dataUrl.startsWith('data:image/jpg');
      let targetBytes: ArrayBuffer;

      if (isPng) {
        targetBytes = await fetch(img.dataUrl).then((r) => r.arrayBuffer());
      } else if (isJpg) {
        targetBytes = await fetch(img.dataUrl).then((r) => r.arrayBuffer());
      } else {
        // Fallback for WebP, GIF, SVG, BMP: render to standard JPEG canvas
        const tempImg = new Image();
        await new Promise((resolve, reject) => {
          tempImg.onload = resolve;
          tempImg.onerror = reject;
          tempImg.src = img.dataUrl;
        });
        const cvs = document.createElement('canvas');
        cvs.width = tempImg.naturalWidth || 800;
        cvs.height = tempImg.naturalHeight || 600;
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, cvs.width, cvs.height);
          ctx.drawImage(tempImg, 0, 0);
        }
        const jpgUrl = cvs.toDataURL('image/jpeg', 0.95);
        targetBytes = await fetch(jpgUrl).then((r) => r.arrayBuffer());
        isJpg = true;
      }

      let embeddedImage;
      if (isPng) {
        embeddedImage = await pdfDoc.embedPng(targetBytes);
      } else {
        embeddedImage = await pdfDoc.embedJpg(targetBytes);
      }

      const imgDims = embeddedImage.scale(1.0);
      const page = pdfDoc.addPage([imgDims.width, imgDims.height]);
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: imgDims.width,
        height: imgDims.height,
      });
    } catch (e) {
      console.warn('Image embed error:', e);
    }
  }

  return await pdfDoc.save();
}

/**
 * Generate a professional sample PDF document for immediate testing
 */
export async function generateSamplePdf(type: 'contract' | 'report' | 'proposal'): Promise<{
  name: string;
  buffer: ArrayBuffer;
}> {
  const doc = await PDFDocument.create();
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  if (type === 'contract') {
    // 2-page Service Agreement
    const page1 = doc.addPage([595.28, 841.89]); // A4
    page1.drawText('SERVICES AGREEMENT & TERMS', {
      x: 50,
      y: 770,
      size: 20,
      font: boldFont,
      color: rgb(0.1, 0.15, 0.25),
    });

    page1.drawText('Document ID: SA-2026-0921  |  Effective Date: September 21, 2026', {
      x: 50,
      y: 745,
      size: 10,
      font: regularFont,
      color: rgb(0.4, 0.45, 0.5),
    });

    // Horizontal line
    page1.drawLine({
      start: { x: 50, y: 730 },
      end: { x: 545, y: 730 },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.9),
    });

    const clauses = [
      '1. PURPOSE & SCOPE OF SERVICES',
      'The Service Provider agrees to deliver digital transformation and document automation services to the Client in accordance with the agreed specifications. All milestones shall be completed within the agreed timeframe.',
      '2. COMPENSATION & PAYMENT TERMS',
      'The total agreed fee for services shall be billed monthly upon submission of milestone verification. Invoices are payable net 15 days upon receipt.',
      '3. CONFIDENTIALITY & PROPRIETARY RIGHTS',
      'Both parties acknowledge that proprietary documentation, source materials, and customer records exchanged in performance of this Agreement shall remain strictly confidential.',
      '4. INTELLECTUAL PROPERTY',
      'Upon receipt of final payment, all custom deliverables created under this statement of work shall be transferred unconditionally to the Client.',
    ];

    let currentY = 700;
    for (let i = 0; i < clauses.length; i++) {
      const isHeader = i % 2 === 0;
      page1.drawText(clauses[i], {
        x: 50,
        y: currentY,
        size: isHeader ? 12 : 10,
        font: isHeader ? boldFont : regularFont,
        color: isHeader ? rgb(0.12, 0.18, 0.3) : rgb(0.25, 0.3, 0.35),
        maxWidth: 495,
        lineHeight: 14,
      });
      currentY -= isHeader ? 24 : 48;
    }

    // Page 2 - Signature Page
    const page2 = doc.addPage([595.28, 841.89]);
    page2.drawText('EXECUTION & SIGNATURES', {
      x: 50,
      y: 770,
      size: 18,
      font: boldFont,
      color: rgb(0.1, 0.15, 0.25),
    });

    page2.drawText(
      'IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first above written.',
      {
        x: 50,
        y: 735,
        size: 10,
        font: regularFont,
        color: rgb(0.3, 0.35, 0.4),
        maxWidth: 495,
      }
    );

    // Signature boxes
    page2.drawRectangle({
      x: 50,
      y: 580,
      width: 220,
      height: 90,
      borderColor: rgb(0.8, 0.83, 0.87),
      borderWidth: 1,
    });
    page2.drawText('Client Signature:', { x: 60, y: 650, size: 9, font: boldFont });
    page2.drawText('[Place Signature Here]', {
      x: 60,
      y: 620,
      size: 9,
      font: regularFont,
      color: rgb(0.6, 0.65, 0.7),
    });
    page2.drawText('Date: ____________________', { x: 60, y: 595, size: 9, font: regularFont });

    page2.drawRectangle({
      x: 325,
      y: 580,
      width: 220,
      height: 90,
      borderColor: rgb(0.8, 0.83, 0.87),
      borderWidth: 1,
    });
    page2.drawText('Provider Signature:', { x: 335, y: 650, size: 9, font: boldFont });
    page2.drawText('Verified Officer', {
      x: 335,
      y: 620,
      size: 9,
      font: regularFont,
      color: rgb(0.4, 0.45, 0.5),
    });
    page2.drawText('Date: September 21, 2026', { x: 335, y: 595, size: 9, font: regularFont });

    const pdfBytes = await doc.save();
    const cleanBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    ) as ArrayBuffer;
    return {
      name: 'Service_Agreement_Sample.pdf',
      buffer: cleanBuffer,
    };
  } else if (type === 'report') {
    // 3-page Quarterly Performance Report
    const page1 = doc.addPage([595.28, 841.89]);
    page1.drawText('Q3 EXECUTIVE PERFORMANCE REPORT', {
      x: 50,
      y: 770,
      size: 20,
      font: boldFont,
      color: rgb(0.08, 0.2, 0.38),
    });
    page1.drawText('Strategic Operations, Milestone Progress & Financial Summaries', {
      x: 50,
      y: 745,
      size: 11,
      font: regularFont,
      color: rgb(0.35, 0.4, 0.45),
    });

    page1.drawText('1. Executive Overview', { x: 50, y: 700, size: 14, font: boldFont });
    page1.drawText(
      'During the third quarter, key operational indicators demonstrated a 34% acceleration in platform throughput. Cloud migration efficiency reached 99.98% uptime, while operational costs reduced by 14.2% through streamlined automated pipelines.',
      { x: 50, y: 675, size: 10, font: regularFont, maxWidth: 495, lineHeight: 15 }
    );

    page1.drawText('Key Milestones Achieved:', { x: 50, y: 610, size: 11, font: boldFont });
    const bullets = [
      '• Deployment of distributed multi-region infrastructure with zero downtime',
      '• Successful security audit achieving SOC2 Type II certification',
      '• Implementation of unified drag-and-drop document processing workflows',
      '• Client adoption rate increased to 92% across all enterprise accounts',
    ];
    let by = 585;
    for (const b of bullets) {
      page1.drawText(b, { x: 60, y: by, size: 10, font: regularFont, color: rgb(0.2, 0.25, 0.3) });
      by -= 22;
    }

    // Page 2
    const page2 = doc.addPage([595.28, 841.89]);
    page2.drawText('2. Financial & Revenue Performance', { x: 50, y: 770, size: 14, font: boldFont });
    page2.drawText(
      'Gross recurring revenue for the quarter totaled $4.85M, reflecting 28% year-over-year expansion. Operating margins expanded by 320 basis points due to automation efficiencies.',
      { x: 50, y: 740, size: 10, font: regularFont, maxWidth: 495, lineHeight: 15 }
    );

    // Page 3
    const page3 = doc.addPage([595.28, 841.89]);
    page3.drawText('3. Forward Outlook & Q4 Priorities', { x: 50, y: 770, size: 14, font: boldFont });
    page3.drawText(
      'Our roadmap for the upcoming quarter focuses on enterprise integrations, real-time collaboration endpoints, and advanced export automation. We maintain our guidance for full-year operating targets.',
      { x: 50, y: 740, size: 10, font: regularFont, maxWidth: 495, lineHeight: 15 }
    );

    const pdfBytes = await doc.save();
    const cleanBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    ) as ArrayBuffer;
    return {
      name: 'Quarterly_Report_Sample.pdf',
      buffer: cleanBuffer,
    };
  } else {
    // Project Proposal (1 page)
    const page = doc.addPage([595.28, 841.89]);
    page.drawText('PRODUCT PROPOSAL & SPECIFICATION', {
      x: 50,
      y: 770,
      size: 20,
      font: boldFont,
      color: rgb(0.15, 0.23, 0.42),
    });
    page.drawText('Prepared for: Technical Advisory Board', {
      x: 50,
      y: 745,
      size: 11,
      font: regularFont,
      color: rgb(0.4, 0.45, 0.5),
    });

    page.drawText('Project Summary', { x: 50, y: 700, size: 13, font: boldFont });
    page.drawText(
      'This initiative delivers a modern browser-based document productivity platform enabling instantaneous PDF editing, merging, splitting, watermarking, and bi-directional Word conversion without server latency or security risks.',
      { x: 50, y: 675, size: 10, font: regularFont, maxWidth: 495, lineHeight: 15 }
    );

    const pdfBytes = await doc.save();
    const cleanBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    ) as ArrayBuffer;
    return {
      name: 'Project_Proposal_Sample.pdf',
      buffer: cleanBuffer,
    };
  }
}
