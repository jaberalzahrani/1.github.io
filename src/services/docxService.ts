import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import { loadPdfDocument } from './pdfService';
import { DocxConversionOptions } from '../types';

export interface ExtractedPageContent {
  pageNumber: number;
  text: string;
  paragraphs: Array<{
    text: string;
    isHeading?: boolean;
    headingLevel?: 1 | 2 | 3;
    isBullet?: boolean;
    fontSize?: number;
    isBold?: boolean;
  }>;
}

export interface DocxConversionResult {
  blob: Blob;
  pages: ExtractedPageContent[];
  totalWordCount: number;
  totalCharacters: number;
}

export async function convertPdfToDocx(
  pdfBuffer: ArrayBuffer,
  options: DocxConversionOptions = {
    includeHeadings: true,
    detectParagraphs: true,
    pageBreaks: true,
    fontFamily: 'Calibri',
  }
): Promise<DocxConversionResult> {
  const pdfDocument = await loadPdfDocument(pdfBuffer);
  const numPages = pdfDocument.numPages;
  const extractedPages: ExtractedPageContent[] = [];

  let totalWordCount = 0;
  let totalCharacters = 0;

  // Extract content from each page
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{
      str: string;
      transform: number[];
      width: number;
      height: number;
      fontName: string;
    }>;

    if (!items || items.length === 0) {
      extractedPages.push({
        pageNumber: pageNum,
        text: '',
        paragraphs: [{ text: `[Empty or scanned page ${pageNum}]` }],
      });
      continue;
    }

    // Sort items visually: Top-to-bottom (transform[5] descending), then left-to-right (transform[4] ascending)
    const sortedItems = [...items].sort((a, b) => {
      const yDiff = Math.abs(a.transform[5] - b.transform[5]);
      if (yDiff < 4) {
        return a.transform[4] - b.transform[4];
      }
      return b.transform[5] - a.transform[5];
    });

    // Group into visual lines
    const lines: Array<{
      text: string;
      fontSize: number;
      isBold: boolean;
      y: number;
    }> = [];

    let currentLineText = '';
    let currentY = sortedItems[0]?.transform[5] ?? 0;
    let maxFontSizeInLine = Math.abs(sortedItems[0]?.transform[3] || 11);
    let lineIsBold = false;

    for (const item of sortedItems) {
      if (!item.str || item.str.trim() === '') continue;

      const y = item.transform[5];
      const fontSize = Math.abs(item.transform[3] || 11);
      const isBold = /bold|black|heavy/i.test(item.fontName || '');

      if (Math.abs(y - currentY) > 4) {
        // New line detected
        if (currentLineText.trim().length > 0) {
          lines.push({
            text: currentLineText.trim(),
            fontSize: maxFontSizeInLine,
            isBold: lineIsBold,
            y: currentY,
          });
        }
        currentLineText = item.str;
        currentY = y;
        maxFontSizeInLine = fontSize;
        lineIsBold = isBold;
      } else {
        // Same line: add space if needed
        const needsSpace =
          currentLineText.length > 0 &&
          !currentLineText.endsWith(' ') &&
          !item.str.startsWith(' ');
        currentLineText += (needsSpace ? ' ' : '') + item.str;
        if (fontSize > maxFontSizeInLine) {
          maxFontSizeInLine = fontSize;
        }
        if (isBold) {
          lineIsBold = true;
        }
      }
    }

    if (currentLineText.trim().length > 0) {
      lines.push({
        text: currentLineText.trim(),
        fontSize: maxFontSizeInLine,
        isBold: lineIsBold,
        y: currentY,
      });
    }

    // Calculate median font size on page to detect headings
    const fontSizes = lines.map((l) => l.fontSize).sort((a, b) => a - b);
    const medianFontSize = fontSizes[Math.floor(fontSizes.length / 2)] || 11;

    // Group lines into paragraphs
    const pageParagraphs: ExtractedPageContent['paragraphs'] = [];
    let currentParaLines: string[] = [];
    let currentParaIsHeading = false;
    let currentHeadingLevel: 1 | 2 | 3 | undefined;
    let currentParaFontSize = medianFontSize;
    let currentParaIsBold = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isHeading =
        options.includeHeadings &&
        (line.fontSize >= medianFontSize * 1.35 || (line.isBold && line.text.length < 60));

      let headingLevel: 1 | 2 | 3 = 3;
      if (line.fontSize >= medianFontSize * 1.8) {
        headingLevel = 1;
      } else if (line.fontSize >= medianFontSize * 1.4) {
        headingLevel = 2;
      }

      const isBullet = /^[•\-*]|\d+\.\s/.test(line.text);

      if (isHeading) {
        if (currentParaLines.length > 0) {
          pageParagraphs.push({
            text: currentParaLines.join(' '),
            isHeading: currentParaIsHeading,
            headingLevel: currentHeadingLevel,
            fontSize: currentParaFontSize,
            isBold: currentParaIsBold,
          });
          currentParaLines = [];
        }
        pageParagraphs.push({
          text: line.text,
          isHeading: true,
          headingLevel,
          fontSize: line.fontSize,
          isBold: true,
        });
      } else if (isBullet) {
        if (currentParaLines.length > 0) {
          pageParagraphs.push({
            text: currentParaLines.join(' '),
            fontSize: currentParaFontSize,
          });
          currentParaLines = [];
        }
        pageParagraphs.push({
          text: line.text,
          isBullet: true,
          fontSize: line.fontSize,
          isBold: line.isBold,
        });
      } else {
        // Regular text line
        currentParaLines.push(line.text);
        currentParaIsHeading = false;
        currentParaFontSize = line.fontSize;
        currentParaIsBold = line.isBold;

        // Check if next line is significantly lower or if this line looks like end of paragraph
        const nextLine = lines[i + 1];
        const isLastLine = i === lines.length - 1;
        const largeGap = nextLine && Math.abs(line.y - nextLine.y) > line.fontSize * 1.8;
        const endsWithPunctuation = /[.!?:]$/.test(line.text);

        if (isLastLine || largeGap || (endsWithPunctuation && line.text.length < 50)) {
          pageParagraphs.push({
            text: currentParaLines.join(' '),
            fontSize: currentParaFontSize,
            isBold: currentParaIsBold,
          });
          currentParaLines = [];
        }
      }
    }

    if (currentParaLines.length > 0) {
      pageParagraphs.push({
        text: currentParaLines.join(' '),
        fontSize: currentParaFontSize,
        isBold: currentParaIsBold,
      });
    }

    const fullPageText = pageParagraphs.map((p) => p.text).join('\n\n');
    const words = fullPageText.split(/\s+/).filter(Boolean).length;
    totalWordCount += words;
    totalCharacters += fullPageText.length;

    extractedPages.push({
      pageNumber: pageNum,
      text: fullPageText,
      paragraphs: pageParagraphs,
    });
  }

  // Construct docx document
  const docParagraphs: Paragraph[] = [];

  for (let pIndex = 0; pIndex < extractedPages.length; pIndex++) {
    const page = extractedPages[pIndex];

    for (const para of page.paragraphs) {
      if (!para.text.trim()) continue;

      if (para.isHeading) {
        let heading: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1;
        if (para.headingLevel === 2) heading = HeadingLevel.HEADING_2;
        if (para.headingLevel === 3) heading = HeadingLevel.HEADING_3;

        docParagraphs.push(
          new Paragraph({
            heading,
            children: [
              new TextRun({
                text: para.text,
                bold: true,
                font: options.fontFamily,
                size: para.headingLevel === 1 ? 32 : para.headingLevel === 2 ? 26 : 22,
                color: '1A202C',
              }),
            ],
            spacing: {
              before: 240,
              after: 120,
            },
          })
        );
      } else if (para.isBullet) {
        docParagraphs.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: para.text.replace(/^[•\-*]\s*|\d+\.\s*/, ''),
                font: options.fontFamily,
                size: 22, // 11pt in half-points
                bold: para.isBold,
              }),
            ],
            spacing: {
              before: 60,
              after: 60,
            },
          })
        );
      } else {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: para.text,
                font: options.fontFamily,
                size: 22, // 11pt
                bold: para.isBold,
              }),
            ],
            spacing: {
              before: 80,
              after: 120,
              line: 320, // 1.33 line spacing
            },
          })
        );
      }
    }

    // Add page break between pages if selected and not the last page
    if (options.pageBreaks && pIndex < extractedPages.length - 1) {
      docParagraphs.push(
        new Paragraph({
          children: [new TextRun({ text: '', break: 1 })],
          pageBreakBefore: true,
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docParagraphs.length > 0 ? docParagraphs : [
          new Paragraph({
            children: [new TextRun({ text: 'Converted Document' })],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);

  return {
    blob,
    pages: extractedPages,
    totalWordCount,
    totalCharacters,
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
