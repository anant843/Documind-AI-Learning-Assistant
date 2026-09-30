import fs from 'fs/promises';
import { PDFParse } from 'pdf-parse';

/**
 * Sanitizes raw PDF extracted text by removing page headers, footers,
 * standalone page numbers, table of contents debris, and metadata.
 * @param {string} raw - The raw text to clean.
 * @returns {string} - Cleaned text.
 */
export const cleanPDFText = (raw) => {
    if (!raw || typeof raw !== 'string') return '';

    return raw
        // Remove synthetic/OCR page markers like "--- Page 1 ---", "-- 1 of 40 --"
        .replace(/---\s*Page\s*\d+\s*---/gi, '')
        .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '')
        .replace(/^\s*Page\s+\d+(\s+of\s+\d+)?\s*$/gim, '')
        // Remove isolated page numbers on single lines
        .replace(/^\s*\d+\s*$/gm, '')
        // Remove common table of contents leader dots e.g. "Chapter 1 .......... 14"
        .replace(/^.*(?:\.{4,}|_{4,})\s*\d+\s*$/gm, '')
        // Remove repeated copyright / watermark boilerplate lines
        .replace(/^\s*(?:copyright|all rights reserved|confidential|draft|internal use only|do not distribute).*$/gim, '')
        // Normalize whitespace and newlines
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

/**
 * Extract text content from a PDF file with exact page-by-page mapping and metadata cleaning.
 * @param {string} filePath - The path of the PDF file on disk.
 * @returns {Promise<{text: string, rawText: string, pages: Array<{pageNumber: number, text: string}>, numPages: number, info: any}>}
 */
export const extractTextFromPDF = async (filePath) => {
    try {
        const dataBuffer = await fs.readFile(filePath);
        // pdf-parse expects a Uint8Array
        const parser = new PDFParse(new Uint8Array(dataBuffer));
        const data = await parser.getText();

        let pages = [];
        if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
            pages = data.pages.map((p, idx) => {
                const rawPageText = typeof p === 'string' ? p : (p?.text || '');
                return {
                    pageNumber: (p && typeof p.num === 'number') ? p.num : (idx + 1),
                    text: cleanPDFText(rawPageText)
                };
            }).filter(p => p.text.trim().length > 0);
        }

        if (pages.length === 0 && data.text) {
            // Fallback: single page if no individual pages returned
            pages = [{
                pageNumber: 1,
                text: cleanPDFText(data.text)
            }];
        }

        // Create clean delimited text with page boundaries
        const delimitedText = pages.length > 0
            ? pages.map(p => `--- Page ${p.pageNumber} ---\n${p.text}`).join('\n\n')
            : cleanPDFText(data.text || '');

        return {
            text: delimitedText,
            rawText: cleanPDFText(data.text || ''),
            pages,
            numPages: data.total || pages.length || 1,
            info: data.info || null
        };

    } catch (error) {
        console.error("Error extracting text from PDF:", error);
        throw new Error('Failed to extract text from PDF');
    }
};