/**
 * Cleans individual chunk text from synthetic page delimiters,
 * isolated numbers, and boilerplate noise.
 * @param {string} text - Raw chunk text.
 * @returns {string} - Cleaned chunk text.
 */
export const cleanChunkContent = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/---\s*Page\s*\d+\s*---/gi, '')
        .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '')
        .replace(/^\s*Page\s+\d+(\s+of\s+\d+)?\s*$/gim, '')
        .replace(/^\s*\d+\s*$/gm, '')
        .replace(/^.*(?:\.{4,}|_{4,})\s*\d+\s*$/gm, '')
        .replace(/^\s*(?:copyright|all rights reserved|confidential|draft|internal use only|do not distribute).*$/gim, '')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

/**
 * Validates whether a text chunk contains substantive educational content
 * (definitions, explanations, algorithms, processes, technical facts)
 * vs low-information metadata, table of contents, or pure heading lists.
 * @param {string} text - Chunk text.
 * @returns {boolean} - True if educational and high-information.
 */
export const isEducationalContent = (text) => {
    if (!text || typeof text !== 'string') return false;
    const clean = cleanChunkContent(text);
    
    // Length checks: must have sufficient body
    const words = clean.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 20 || clean.length < 90) return false;

    // Reject pure Table of Contents or Index
    if (/^(?:table of contents|contents|index|preface|acknowledgements|syllabus)\b/i.test(clean)) {
        return false;
    }

    const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return false;

    // Reject if > 60% of lines are question prompts with no body answers (e.g. interview question lists)
    const questionLines = lines.filter(l => l.endsWith('?') || /^(?:q(?:uestion)?\s*\d+|interview question)/i.test(l));
    if (lines.length >= 3 && (questionLines.length / lines.length) > 0.6) {
        return false;
    }

    // Reject if lines are mostly short headers or section tags (< 4 words per line)
    const avgWordsPerLine = words.length / lines.length;
    if (lines.length > 3 && avgWordsPerLine < 3.5) {
        return false;
    }

    // Check for educational discourse indicators (definitions, causality, properties, mechanisms)
    const educationalIndicators = [
        /\b(?:is defined as|refers to|means|consists of|is a|is an|represents|denotes)\b/i,
        /\b(?:works by|functions as|operates|causes|results in|enables|allows|implements|executes)\b/i,
        /\b(?:characteristics?|properties|advantages?|disadvantages?|features?|components?|principles?)\b/i,
        /\b(?:algorithm|architecture|process|protocol|equation|formula|framework|structure|methodology)\b/i,
        /\b(?:because|therefore|however|specifically|for example|in contrast|whereas|furthermore)\b/i
    ];

    const indicatorMatches = educationalIndicators.filter(regex => regex.test(clean)).length;

    // Strong acceptance if indicators are present or if paragraph is sufficiently dense
    if (indicatorMatches >= 1 || words.length >= 40) {
        return true;
    }

    return false;
};

/**
 * Filter and rank chunks to keep only high-yield educational passages.
 * @param {Array<Object>} chunks - Array of chunk objects.
 * @returns {Array<Object>} - High-yield educational chunks.
 */
export const filterEducationalChunks = (chunks) => {
    if (!Array.isArray(chunks) || chunks.length === 0) return [];

    const educational = chunks
        .map(c => {
            const content = cleanChunkContent(c.content || c.text || '');
            return {
                ...c,
                content
            };
        })
        .filter(c => isEducationalContent(c.content));

    // Fallback: If strict filtering rejected everything, take non-empty cleaned chunks > 15 words
    if (educational.length === 0) {
        return chunks
            .map(c => ({ ...c, content: cleanChunkContent(c.content || c.text || '') }))
            .filter(c => c.content.split(/\s+/).length > 15);
    }

    return educational;
};

/**
 * Selects representative educational passages across the document for quiz generation.
 * @param {string|Array<Object>} input - Raw text or chunk array.
 * @param {number} maxPassages - Number of passages to select.
 * @returns {Array<string>} - Array of educational passage strings.
 */
export const selectEducationalPassagesForQuiz = (input, maxPassages = 8) => {
    let rawChunks = [];
    if (Array.isArray(input)) {
        rawChunks = input;
    } else if (typeof input === 'string') {
        rawChunks = chunkText(input, 350, 40);
    }

    const educationalChunks = filterEducationalChunks(rawChunks);
    if (educationalChunks.length === 0) {
        const clean = cleanChunkContent(typeof input === 'string' ? input : '');
        return clean ? [clean.substring(0, 15000)] : [];
    }

    if (educationalChunks.length <= maxPassages) {
        return educationalChunks.map(c => c.content);
    }

    // Evenly distribute sampling across the document
    const selected = [];
    const step = educationalChunks.length / maxPassages;
    for (let i = 0; i < maxPassages; i++) {
        const idx = Math.min(Math.floor(i * step), educationalChunks.length - 1);
        selected.push(educationalChunks[idx].content);
    }

    return selected;
};

/**
 * Split text or pages into chunks for optimal RAG AI processing with exact page tracking.
 * @param {string|Array<{pageNumber:number, text:string}>} input - The input text or array of page objects.
 * @param {number} chunkSize - The maximum word count per chunk.
 * @param {number} overlap - The number of overlapping words between chunks.
 * @returns {Array<{content:string,chunkIndex:number,pageNumber:number}>} - An array of text chunks.
 */
export const chunkText = (input, chunkSize = 450, overlap = 50) => {
    if (!input) {
        return [];
    }

    let pageSegments = [];

    if (Array.isArray(input)) {
        // Direct array of page objects { pageNumber, text }
        pageSegments = input
            .map((p, idx) => ({
                pageNumber: (p && typeof p.pageNumber === 'number') ? p.pageNumber : (p?.num || idx + 1),
                text: typeof p === 'string' ? p : (p?.text || '')
            }))
            .filter(p => p.text && p.text.trim().length > 0);
    } else if (typeof input === 'string') {
        const text = input.trim();
        if (text.length === 0) return [];

        // Detect explicit page markers like "--- Page 1 ---" or "-- 1 of 45 --" or "Page 1:"
        const pageRegex = /(?:---\s*Page\s*(\d+)\s*---|--\s*(\d+)\s*of\s*\d+\s*--|^\s*Page\s+(\d+)\b)/gim;
        let lastIndex = 0;
        let currentPage = 1;
        let match;

        while ((match = pageRegex.exec(text)) !== null) {
            const textBefore = text.substring(lastIndex, match.index).trim();
            if (textBefore.length > 0) {
                pageSegments.push({ pageNumber: currentPage, text: textBefore });
            }
            currentPage = parseInt(match[1] || match[2] || match[3] || (currentPage + 1), 10);
            lastIndex = match.index + match[0].length;
        }

        const remainingText = text.substring(lastIndex).trim();
        if (remainingText.length > 0) {
            pageSegments.push({ pageNumber: currentPage, text: remainingText });
        }

        // If no page markers were detected, use full text as a single initial segment
        if (pageSegments.length === 0) {
            pageSegments.push({ pageNumber: 1, text: text });
        }
    }

    const chunks = [];
    let chunkIndex = 0;

    for (const segment of pageSegments) {
        const cleanSegment = cleanChunkContent(segment.text || '');

        if (cleanSegment.length === 0) continue;

        const words = cleanSegment.split(/\s+/).filter(w => w.length > 0);
        const totalWords = words.length;

        if (totalWords <= chunkSize) {
            chunks.push({
                content: cleanSegment,
                chunkIndex: chunkIndex++,
                pageNumber: segment.pageNumber
            });
            continue;
        }

        // Split large segments into overlapping word chunks on the exact same page
        const step = Math.max(1, chunkSize - overlap);
        for (let i = 0; i < totalWords; i += step) {
            const chunkWords = words.slice(i, i + chunkSize);
            if (chunkWords.length === 0) break;

            chunks.push({
                content: chunkWords.join(' '),
                chunkIndex: chunkIndex++,
                pageNumber: segment.pageNumber
            });

            if (i + chunkSize >= totalWords) break;
        }
    }

    return chunks;
};

/**
 * Find relevant chunks from text chunks based on Hybrid BM25 / Keyword matching
 * @param {Array<Object>} chunks - array of text chunks
 * @param {string} query - the search query
 * @param {number} maxChunks - max chunks to return
 * @returns {Array<Object>} - relevant text chunks
 */
export const findRelevantChunks = (chunks, query, maxChunks = 5) => {
    if (!chunks || chunks.length === 0) return [];
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return chunks.slice(0, maxChunks);
    }

    const cleanQuery = query.toLowerCase().trim();

    // Common stop words and generic question/comparison framing terms
    const stopWords = new Set([
        'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'it', 'of', 'for', 'with', 'as', 'by', 'that', 'this', 'these', 'those', 'be', 'are', 'was', 'were', 'from', 'or', 'but', 'what', 'how', 'why', 'when', 'where', 'who', 'does', 'did', 'do', 'can', 'could', 'would', 'should', 'explain', 'tell', 'me', 'about', 'define', 'meaning', 'difference', 'differences', 'between', 'versus', 'vs', 'compare', 'contrast'
    ]);

    // Extract significant query terms
    const queryTerms = cleanQuery
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(term => term.length > 1 && !stopWords.has(term));

    // Fallback if all words were filtered
    const effectiveTerms = queryTerms.length > 0
        ? queryTerms
        : cleanQuery.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 1);

    // Score chunks with term frequency & density
    const scoredChunks = chunks.map(chunk => {
        const text = (chunk.content || chunk.text || '').toLowerCase();
        let score = 0;
        let matchCount = 0;

        for (const term of effectiveTerms) {
            // Exact term occurrences
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            const matches = text.match(regex);
            if (matches) {
                matchCount += matches.length;
                score += matches.length * 3; // exact match weight
            } else if (text.includes(term)) {
                matchCount += 1;
                score += 1; // partial match weight
            }
        }

        // Phrase bonus if query appears verbatim
        if (text.includes(cleanQuery)) {
            score += 10;
        }

        return {
            ...chunk,
            score,
            matchCount
        };
    });

    // Sort by score descending and return top chunks
    return scoredChunks
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxChunks);
};