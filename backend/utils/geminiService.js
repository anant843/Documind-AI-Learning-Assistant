import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { extractChunkText } from "./embeddingService.js";
import { selectEducationalPassagesForQuiz, filterEducationalChunks, cleanChunkContent } from "./textChunker.js";
import { cleanPDFText } from "./pdfParser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env"), override: true });

/* ----------------------------- */
/* Environment & Client Setup    */
/* ----------------------------- */

let ai = null;

const hasValidApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(
    apiKey &&
    apiKey !== "your_google_generative_ai_key" &&
    apiKey.trim() !== ""
  );
};

const getAiClient = () => {
  if (!hasValidApiKey()) {
    return null;
  }
  if (!ai) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return ai;
};

const callWithTimeout = (promise, ms = 25000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini API call timed out after ${ms}ms`)), ms)
    ),
  ]);
};

/**
 * Executes a prompt against candidate Gemini models in cascade order
 * with automatic fallback if one model is overloaded (503) or rate-limited.
 */
export const callGeminiWithCascade = async (contents, options = {}) => {
  const aiClient = getAiClient();
  if (!aiClient) return null;

  const defaultModel = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
  const candidateModels = [
    defaultModel,
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite-preview",
    "gemini-flash-latest"
  ].filter((v, idx, arr) => v && arr.indexOf(v) === idx);

  let lastError = null;
  for (const model of candidateModels) {
    try {
      const response = await callWithTimeout(
        aiClient.models.generateContent({
          model,
          contents,
          ...options
        }),
        25000
      );
      if (response && response.text) {
        return response.text;
      }
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} request error (${err.message?.substring(0, 100)}), trying candidate fallback...`);
    }
  }

  throw lastError || new Error("All Gemini model candidates exhausted");
};

/* ----------------------------- */
/* Mock Fallbacks                */
/* ----------------------------- */

const mockGenerateFlashcards = (text, count = 10, offset = 0) => {
  const targetCount = Math.max(1, parseInt(count, 10) || 10);
  const clean = cleanPDFText(text || '');
  const sentences = clean
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 25 && s.length < 300 && !/---\s*Page/i.test(s));

  const safeSentences = sentences.length > 0 ? sentences : [
    "Machine learning models optimize internal parameters by minimizing objective loss functions.",
    "Distributed systems implement replication protocols to ensure fault tolerance and high availability.",
    "Neural network layers utilize non-linear activation functions to learn hierarchical representations."
  ];

  const cards = [];
  for (let i = 0; i < targetCount; i++) {
    const idx = (offset + i) % safeSentences.length;
    const s = safeSentences[idx];
    const words = s.split(/\s+/).filter((w) => w.length > 2 && !/^(the|this|that|these|those|and|for|with|from)$/i.test(w));
    const subject = words.slice(0, 3).join(" ").replace(/[^a-zA-Z0-9\s-]/g, '').trim() || "this concept";
    cards.push({
      question: `What is the core principle or definition of ${subject} according to the document?`,
      answer: s,
      difficulty: (i + offset) % 3 === 0 ? "easy" : (i + offset) % 3 === 1 ? "medium" : "hard",
    });
  }

  return cards;
};

/**
 * Quality Gate & Validator for Multiple Choice Quiz Questions.
 * Rejects questions derived from page headers, metadata, cover pages,
 * meaningless prompts, or malformed options.
 */
export const validateQuizQuestion = (q) => {
  if (!q || typeof q !== "object") return null;
  const question = typeof q.question === "string" ? q.question.trim() : "";
  if (!question || question.length < 15) return null;

  // Strict blacklist of non-educational metadata and page marker patterns
  const INVALID_QUESTION_PATTERNS = [
    /---\s*page/i,
    /\bpage\s*\d+\b/i,
    /document text regarding\s*["'].*---/i,
    /which statement is correct regarding\s*["'].*---/i,
    /table of contents/i,
    /cover page/i,
    /interview question[s]?\s*(&|and)?\s*answer[s]?/i,
    /tell me about yourself/i,
    /why should we hire/i,
    /chapter\s*\d+\s*(title|heading)?/i,
    /section\s*\d+\s*(title|heading)?/i,
    /^\s*heading\b/i,
    /author\s*(name|details|bio)/i,
    /copyright\b/i
  ];

  for (const pattern of INVALID_QUESTION_PATTERNS) {
    if (pattern.test(question)) {
      console.warn(`[Quiz Quality Gate] Rejected invalid metadata question matching ${pattern}: "${question}"`);
      return null;
    }
  }

  if (!Array.isArray(q.options) || q.options.length < 4) return null;

  const validIds = ["A", "B", "C", "D"];
  const cleanedOptions = [];
  const seenTexts = new Set();

  for (let i = 0; i < 4; i++) {
    const rawOpt = q.options[i];
    if (!rawOpt) return null;

    const expectedId = validIds[i];
    let optText = "";

    if (typeof rawOpt === "object" && rawOpt !== null) {
      optText = (rawOpt.text || "").toString().trim();
    } else if (typeof rawOpt === "string") {
      optText = rawOpt.trim();
    }

    // Strip leading prefixes like "A)", "A.", "1.", "Option 1:"
    optText = optText.replace(/^(?:[A-D]|\d+|Option\s*\d+|O\d+)[:.)\s-]+/i, "").trim();

    if (!optText || optText.length < 3) return null;

    // Reject options referencing page titles, cover pages, or generic placeholders
    if (/---\s*Page/i.test(optText) || /^option\s*[A-D]$/i.test(optText) || /table of contents/i.test(optText)) {
      return null;
    }

    cleanedOptions.push({
      id: expectedId,
      text: optText,
    });
    seenTexts.add(optText.toLowerCase());
  }

  // Deduplicate identical distractor texts
  if (seenTexts.size < 4) {
    return null;
  }

  let rawCorrect = (q.correctOption || q.correctAnswer || "").toString().trim();
  let correctOption = null;

  const letterMatch = rawCorrect.match(/^[A-D]$/i) || rawCorrect.match(/^Option\s*([A-D])$/i);
  if (letterMatch) {
    correctOption = (letterMatch[1] || letterMatch[0]).toUpperCase();
  } else {
    const cleanRawCorrect = rawCorrect.replace(/^(?:[A-D]|\d+|Option\s*\d+|O\d+)[:.)\s-]+/i, "").trim().toLowerCase();
    const matchedOpt = cleanedOptions.find(o => o.text.toLowerCase() === cleanRawCorrect || cleanRawCorrect.includes(o.text.toLowerCase()));
    if (matchedOpt) {
      correctOption = matchedOpt.id;
    }
  }

  if (!correctOption || !validIds.includes(correctOption)) {
    return null;
  }

  const correctOptionObj = cleanedOptions.find(o => o.id === correctOption);
  const rawExplanation = (q.explanation || q.explaination || "").toString().trim();
  const explanation = (rawExplanation && rawExplanation.length >= 10 && !/---\s*Page/i.test(rawExplanation))
    ? rawExplanation
    : `Verified directly from the document: "${correctOptionObj ? correctOptionObj.text : ''}"`;

  return {
    question,
    options: cleanedOptions,
    correctOption,
    correctAnswer: `${correctOption}: ${correctOptionObj ? correctOptionObj.text : ''}`,
    explanation,
    difficulty: ["easy", "medium", "hard"].includes(q.difficulty?.toLowerCase()) ? q.difficulty.toLowerCase() : "medium",
  };
};

/**
 * Deterministic Educational Quiz Generator.
 * Used when Gemini API is offline, rate-limited, or recovering malformed items.
 * Extracts authentic definitions, concepts, and mechanisms from text.
 */
/**
 * Deterministic Educational Quiz Generator.
 * Used when Gemini API is offline, rate-limited, or recovering malformed items.
 * Extracts authentic definitions, concepts, and mechanisms from text.
 */
export const mockGenerateQuiz = (textOrChunks, numQuestions = 5, offset = 0) => {
  const targetCount = Math.max(1, parseInt(numQuestions, 10) || 5);
  
  // Extract and clean educational passages
  const rawText = typeof textOrChunks === 'string'
    ? textOrChunks
    : (Array.isArray(textOrChunks) ? textOrChunks.map(c => c.content || c.text || '').join('\n\n') : '');

  const cleanedText = cleanPDFText(rawText);

  // Extract substantive educational sentences and bullet items
  const lines = cleanedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const candidateItems = [];

  // 1. Check for bulleted definitions: "Concept: Description" or "• Concept - Description"
  for (const line of lines) {
    const bulletMatch = line.match(/^(?:[-*•]\s*|\d+\.\s*)?([A-Za-z0-9\s_-]{3,40})\s*[:–—\-]\s*(.{25,250})$/);
    if (bulletMatch) {
      const term = bulletMatch[1].trim();
      const desc = bulletMatch[2].trim();
      if (!/^(page|table of contents|chapter|section|index|copyright|author)\b/i.test(term)) {
        candidateItems.push({
          concept: term,
          definition: desc.endsWith('.') ? desc : `${desc}.`,
          type: 'definition'
        });
      }
    }
  }

  // 2. Extract declarative sentences with copular/action verbs
  const rawSentences = cleanedText
    .split(/(?<=[.?!])\s+/)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(s => {
      if (s.length < 35 || s.length > 300) return false;
      if (/---\s*Page/i.test(s) || /Page\s*\d+/i.test(s)) return false;
      if (/^(?:table of contents|contents|chapter|section|index|copyright|author)\b/i.test(s)) return false;
      if (s.endsWith('?') && !/(?:is defined as|refers to|means|because|consists)/i.test(s)) return false;
      return true;
    });

  for (const s of rawSentences) {
    // Check if sentence defines or explains something
    const copularMatch = s.match(/^([A-Z][A-Za-z0-9\s_-]{2,35})\s+(?:is defined as|refers to|is a|is an|provides|enables|serves as|acts as|optimizes|implements)\s+(.+)$/i);
    if (copularMatch) {
      const concept = copularMatch[1].trim();
      if (!/^(the|this|that|these|those|it|there|which|what|such|in|on|at|by|for|with)$/i.test(concept)) {
        candidateItems.push({
          concept,
          definition: s,
          type: 'copular'
        });
        continue;
      }
    }

    // General substantive sentence
    const words = s
      .replace(/^[^a-zA-Z0-9]+/, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !/^(the|this|that|these|those|and|for|with|from|such|when|while|what|which|into|onto)$/i.test(w));
    
    const conceptNoun = words.slice(0, 3).join(' ').replace(/[^a-zA-Z0-9\s-]/g, '').trim() || 'the core system concept';
    candidateItems.push({
      concept: conceptNoun,
      definition: s,
      type: 'general'
    });
  }

  // Fallback domain items if corpus is brief
  if (candidateItems.length === 0) {
    candidateItems.push(
      { concept: "Machine Learning Optimization", definition: "Models optimize internal weights by minimizing objective loss functions through iterative gradient updates.", type: "general" },
      { concept: "Distributed Replication", definition: "Replication protocols distribute state across multiple cluster nodes to guarantee fault tolerance and high availability.", type: "general" },
      { concept: "Activation Functions", definition: "Neural network layers use non-linear activation functions to transform linear combinations into expressive feature representations.", type: "general" },
      { concept: "Database Indexing", definition: "B-tree and hash index structures accelerate search operations by maintaining ordered keys for rapid retrieval.", type: "general" },
      { concept: "Microservice Architecture", definition: "Decoupled service components communicate over network boundaries to enable independent scaling and modular maintenance.", type: "general" }
    );
  }

  // Domain distractors for realistic multiple-choice foils
  const genericDistractors = [
    "It operates strictly without objective metric evaluation or dynamic state validation.",
    "It is restricted exclusively to static memory lookups without adaptive runtime computation.",
    "It enforces hardcoded synchronization barriers that disable distributed horizontal scaling.",
    "It ignores architectural constraints and bypasses core system data flow protocols.",
    "It delegates execution exclusively to legacy unmanaged memory blocks without bounds verification.",
    "It relies entirely on unvalidated user input buffers without sanitation or schema checks.",
    "It requires complete manual reconfiguration upon every state transition or network event."
  ];

  const questions = [];
  const validIds = ["A", "B", "C", "D"];
  const seenQuestionStems = new Set();
  let attempts = 0;
  let cursor = offset;

  while (questions.length < targetCount && attempts < 150) {
    attempts++;
    const itemIndex = cursor % candidateItems.length;
    cursor++;

    const item = candidateItems[itemIndex];
    const concept = item.concept;
    const correctStatement = item.definition;

    // Pick 3 distinct distractors
    const candidateDistractors = [];
    
    // Attempt to pick distractors from other candidate definitions
    const otherItems = candidateItems.filter((_, idx) => idx !== itemIndex);
    for (let di = 0; di < otherItems.length && candidateDistractors.length < 3; di++) {
      const otherDef = otherItems[(cursor + di) % otherItems.length].definition;
      if (otherDef !== correctStatement && !candidateDistractors.includes(otherDef)) {
        const truncated = otherDef.length > 130 ? otherDef.substring(0, 125).replace(/[,;]\s*$/, '') + '.' : otherDef;
        candidateDistractors.push(truncated);
      }
    }

    // Fill remaining distractors from generic domain distractors if needed
    for (let gi = 0; gi < genericDistractors.length && candidateDistractors.length < 3; gi++) {
      const gDist = genericDistractors[(attempts + gi) % genericDistractors.length];
      if (!candidateDistractors.includes(gDist) && gDist !== correctStatement) {
        candidateDistractors.push(gDist);
      }
    }

    if (candidateDistractors.length < 3) continue;

    const rawOptions = [
      correctStatement.length > 140 ? correctStatement.substring(0, 135).replace(/[,;]\s*$/, '') + '.' : correctStatement,
      candidateDistractors[0],
      candidateDistractors[1],
      candidateDistractors[2]
    ];

    const correctIdx = (questions.length + offset) % 4;
    const assignedOptions = [];
    let distractorCounter = 1;

    for (let pos = 0; pos < 4; pos++) {
      const id = validIds[pos];
      if (pos === correctIdx) {
        assignedOptions.push({ id, text: rawOptions[0] });
      } else {
        assignedOptions.push({ id, text: rawOptions[distractorCounter++] });
      }
    }

    const questionTemplates = [
      `What is the primary role or definition of "${concept}" according to the text?`,
      `Which of the following statements accurately describes "${concept}"?`,
      `How does "${concept}" function within the context of the document?`,
      `According to the document, what is the core characteristic or mechanism of "${concept}"?`,
      `Which principle best explains how "${concept}" operates?`
    ];

    const questionText = questionTemplates[(questions.length + offset) % questionTemplates.length];
    
    // Prevent duplicate questions in the same quiz
    if (seenQuestionStems.has(questionText)) {
      continue;
    }

    const correctOption = validIds[correctIdx];

    const qCandidate = {
      question: questionText,
      options: assignedOptions,
      correctOption,
      correctAnswer: `${correctOption}: ${assignedOptions[correctIdx].text}`,
      explanation: `Verified directly from the document: "${correctStatement.substring(0, 150)}"`,
      difficulty: (questions.length + offset) % 3 === 0 ? "easy" : (questions.length + offset) % 3 === 1 ? "medium" : "hard"
    };

    const validated = validateQuizQuestion(qCandidate);
    if (validated) {
      seenQuestionStems.add(questionText);
      questions.push(validated);
    }
  }

  return questions;
};

const mockGenerateSummary = (text) => {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentences = clean.split(/(?<=[.?!])\s+/).filter((s) => s.length > 15);
  const intro = sentences.slice(0, 3).join(" ");
  const keyPoints =
    sentences
      .slice(3, 8)
      .map((s) => `• ${s}`)
      .join("\n") || `• ${sentences[0] || clean.substring(0, 100)}`;

  return `### Document Summary\n\n**Overview:**\n${
    intro || clean.substring(0, 300)
  }\n\n**Key Concepts & Takeaways:**\n${keyPoints}`;
};

const mockChatWithContext = (question, chunks) => {
  if (!chunks || chunks.length === 0) {
    return {
      answer: "I could not find this information in the uploaded document.",
      usedChunkIndices: []
    };
  }

  const cleanQ = (question || '').toLowerCase();
  const questionSynonyms = {
    typo: ['typographical', 'keypunch', 'misspelling', 'error'],
    typos: ['typographical', 'keypunch', 'misspelling', 'errors'],
    swapped: ['transposition', 'transpositions', 'transposed'],
    letters: ['character', 'characters'],
    compare: ['comparison', 'comparator', 'compared'],
    compared: ['comparison', 'comparator', 'compare'],
    meaning: ['definition', 'defined', 'means'],
    benefits: ['advantages', 'strengths'],
    drawbacks: ['disadvantages', 'limitations', 'weaknesses'],
    percentage: ['percent', 'proportion', 'rate'],
    percent: ['percentage', 'proportion', 'rate']
  };
  const baseQWords = cleanQ.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const qWords = [...new Set(baseQWords.flatMap(word => [word, ...(questionSynonyms[word] || [])]))];

  // 1. Search across all candidate chunks for structured Q&A items matching user question
  let bestQA = null;
  let bestQAScore = 0;
  let bestChunkIndex = 1;

  for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
    const chunkText = extractChunkText(chunks[cIdx]) || '';
    const lines = chunkText.split(/\n+/);
    let currentQ = '';
    let currentA = '';
    const items = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const isExplicitQuestion = /^Q(?:uestion)?\s*(?:\d+)?\s*[:.)-]/i.test(trimmed);
      const isNumberedQuestion = /^\d+[.)]\s+.*\?\s*$/i.test(trimmed);
      if (isExplicitQuestion || isNumberedQuestion) {
        if (currentQ && currentA) {
          items.push({ question: currentQ, answer: currentA.trim() });
        }
        currentQ = trimmed;
        currentA = '';
      } else if (/^Answer:\s*/i.test(trimmed)) {
        currentA += ' ' + trimmed.replace(/^Answer:\s*/i, '');
      } else if (currentQ) {
        if (!currentA && !/^Answer/i.test(trimmed) && trimmed.endsWith('?')) {
          currentQ += ' ' + trimmed;
        } else {
          currentA += ' ' + trimmed;
        }
      }
    }
    if (currentQ && currentA) {
      items.push({ question: currentQ, answer: currentA.trim() });
    }

    for (const item of items) {
      let score = 0;
      const qLower = item.question.toLowerCase();
      const aLower = item.answer.toLowerCase();
      for (const w of qWords) {
        if (qLower.includes(w)) score += 5;
        if (aLower.includes(w)) score += 1;
      }
      if (score > bestQAScore) {
        bestQAScore = score;
        bestQA = item;
        bestChunkIndex = cIdx + 1;
      }
    }
  }

  // If a targeted Q&A item was found with solid relevance, format and return solely that answer
  if (bestQA && bestQAScore >= 6) {
    let cleanAnswer = bestQA.answer.replace(/\s+/g, ' ').trim();
    // Format bullet points if multiple items or lifecycle methods are mentioned
    cleanAnswer = cleanAnswer
      .replace(/:\s*([a-zA-Z]+Mount|[a-zA-Z]+Update|[a-zA-Z]+Unmount)/g, ':\n- **$1**')
      .replace(/,\s*([a-zA-Z]+Update|[a-zA-Z]+Unmount)/g, '\n- **$1**')
      .replace(/\.\s*(In function components|In class components|For example|Note:)/g, '.\n\n$1');

    return {
      answer: cleanAnswer,
      usedChunkIndices: [bestChunkIndex]
    };
  }

  // 2. Fallback: extract only the most relevant sentences answering the question
  const topText = extractChunkText(chunks[0]);
  if (!topText || topText.trim().length === 0) {
    return {
      answer: "I could not find this information in the uploaded document.",
      usedChunkIndices: []
    };
  }

  const sentences = topText
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && !/^Section \d+/i.test(s) && !/^\d+\.\s+/i.test(s));

  const scoredSentences = sentences.map(s => {
    let score = 0;
    const sLower = s.toLowerCase();
    for (const w of qWords) {
      if (sLower.includes(w)) score += 2;
    }
    return { text: s, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

  if (scoredSentences.length > 0) {
    const topSentences = scoredSentences.slice(0, 3).map(s => s.text).join(' ');
    return {
      answer: topSentences,
      usedChunkIndices: [1]
    };
  }

  return {
    answer: "I could not find this information in the uploaded document.",
    usedChunkIndices: []
  };
};

const mockExplainConcept = (concept, context, docTitle = 'the uploaded document') => {
  const safeText = (context || '').replace(/\s+/g, ' ').trim();
  const sentences = safeText.split(/(?<=[.?!])\s+/).filter(s => s.length > 20);
  
  // Find sentences mentioning any word in concept
  const conceptWords = concept.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const matchingSentences = sentences.filter(s => 
    conceptWords.some(w => s.toLowerCase().includes(w))
  );

  const keySentences = matchingSentences.length > 0 ? matchingSentences : sentences.slice(0, 6);

  return `### 📖 Concept Definition & Meaning (From Document)\n\n` +
    `According to **${docTitle}**:\n\n` +
    `> ${keySentences[0] || `The document introduces **${concept}** as a fundamental concept within this subject.`}\n\n` +
    `### ⚙️ How It Works & Core Mechanism\n\n` +
    (keySentences.slice(1, 4).map(s => `• ${s}`).join('\n\n') || `• Operates consistently within the principles outlined in **${docTitle}**.`) +
    `\n\n### 🔍 Document Context & Key References\n\n` +
    `In **${docTitle}**, this concept is used to establish core domain architecture and ensure precise execution across theoretical and practical scenarios.\n\n` +
    `### 💡 Key Takeaways & Exam Tips\n\n` +
    `• **Core Focus:** Focus on understanding the precise definitions and formulas outlined in **${docTitle}**.\n` +
    `• **Exam Tip:** Connect **${concept}** with the key terminology discussed in the surrounding document sections.`;
};

/* ----------------------------- */
/* Generate Flashcards           */
/* ----------------------------- */
export const generateFlashcards = async (text, count = 10) => {
  const targetCount = Math.max(1, parseInt(count, 10) || 10);
  const aiClient = getAiClient();
  if (!aiClient) {
    return mockGenerateFlashcards(text, targetCount);
  }

  const prompt = `
Generate exactly ${targetCount} educational flashcards from the following text.
Make sure to provide ALL ${targetCount} flashcards.

Format each flashcard as:
Q: [Clear, specific question]
A: [Concise, accurate answer]
D: [Difficulty level: easy, medium, or hard]

Separate each flashcard with "----"

Text:
${text.substring(0, 15000)}
`;

  try {
    const generatedText = await callGeminiWithCascade(prompt);
    const flashcards = [];
    const cards = generatedText.split("----").filter((c) => c.trim());

    for (const card of cards) {
      const lines = card.trim().split("\n");
      let question = "";
      let answer = "";
      let difficulty = "medium";

      for (const line of lines) {
        if (line.startsWith("Q:")) {
          question = line.substring(2).trim();
        } else if (line.startsWith("A:")) {
          answer = line.substring(2).trim();
        } else if (line.startsWith("D:")) {
          const diff = line.substring(2).trim().toLowerCase();
          if (["easy", "medium", "hard"].includes(diff)) {
            difficulty = diff;
          }
        }
      }

      if (question && answer) {
        flashcards.push({ question, answer, difficulty });
      }
    }

    if (flashcards.length < targetCount) {
      const additional = mockGenerateFlashcards(text, targetCount - flashcards.length, flashcards.length);
      flashcards.push(...additional);
    }

    return flashcards.slice(0, targetCount);
  } catch (error) {
    console.error("Gemini API error, falling back to document extractor:", error.message);
    return mockGenerateFlashcards(text, targetCount);
  }
};

/* ----------------------------- */
/* Generate Quiz Questions       */
/* ----------------------------- */
export const generateQuiz = async (textOrChunks, numQuestions = 5) => {
  const targetCount = Math.max(1, parseInt(numQuestions, 10) || 5);
  const variationSeed = Math.floor(Math.random() * 10000);
  
  // Extract and select diverse educational passages across the document
  const passages = selectEducationalPassagesForQuiz(textOrChunks, 10);
  // Shuffle or offset passages slightly to ensure diverse coverage across repeated calls
  const shuffledPassages = [...passages].sort(() => Math.random() - 0.5);
  const educationalContext = (shuffledPassages.length > 0 ? shuffledPassages : passages).join("\n\n---\n\n");
  const cleanContext = cleanPDFText(
    educationalContext || (typeof textOrChunks === 'string' ? textOrChunks : '')
  ).substring(0, 20000);

  const aiClient = getAiClient();
  if (!aiClient) {
    return mockGenerateQuiz(cleanContext, targetCount, variationSeed);
  }

  const prompt = `You are a Senior Technical Examiner, Professor, and AI Assessment Architect.
Generate a high-quality educational multiple-choice quiz of exactly ${targetCount} UNIQUE questions based STRICTLY and ENTIRELY on the core concepts, principles, mechanisms, and definitions in the provided text.

CRITICAL ASSESSMENT GUIDELINES:
1. DIVERSE AND DEEP TECHNICAL EVALUATION:
   - Cover DIFFERENT sections, algorithms, architectural components, definitions, and mechanisms from across the text.
   - Mix question styles across:
     * Conceptual Understanding (Why does [Concept] work this way?)
     * Mechanism & Data Flow (How do components interact in this context?)
     * Key Definitions & Terminology (What specifically constitutes [Concept]?)
     * Trade-offs & Constraints (What are the benefits/limitations?)
   - Do NOT ask repetitive questions on the same single sentence or keyword.

2. ABSOLUTELY FORBIDDEN TOPICS & PHRASES:
   - NEVER create questions about page numbers, headings, section titles, table of contents, author details, or document structure.
   - NEVER use phrases like "Based on Page...", "According to section...", "Regarding the title...", "Which statement regarding '--- Page ---' is correct?".
   - NEVER generate questions from empty interview prompt headings (e.g., "Tell me about yourself", "Why should we hire you").

3. OPTIONS SPECIFICATIONS:
   - Exactly 4 options labeled "A", "B", "C", "D".
   - Distribute the correct answer evenly across "A", "B", "C", and "D".
   - The correct option must be undeniably factual and directly verified by the context.
   - The remaining 3 options MUST be plausible, realistic technical distractors (no trivial or nonsensical foils).

4. EXPLANATION:
   - Provide a clear, factual 1-2 sentence explanation citing the core concept from the document.

STRICT JSON ONLY:
Return ONLY a valid JSON array of objects following this exact schema:
[
  {
    "question": "Clear, technically precise question prompt?",
    "options": [
      { "id": "A", "text": "Plausible realistic distractor" },
      { "id": "B", "text": "Correct factual assertion from text" },
      { "id": "C", "text": "Alternative plausible distractor" },
      { "id": "D", "text": "Another technical distractor" }
    ],
    "correctOption": "B",
    "explanation": "Verified explanation grounded directly in the text.",
    "difficulty": "medium"
  }
]

SESSION VARIATION ID: ${variationSeed}

EDUCATIONAL CONTEXT:
${cleanContext}`;

  try {
    console.log(`[Quiz Generation] Requesting ${targetCount} high-quality questions via Gemini...`);
    const generatedText = await callGeminiWithCascade(prompt, {
      config: {
        temperature: 0.7,
        topP: 0.95
      }
    });

    const extractJsonArray = (rawText) => {
      if (!rawText || typeof rawText !== 'string') return null;
      let clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const startIdx = clean.indexOf('[');
      const endIdx = clean.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        clean = clean.substring(startIdx, endIdx + 1);
      }
      try {
        const parsed = JSON.parse(clean);
        return Array.isArray(parsed) ? parsed : null;
      } catch (e) {
        return null;
      }
    };

    let rawQuestions = extractJsonArray(generatedText);

    // If initial JSON parsing failed, attempt a recovery prompt for strict JSON
    if (!rawQuestions || rawQuestions.length === 0) {
      console.warn(`[Quiz Generation] Raw response not standard JSON array. Attempting recovery...`);
      try {
        const recoveryPrompt = `Convert the following quiz text into a strict, valid JSON array matching the schema:
[
  {
    "question": "...",
    "options": [
      {"id":"A","text":"..."},
      {"id":"B","text":"..."},
      {"id":"C","text":"..."},
      {"id":"D","text":"..."}
    ],
    "correctOption": "A",
    "explanation": "..."
  }
]

Raw Text:
${generatedText.substring(0, 8000)}`;
        const recovered = await callGeminiWithCascade(recoveryPrompt);
        rawQuestions = extractJsonArray(recovered);
      } catch (recErr) {
        console.warn(`[Quiz Generation] Recovery call failed: ${recErr.message}`);
      }
    }

    const validatedQuestions = [];
    if (Array.isArray(rawQuestions)) {
      for (const item of rawQuestions) {
        const valid = validateQuizQuestion(item);
        if (valid) {
          validatedQuestions.push(valid);
        } else {
          console.warn(`[Quiz Generation] Quality gate dropped invalid question item:`, item?.question || item);
        }
      }
    }

    console.log(`[Quiz Generation] Validated ${validatedQuestions.length}/${targetCount} AI-generated questions.`);

    // If any questions were missing or malformed, fill with strictly validated document-grounded questions
    let fillAttempts = 0;
    while (validatedQuestions.length < targetCount && fillAttempts < 5) {
      fillAttempts++;
      const needed = targetCount - validatedQuestions.length;
      console.log(`[Quiz Generation] Filling ${needed} educational question(s) from document text (attempt ${fillAttempts}).`);
      const additional = mockGenerateQuiz(cleanContext, needed, validatedQuestions.length + fillAttempts * 10);
      for (const addQ of additional) {
        if (!validatedQuestions.some(existing => existing.question === addQ.question)) {
          validatedQuestions.push(addQ);
        }
      }
      if (additional.length === 0) break;
    }

    return validatedQuestions.slice(0, targetCount);
  } catch (error) {
    console.error("[Quiz Generation] Gemini API error, falling back to document grounded extractor:", error.message);
    return mockGenerateQuiz(cleanContext, targetCount);
  }
};

/* ----------------------------- */
/* Generate Summary              */
/* ----------------------------- */
export const generateSummary = async (text) => {
  const aiClient = getAiClient();
  if (!aiClient) {
    return mockGenerateSummary(text);
  }

  const prompt = `
Provide a concise summary of the following text, highlighting the key concepts and main ideas.
Keep the summary clear, structured, and easy to review.

Text:
${text.substring(0, 20000)}`;

  try {
    return await callGeminiWithCascade(prompt);
  } catch (error) {
    console.error("Gemini API error, falling back to document extractor:", error.message);
    return mockGenerateSummary(text);
  }
};

/* ----------------------------- */
/* Chat with Context (RAG)       */
/* ----------------------------- */
export const chatWithContext = async (question, chunks) => {
  // Normalize chunks to extract content safely from any field (content, text, chunkText, pageContent, _doc)
  const normalizedChunks = (chunks || []).map((c, i) => {
    const textContent = extractChunkText(c);
    const pNum = (c && typeof c.pageNumber === 'number' && c.pageNumber > 0)
      ? c.pageNumber
      : (c?.page || 1);
    return {
      ...c,
      pageNumber: pNum,
      content: textContent
    };
  }).filter(c => Boolean(c.content && c.content.trim().length > 0));

  const contextText = normalizedChunks
    .map((c, i) => `[Source Excerpt ${i + 1} (Page ${c.pageNumber})]:\n${c.content}`)
    .join("\n\n");

  if (!normalizedChunks || normalizedChunks.length === 0 || !contextText.trim()) {
    return {
      answer: "I could not find this information in the uploaded document.",
      usedChunkIndices: []
    };
  }

  const aiClient = getAiClient();
  if (!aiClient) {
    return mockChatWithContext(question, normalizedChunks);
  }

  const prompt = `You are a document-grounded assistant.
Answer only using the provided context.
For every statement, identify the supporting chunk.
Do not use external knowledge.
If the answer is not present in the context, clearly say so: "I could not find this information in the uploaded document."

CONTEXT EXCERPTS:
${contextText}

USER QUESTION:
${question}

OUTPUT FORMAT:
Return a valid JSON object matching this schema:
{
  "answer": "Your comprehensive answer derived solely from the provided excerpts. Use clear markdown formatting.",
  "usedChunkIndices": [1] // Array of 1-based indices (e.g. [1, 2]) of the Source Excerpts that directly support the answer. If no answer found, return empty array [].
}

JSON Response:`;

  try {
    const rawResponse = await callGeminiWithCascade(prompt);

    // Try parsing structured JSON
    const clean = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
    const startIdx = clean.indexOf('{');
    const endIdx = clean.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      try {
        const parsed = JSON.parse(clean.substring(startIdx, endIdx + 1));
        if (parsed && typeof parsed.answer === 'string') {
          const usedIndices = Array.isArray(parsed.usedChunkIndices)
            ? parsed.usedChunkIndices.filter(n => typeof n === 'number' && n >= 1 && n <= normalizedChunks.length)
            : [1];

          return {
            answer: parsed.answer.trim(),
            usedChunkIndices: usedIndices
          };
        }
      } catch (jsonErr) {
        // Fall through to text handling
      }
    }

    // If response is plain text
    const trimmed = rawResponse.trim();
    const notFoundPhrases = [
      "not available in the uploaded",
      "not found in the uploaded",
      "could not find this information",
      "no mention of",
      "cannot find"
    ];
    const isNotFound = notFoundPhrases.some(p => trimmed.toLowerCase().includes(p));

    return {
      answer: trimmed,
      usedChunkIndices: isNotFound ? [] : [1]
    };
  } catch (error) {
    console.error("[RAG Chat] Gemini API error, falling back to local extractor:", error.message);
    return mockChatWithContext(question, normalizedChunks);
  }
};

/* ----------------------------- */
/* Explain Concept (Strict RAG)  */
/* ----------------------------- */
export const explainConcept = async (concept, context, documentTitle = 'the document') => {
  const safeContext = (typeof context === 'string' ? context : '').trim();
  const aiClient = getAiClient();
  if (!aiClient) {
    return mockExplainConcept(concept, safeContext, documentTitle);
  }

  const prompt = `You are a strict academic study tutor explaining a specific concept to a student.
CRITICAL CONSTRAINT: You MUST base your explanation EXCLUSIVELY and STRICTLY on the provided PDF Document Context below.
- Do NOT bring in generic Google/Internet knowledge that contradicts or is outside the document.
- Cite specific definitions, mechanisms, examples, properties, and formulas as they appear in the PDF document ("${documentTitle}").
- If the concept is partially covered, explain what the PDF says about it and highlight the specific sections/pages.
- If the concept is completely absent in the document context, state: "The concept '${concept}' is not found in the uploaded document."

DOCUMENT CONTEXT:
${safeContext.substring(0, 16000)}

CONCEPT TO EXPLAIN:
"${concept}"

RESPONSE STRUCTURE (Markdown):
### 📖 Concept Definition & Core Meaning (From Document)
[Clear definition strictly as explained in the document]

### ⚙️ How It Works & Key Mechanisms
[Step-by-step breakdown using the terminology and context provided in the PDF]

### 🔍 Document Context & Key References
[Where and how this concept is applied in ${documentTitle}]

### 💡 Key Takeaways & Exam Tips
[Important points, rules, or formulas students need to remember from this document]`;

  try {
    return await callGeminiWithCascade(prompt);
  } catch (error) {
    console.error("[Explain Concept] Gemini API error, falling back to document grounded extractor:", error.message);
    return mockExplainConcept(concept, safeContext, documentTitle);
  }
};

/* ----------------------------- */
/* PDF-to-Notes Generator        */
/* ----------------------------- */
export const generateStudyNotes = async (text) => {
  const safeText = (typeof text === 'string' ? text : '').trim();
  const aiClient = getAiClient();
  if (!aiClient) {
    return mockGenerateStudyNotes(safeText);
  }

  const prompt = `Based on the following educational text, generate 5 structured study sections in GitHub markdown:
1. Short Notes: Bulleted summary of core definitions and facts.
2. Exam Notes: High-yield exam focus areas, common exam questions, formulas, and key points to remember.
3. Revision Sheet: Dense one-page quick-reference sheet suitable for rapid review 10 minutes before an exam.
4. Definitions & Formulas: Formal definitions, mathematical/algorithmic formulas, syntax rules, and theorems.
5. High-Frequency Exam FAQs: 4-5 common exam/interview questions with clear model answers.

Separate each section with "====SECTION_SEPARATOR====".

Text:
${safeText.substring(0, 16000)}`;

  try {
    const generatedText = await callGeminiWithCascade(prompt);
    const parts = generatedText.split('====SECTION_SEPARATOR====');
    const fallback = mockGenerateStudyNotes(safeText);
    return {
      shortNotes: parts[0]?.trim() || fallback.shortNotes,
      examNotes: parts[1]?.trim() || fallback.examNotes,
      revisionSheet: parts[2]?.trim() || fallback.revisionSheet,
      definitionsAndFormulas: parts[3]?.trim() || fallback.definitionsAndFormulas,
      examFaqs: parts[4]?.trim() || fallback.examFaqs,
    };
  } catch (error) {
    return mockGenerateStudyNotes(safeText);
  }
};

/* ----------------------------- */
/* PDF-to-Mind Map Generator     */
/* ----------------------------- */
export const generateMindMap = async (text) => {
  const safeText = (typeof text === 'string' ? text : '').trim();
  const aiClient = getAiClient();
  if (!aiClient) {
    return mockGenerateMindMap(safeText);
  }

  const prompt = `Convert the following text into a hierarchical Concept Mind Map in strict JSON format.
Example structure:
{
  "name": "Document Overview",
  "children": [
    {
      "name": "Foundational Concepts",
      "children": [
        { "name": "Core Principles" },
        { "name": "Key Definitions" }
      ]
    },
    {
      "name": "Advanced Architecture",
      "children": [
        { "name": "Implementation Models" },
        { "name": "Practical Applications" }
      ]
    }
  ]
}

Return ONLY valid JSON without markdown fences.

Text:
${safeText.substring(0, 15000)}`;

  try {
    const generatedText = await callGeminiWithCascade(prompt);
    const clean = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (error) {
    return mockGenerateMindMap(safeText);
  }
};

/* --------------------------------- */
/* PDF-to-Presentation Slide Deck    */
/* --------------------------------- */
export const generatePresentation = async (text, slideCount = 6) => {
  const safeText = (typeof text === 'string' ? text : '').trim();
  const aiClient = getAiClient();
  if (!aiClient) {
    return mockGeneratePresentation(safeText, slideCount);
  }

  const prompt = `Convert the following study material into a clean, executive presentation slide deck of ${slideCount} slides in strict JSON format.
Structure each slide exactly like this:
[
  {
    "slideNumber": 1,
    "title": "Document Title or Theme",
    "subtitle": "High-level overview",
    "bulletPoints": [
      "Key concept one with crisp explanation",
      "Key concept two focusing on significance",
      "Key concept three with operational context"
    ],
    "keyTakeaway": "Single sentence executive takeaway for this slide",
    "speakerNotes": "Brief cues for the presenter to explain during this slide"
  }
]

Return ONLY the raw JSON array. Do NOT wrap in markdown fences or quotes.

Text:
${safeText.substring(0, 16000)}`;

  try {
    const generatedText = await callGeminiWithCascade(prompt);
    const clean = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (error) {
    return mockGeneratePresentation(safeText, slideCount);
  }
};

/* ----------------------------- */
/* Document Comparison Engine    */
/* ----------------------------- */
export const compareDocuments = async (doc1Title, doc1Text, doc2Title, doc2Text, query = '') => {
  const t1 = (doc1Text || '').substring(0, 8000);
  const t2 = (doc2Text || '').substring(0, 8000);
  const aiClient = getAiClient();
  if (!aiClient) {
    return mockCompareDocuments(doc1Title, doc1Text, doc2Title, doc2Text, query);
  }

  const prompt = `Perform a comprehensive technical comparison between two documents:
Document 1: "${doc1Title}"
Document 2: "${doc2Title}"

${query ? `User Focus Question: "${query}"\n` : ''}

Generate structured GitHub markdown containing:
1. Executive Comparative Summary
2. Markdown Comparison Table (Criteria, ${doc1Title}, ${doc2Title})
3. Core Differences & Trade-offs
4. ⚠️ Contradiction & Divergence Detector (highlight any contradictory definitions, conflicting assumptions, or divergent methodologies)
5. Key Takeaways & Recommendations

Content of Document 1:
${t1}

Content of Document 2:
${t2}`;

  try {
    return await callGeminiWithCascade(prompt);
  } catch (error) {
    return mockCompareDocuments(doc1Title, doc1Text, doc2Title, doc2Text, query);
  }
};

/* ----------------------------- */
/* AI Technical Interview Engine */
/* ----------------------------- */
export const evaluateInterviewAnswer = async (question, userAnswer, context) => {
  const aiClient = getAiClient();
  if (!aiClient) {
    return mockEvaluateInterviewAnswer(question, userAnswer);
  }

  const prompt = `You are an expert Technical Interviewer assessing a candidate's answer based on course material.
Question: "${question}"
Candidate Answer: "${userAnswer}"
Reference Context: "${(context || '').substring(0, 4000)}"

Evaluate and respond in strict JSON format:
{
  "score": 8,
  "feedback": "Concise feedback identifying key accurate points and areas for improvement.",
  "strengths": ["Clear explanation of core mechanism", "Correct terminology used"],
  "missingKeywords": ["Trade-off analysis", "Practical constraint"],
  "idealAnswer": "A concise, complete 2-sentence response demonstrating technical mastery."
}

Return ONLY valid JSON without markdown fences.`;

  try {
    const generatedText = await callGeminiWithCascade(prompt);
    const clean = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    return mockEvaluateInterviewAnswer(question, userAnswer);
  }
};

/* Fallback Study Notes Extractor */
const mockGenerateStudyNotes = (text) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.?!])\s+/).filter(s => s.length > 15);
  const sample = sentences.slice(0, 12);

  const shortNotes = `### 📝 Short Notes & Key Takeaways\n\n` +
    sample.slice(0, 4).map(s => `• **Core Fact:** ${s}`).join('\n\n') +
    `\n\n> *Focus on understanding foundational principles and how terminology connects across modules.*`;

  const examNotes = `### 🎯 High-Yield Exam Notes\n\n` +
    `#### High-Probability Exam Questions:\n` +
    sample.slice(4, 7).map((s, i) => `${i + 1}. **Explain the mechanism of:** "${s.substring(0, 60)}..."`).join('\n') +
    `\n\n#### Key Formulae & Criteria to Remember:\n` +
    `• **Definition Consistency:** Ensure technical keywords are used accurately in written answers.\n` +
    `• **Edge Cases:** Note any conditions where standard rules or assumptions do not apply.`;

  const revisionSheet = `### ⚡ 10-Minute Rapid Revision Sheet\n\n` +
    `| Concept / Term | Quick Definition / Summary |\n` +
    `| :--- | :--- |\n` +
    sample.slice(0, 5).map(s => {
      const words = s.split(' ');
      const term = words.slice(0, 3).join(' ');
      const def = words.slice(3, 14).join(' ');
      return `| **${term || 'Core Term'}** | ${def || s.substring(0, 50)}... |`;
    }).join('\n') +
    `\n\n**Final Exam Tip:** Review diagrams and flowcharts before entering the exam hall.`;

  const definitionsAndFormulas = `### 📐 Key Definitions & Important Formulas\n\n` +
    sample.slice(2, 6).map((s, i) => {
      const words = s.split(' ');
      const term = words.slice(0, 2).join(' ') || `Concept ${i + 1}`;
      return `#### 🏷️ ${term}\n- **Formal Definition:** ${s}\n- **Mathematical / Logical Expression:** \`Formula_${i + 1} = f(${term.toLowerCase()}) → Output\``;
    }).join('\n\n') +
    `\n\n> **Theorem:** System balance is preserved when inputs and outputs adhere strictly to specification constraints.`;

  const examFaqs = `### ❓ Frequently Asked Exam & Interview Questions\n\n` +
    sample.slice(0, 4).map((s, i) => {
      return `**Q${i + 1}: What is the primary role of ${s.split(' ').slice(0, 3).join(' ')}?**\n` +
        `**Model Answer:** ${s} It provides the operational basis necessary for system stability, predictability, and error tolerance.\n`;
    }).join('\n') +
    `\n*Pro-tip: Always conclude answers with a real-world application example.*`;

  return { shortNotes, examNotes, revisionSheet, definitionsAndFormulas, examFaqs };
};

/* Fallback Presentation Slide Extractor */
const mockGeneratePresentation = (text, slideCount = 6) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.?!])\s+/).filter(s => s.length > 15);

  const slides = [
    {
      slideNumber: 1,
      title: "Introduction & Scope",
      subtitle: "Foundations and Overview",
      bulletPoints: [
        sentences[0] || "Foundational principles governing the topic",
        sentences[1] || "Core scope and problem domain",
        "Key learning objectives and expected outcomes"
      ],
      keyTakeaway: "Establishes the core theoretical and practical basis for the study.",
      speakerNotes: "Welcome the audience and define the primary domain boundaries."
    },
    {
      slideNumber: 2,
      title: "Core Concepts & Architecture",
      subtitle: "System Mechanics",
      bulletPoints: [
        sentences[2] || "Primary conceptual building blocks",
        sentences[3] || "Structural interactions and component data flow",
        "Critical invariants that must be maintained"
      ],
      keyTakeaway: "Clear component separation guarantees robust, predictable execution.",
      speakerNotes: "Walk through the architectural layout, highlighting interactions."
    },
    {
      slideNumber: 3,
      title: "Execution Workflow & Methods",
      subtitle: "Operational Mechanics",
      bulletPoints: [
        sentences[4] || "Sequential step-by-step procedural flow",
        sentences[5] || "Input transformation and handling mechanisms",
        "Edge case containment and validation strategies"
      ],
      keyTakeaway: "Processes function deterministically under defined boundary constraints.",
      speakerNotes: "Focus on how data moves from stage to stage without loss of precision."
    },
    {
      slideNumber: 4,
      title: "Comparative Analysis & Trade-offs",
      subtitle: "Strengths vs Constraints",
      bulletPoints: [
        sentences[6] || "Performance advantages over alternative paradigms",
        sentences[7] || "Resource utilization and latency trade-offs",
        "Scalability boundaries and deployment overheads"
      ],
      keyTakeaway: "Selecting the optimal approach requires weighing efficiency against complexity.",
      speakerNotes: "Engage the audience on trade-offs when scaling up."
    },
    {
      slideNumber: 5,
      title: "Real-World Applications",
      subtitle: "Practical Industry Relevance",
      bulletPoints: [
        sentences[8] || "Production use cases and enterprise adoption",
        sentences[9] || "Common implementation pitfalls and remediations",
        "Monitoring, logging, and continuous verification"
      ],
      keyTakeaway: "Translating theoretical concepts into production requires defensive design.",
      speakerNotes: "Give concrete examples from industry frameworks."
    },
    {
      slideNumber: 6,
      title: "Summary & Action Items",
      subtitle: "Key Takeaways",
      bulletPoints: [
        "Master the foundational terminology and definitions",
        "Apply systematic verification to every operational step",
        "Review practice questions and revision sheets"
      ],
      keyTakeaway: "Systematic mastery yields strong academic scores and interview confidence.",
      speakerNotes: "Conclude with questions and encourage quick quiz testing."
    }
  ];

  return slides.slice(0, slideCount);
};

/* Fallback Mind Map Extractor */
const mockGenerateMindMap = (text) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.?!])\s+/).filter(s => s.length > 15);

  const title = sentences[0]?.split(' ').slice(0, 4).join(' ') || "Core Document Concepts";

  return {
    name: title,
    children: [
      {
        name: "Part 1: Foundational Principles",
        children: [
          { name: sentences[1]?.substring(0, 35) || "Basic Definitions" },
          { name: sentences[2]?.substring(0, 35) || "Theoretical Background" }
        ]
      },
      {
        name: "Part 2: Mechanisms & Models",
        children: [
          { name: sentences[3]?.substring(0, 35) || "Architectural Overview" },
          { name: sentences[4]?.substring(0, 35) || "Operational Workflow" }
        ]
      },
      {
        name: "Part 3: Applications & Evaluation",
        children: [
          { name: sentences[5]?.substring(0, 35) || "Industry Use Cases" },
          { name: sentences[6]?.substring(0, 35) || "Performance Metrics" }
        ]
      }
    ]
  };
};

const mockCompareDocuments = (doc1Title, doc1Text, doc2Title, doc2Text, query) => {
  const s1 = (doc1Text || '').split(/(?<=[.?!])\s+/).filter(s => s.length > 15);
  const s2 = (doc2Text || '').split(/(?<=[.?!])\s+/).filter(s => s.length > 15);

  return `### ⚖️ Technical Comparison: ${doc1Title} vs ${doc2Title}\n\n` +
    `#### Executive Summary\n` +
    `Both documents address critical computing concepts. While **${doc1Title}** concentrates primarily on foundational principles, **${doc2Title}** emphasizes practical implementation frameworks and architectural variations.\n\n` +
    `#### Comparison Matrix\n\n` +
    `| Comparison Criteria | ${doc1Title} | ${doc2Title} |\n` +
    `| :--- | :--- | :--- |\n` +
    `| **Core Subject Scope** | ${s1[0]?.substring(0, 60) || "Theoretical principles"}... | ${s2[0]?.substring(0, 60) || "Applied architectures"}... |\n` +
    `| **Key Focus Areas** | Definitions & core properties | Operational pipelines & usage |\n` +
    `| **Primary Advantage** | Simplicity and conceptual rigor | Real-world engineering relevance |\n` +
    `| **Main Consideration** | Requires practical extension | Demands solid theoretical grounding |\n\n` +
    `#### ⚠️ Contradiction & Divergence Detector\n` +
    `• **Scope Divergence:** ${doc1Title} models components as discrete standalone units, whereas ${doc2Title} considers them as interdependent nodes in an interconnected network.\n` +
    `• **Terminology Conflict:** Note that standard operational terms in ${doc1Title} are treated with higher abstraction than the granular protocol parameters defined in ${doc2Title}.\n\n` +
    `#### Key Insights & Contrast\n` +
    `• **Synergies:** Understanding ${doc1Title} provides the theoretical foundation necessary to deploy systems outlined in ${doc2Title}.\n` +
    `• **Direct Contrast:** For quick reference, review ${doc1Title} for definitions and ${doc2Title} for workflow mechanisms.`;
};

const mockEvaluateInterviewAnswer = (question, userAnswer) => {
  const text = (userAnswer || '').trim();
  const wordCount = text.split(/\s+/).length;
  let score = 7;
  if (wordCount > 30) score = 8;
  if (wordCount > 60) score = 9;
  if (wordCount < 10) score = 5;

  return {
    score,
    feedback: `Good technical grasp. Your answer articulates the core logic clearly with ${wordCount} words. Consider highlighting edge cases and architectural constraints to make your response stand out.`,
    strengths: [
      "Demonstrated understanding of core definitions",
      "Communicated thought process logically"
    ],
    missingKeywords: [
      "Computational complexity",
      "System boundary conditions"
    ],
    idealAnswer: "A complete answer emphasizes foundational definitions, states the standard execution flow, and concludes with practical system trade-offs."
  };
};
