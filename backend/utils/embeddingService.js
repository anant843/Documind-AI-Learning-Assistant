import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { findRelevantChunks } from './textChunker.js';

dotenv.config();

const EMBEDDING_DIMENSIONS = 768;

/**
 * Extract clean string text from any chunk format (content, text, chunkText, pageContent, Mongoose doc)
 * @param {any} chunk
 * @returns {string}
 */
export function extractChunkText(chunk) {
  if (!chunk) return '';
  if (typeof chunk === 'string') return chunk;
  return (
    chunk.content ||
    chunk.text ||
    chunk.chunkText ||
    chunk.pageContent ||
    (chunk._doc && (chunk._doc.content || chunk._doc.text)) ||
    ''
  );
}

/**
 * Intelligent deterministic embedding vector generator (fallback / offline mode)
 * Produces normalized 768-dimensional term frequency & character n-gram vectors.
 */
function createDeterministicEmbedding(text, dimensions = EMBEDDING_DIMENSIONS) {
  const vec = new Array(dimensions).fill(0);
  if (!text || typeof text !== 'string') return vec;

  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = normalized.split(/\s+/).filter(w => w.length > 1);

  // Term-frequency hash mapping into vector dimensions
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(j);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    const weight = 1 + (word.length > 5 ? 0.8 : 0);
    vec[idx] += weight;

    // Add bigram context
    if (i < words.length - 1) {
      const bigram = `${word}_${words[i + 1]}`;
      let bHash = 0;
      for (let k = 0; k < bigram.length; k++) {
        bHash = ((bHash << 5) - bHash) + bigram.charCodeAt(k);
        bHash |= 0;
      }
      const bIdx = Math.abs(bHash) % dimensions;
      vec[bIdx] += 2.0;
    }
  }

  // Normalize vector to unit length (L2 norm)
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vec[i] * vec[i];
  }
  if (norm > 0) {
    const sqrtNorm = Math.sqrt(norm);
    for (let i = 0; i < dimensions; i++) {
      vec[i] = Number((vec[i] / sqrtNorm).toFixed(6));
    }
  }

  return vec;
}

/**
 * Generate embedding vector using Gemini API with intelligent local fallback
 * @param {string} text - The input text to embed
 * @returns {Promise<number[]>}
 */
export async function generateEmbedding(text) {
  const cleanText = typeof text === 'string' ? text : extractChunkText(text);
  if (!cleanText || cleanText.trim().length === 0) {
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.length > 15 && !apiKey.includes('placeholder')) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: cleanText.substring(0, 2048),
      });

      if (response?.embedding?.values && Array.isArray(response.embedding.values)) {
        return response.embedding.values;
      }
    } catch (err) {
      // Fall through to deterministic fallback if quota or network issue
    }
  }

  return createDeterministicEmbedding(cleanText, EMBEDDING_DIMENSIONS);
}

/**
 * Calculate Cosine Similarity between two numerical vectors
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} Value between -1.0 and 1.0 (typically 0.0 to 1.0)
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  
  const len = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Search chunks using Hybrid Semantic Vector + BM25 Keyword Search
 * @param {string} query - The user query
 * @param {Array<Object>} chunks - Array of chunk objects
 * @param {number} topK - Maximum number of chunks to return
 * @returns {Promise<Array<Object>>}
 */
export async function searchSimilarChunks(query, chunks, topK = 5) {
  if (!chunks || chunks.length === 0) return [];
  
  // Normalize raw chunks to plain objects with clean content
  const normalizedChunks = chunks.map((chunk, index) => {
    const rawObj = chunk && chunk.toObject ? chunk.toObject() : chunk;
    const textContent = extractChunkText(rawObj);
    return {
      ...(typeof rawObj === 'object' ? rawObj : {}),
      content: textContent,
      pageNumber: (rawObj && typeof rawObj.pageNumber === 'number' && rawObj.pageNumber > 0)
        ? rawObj.pageNumber
        : (rawObj?.page || 1),
      chunkIndex: typeof rawObj?.chunkIndex === 'number' ? rawObj.chunkIndex : index,
      embedding: rawObj?.embedding || []
    };
  });

  if (!query || query.trim().length === 0) return normalizedChunks.slice(0, topK);

  // 1. Compute Keyword / Lexical relevance scores
  const keywordScored = findRelevantChunks(normalizedChunks, query, normalizedChunks.length);
  const maxRawScore = Math.max(...keywordScored.map(c => c.score || 0), 1);

  const keywordScoreMap = new Map();
  keywordScored.forEach((c) => {
    const normKw = (c.score || 0) / maxRawScore;
    const key = c._id ? c._id.toString() : `idx_${c.chunkIndex}`;
    keywordScoreMap.set(key, normKw);
  });

  // 2. Compute Semantic Vector Similarity
  const queryEmbedding = await generateEmbedding(query);

  const scoredChunks = await Promise.all(
    normalizedChunks.map(async (chunk) => {
      let chunkEmbedding = chunk.embedding;
      if (!chunkEmbedding || !Array.isArray(chunkEmbedding) || chunkEmbedding.length === 0) {
        chunkEmbedding = await generateEmbedding(chunk.content);
        chunk.embedding = chunkEmbedding;
      }

      const vectorSim = Math.max(0, cosineSimilarity(queryEmbedding, chunkEmbedding));
      const key = chunk._id ? chunk._id.toString() : `idx_${chunk.chunkIndex}`;
      const keywordSim = keywordScoreMap.get(key) || 0;

      // Hybrid Fusion Score: 60% Keyword / Exact Match + 40% Semantic Vector Similarity
      const hybridScore = (keywordSim * 0.6) + (vectorSim * 0.4);

      return {
        ...chunk,
        content: chunk.content,
        similarityScore: Number(Math.max(hybridScore, vectorSim, keywordSim).toFixed(4)),
        vectorScore: Number(vectorSim.toFixed(4)),
        keywordScore: Number(keywordSim.toFixed(4))
      };
    })
  );

  // Sort descending by hybrid similarity score
  scoredChunks.sort((a, b) => b.similarityScore - a.similarityScore || (a.chunkIndex ?? 0) - (b.chunkIndex ?? 0));

  return scoredChunks.slice(0, Math.min(topK, scoredChunks.length));
}
