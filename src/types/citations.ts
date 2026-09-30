/**
 * Citation & RAG System TypeScript Types & Interfaces
 * DocuMind - Production-Grade Source-Grounded AI Assistant
 */

export interface Citation {
  /** Unique ID of the referenced document */
  documentId: string;
  /** Full filename or document title */
  documentName: string;
  /** Optional formal title */
  documentTitle?: string;
  /** Exact page number in the source PDF */
  page: number;
  /** Page number alias for backwards compatibility */
  pageNumber?: number;
  /** Unique chunk identifier (e.g., 'chunk_12') */
  chunkId: string;
  /** Numerical index of the chunk */
  chunkIndex?: number;
  /** Exact extracted text from the referenced chunk */
  chunkText: string;
  /** Short snippet for preview */
  snippet?: string;
  /** Cosine / Hybrid relevance score (0.0 - 1.0) */
  relevanceScore: number;
  /** Similarity score alias */
  similarityScore?: number;
}

export type RetrievalConfidence = 'high' | 'medium' | 'low' | 'none';

export interface RetrievalMetadata {
  /** Highest similarity score among retrieved chunks */
  topScore: number;
  /** Overall retrieval confidence assessment */
  confidence: RetrievalConfidence;
  /** Total number of candidate chunks evaluated */
  chunksEvaluated: number;
  /** Human-readable warning if supporting context is limited */
  lowConfidenceWarning?: string;
}

export interface ChatMessage {
  _id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string | Date;
  relevantChunk?: number[];
  citations?: Citation[];
  retrievalMetadata?: RetrievalMetadata;
}

export interface RAGChatResponse {
  success: boolean;
  data: {
    question: string;
    answer: string;
    citations: Citation[];
    retrievalMetadata: RetrievalMetadata;
    documentsUsed?: string[];
    chatHistoryId?: string;
  };
  message?: string;
}

export interface DocumentSourceTarget {
  documentId: string;
  documentName: string;
  page: number;
  chunkText?: string;
  snippet?: string;
  relevanceScore?: number;
}
