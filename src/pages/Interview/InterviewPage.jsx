import React, { useState, useEffect } from 'react'
import {
    Award,
    BookMarked,
    Mic,
    MicOff,
    ChevronRight,
    RotateCcw,
    Loader2,
    Briefcase,
} from 'lucide-react'
import PageHeader from '../../Components/common/PageHeader.jsx'
import Spinner from '../../Components/common/Spinner.jsx'
import documentService from '../../services/documentService.js'
import aiService from '../../services/aiService.js'
import toast from 'react-hot-toast'

const InterviewPage = () => {
    const [documents, setDocuments] = useState([])
    const [selectedDocId, setSelectedDocId] = useState('')
    const [docsLoading, setDocsLoading] = useState(true)

    // Interview session state
    const [sessionActive, setSessionActive] = useState(false)
    const [starting, setStarting] = useState(false)
    const [evaluating, setEvaluating] = useState(false)
    const [currentQuestion, setCurrentQuestion] = useState('')
    const [questionNumber, setQuestionNumber] = useState(1)
    const [totalQuestions, setTotalQuestions] = useState(4)
    const [userAnswer, setUserAnswer] = useState('')
    const [isListening, setIsListening] = useState(false)

    // Scorecard & completed responses
    const [evaluations, setEvaluations] = useState([])
    const [isCompleted, setIsCompleted] = useState(false)

    // Speech-to-Text Setup
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition()
            recognition.continuous = false
            recognition.interimResults = false
            recognition.lang = 'en-US'

            recognition.onresult = (e) => {
                const transcript = e.results[0][0].transcript
                setUserAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript))
                setIsListening(false)
            }
            recognition.onerror = () => setIsListening(false)
            recognition.onend = () => setIsListening(false)
            window._speechRec = recognition
        }
    }, [])

    const toggleVoice = () => {
        if (!window._speechRec) {
            toast.error('Voice dictation is supported in Chrome or Edge')
            return
        }
        if (isListening) {
            window._speechRec.stop()
            setIsListening(false)
        } else {
            try {
                window._speechRec.start()
                setIsListening(true)
                toast.success('Listening... State your technical answer clearly!')
            } catch {
                setIsListening(false)
            }
        }
    }

    // Load user's ready documents
    useEffect(() => {
        const fetchDocs = async () => {
            try {
                setDocsLoading(true)
                const res = await documentService.getDocuments()
                const docs = res?.data || res || []
                const ready = docs.filter((d) => d.status === 'ready')
                setDocuments(ready)
                if (ready.length > 0) {
                    setSelectedDocId(ready[0]._id)
                }
            } catch {
                toast.error('Failed to load documents for interview')
            } finally {
                setDocsLoading(false)
            }
        }
        fetchDocs()
    }, [])

    const handleStartInterview = async () => {
        if (!selectedDocId) {
            toast.error('Please select a document for the technical interview')
            return
        }
        setStarting(true)
        try {
            const res = await aiService.startInterview(selectedDocId)
            setCurrentQuestion(res.data.question)
            setQuestionNumber(res.data.questionNumber)
            setTotalQuestions(res.data.totalQuestions)
            setSessionActive(true)
            setIsCompleted(false)
            setEvaluations([])
            setUserAnswer('')
        } catch (err) {
            toast.error(err.message || 'Failed to start interview')
        } finally {
            setStarting(false)
        }
    }

    const handleSubmitAnswer = async (e) => {
        e.preventDefault()
        if (!userAnswer.trim()) return

        setEvaluating(true)
        try {
            const res = await aiService.answerInterviewQuestion({
                documentId: selectedDocId,
                question: currentQuestion,
                userAnswer: userAnswer.trim(),
                questionNumber,
                totalQuestions,
            })

            const evalData = res.data.evaluation
            const newHistoryItem = {
                questionNumber,
                question: currentQuestion,
                userAnswer: userAnswer.trim(),
                ...evalData,
            }

            setEvaluations((prev) => [...prev, newHistoryItem])
            setUserAnswer('')

            if (res.data.isCompleted) {
                setIsCompleted(true)
                toast.success('Technical Interview Completed! See your scorecard below.')
            } else {
                setCurrentQuestion(res.data.nextQuestion)
                setQuestionNumber(res.data.nextQuestionNumber)
            }
        } catch (err) {
            toast.error(err.message || 'Failed to evaluate answer')
        } finally {
            setEvaluating(false)
        }
    }

    const calculateOverallScore = () => {
        if (evaluations.length === 0) return 0
        const sum = evaluations.reduce((acc, curr) => acc + (curr.score || 0), 0)
        return Math.round((sum / (evaluations.length * 10)) * 100)
    }

    return (
        <div className="space-y-8">
            <PageHeader
                title="AI Technical Interviewer"
                subtitle="Practice mock technical interviews grounded in your study notes with real-time scoring, constructive critique, and voice modalities."
            />

            {/* Document Selection & Setup Card */}
            {!sessionActive && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm max-w-2xl mx-auto space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 flex items-center justify-center shadow-xs">
                            <Briefcase className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Prepare Technical Interview Session</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">The AI will conduct a 4-question technical screening based on your notes.</p>
                        </div>
                    </div>

                    {docsLoading ? (
                        <div className="py-6 flex justify-center">
                            <Spinner size="md" />
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs border border-amber-200 dark:border-amber-900/50">
                            Please upload and process at least one PDF in the Documents tab first.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Target Subject / Reference Notes:
                                </label>
                                <select
                                    value={selectedDocId}
                                    onChange={(e) => setSelectedDocId(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100"
                                >
                                    {documents.map((doc) => (
                                        <option key={doc._id} value={doc._id} className="dark:bg-slate-900 dark:text-slate-100">
                                            {doc.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                                <p className="font-semibold text-slate-800 dark:text-slate-200">What to expect:</p>
                                <p>• AI acts as a Senior Engineering Interviewer asking progressive technical questions.</p>
                                <p>• Speak with your microphone or type your responses.</p>
                                <p>• Receive question-by-question ratings (1–10), missing keywords, and an overall Readiness Scorecard.</p>
                            </div>

                            <button
                                onClick={handleStartInterview}
                                disabled={starting || !selectedDocId}
                                className="w-full py-3.5 rounded-xl bg-slate-900   text-white font-bold text-sm shadow-md hover: hover: transition flex items-center justify-center gap-2"
                            >
                                {starting ? <Loader2 className="h-5 w-5 animate-spin" /> : <BookMarked className="h-5 w-5" />}
                                <span>Start Technical Interview</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Active Interview Session */}
            {sessionActive && !isCompleted && (
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Progress indicator */}
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-2">
                        <span>Question {questionNumber} of {totalQuestions}</span>
                        <div className="h-2 w-48 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                                className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                                style={{ width: `${Math.round((questionNumber / totalQuestions) * 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Question Card */}
                    <div className="rounded-xl border border-blue-100 dark:border-blue-900/50 bg-slate-900   dark: dark: p-6 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                            <Briefcase className="h-4 w-4" />
                            <span>Interviewer Question #{questionNumber}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                            {currentQuestion}
                        </h3>
                    </div>

                    {/* Answer Form */}
                    <form onSubmit={handleSubmitAnswer} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Your Technical Response:</label>
                            <button
                                type="button"
                                onClick={toggleVoice}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                                    isListening
                                        ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            >
                                {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                                <span>{isListening ? 'Stop Recording' : 'Dictate with Voice'}</span>
                            </button>
                        </div>

                        <textarea
                            rows={5}
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            placeholder={isListening ? 'Listening to your voice...' : 'Type or dictate your structured technical explanation... Include core principles, execution steps, and practical constraints.'}
                            disabled={evaluating}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 leading-relaxed bg-slate-50/30 dark:bg-slate-950/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                        />

                        <div className="flex items-center justify-between pt-2">
                            <button
                                type="button"
                                onClick={() => setSessionActive(false)}
                                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
                            >
                                Exit Session
                            </button>

                            <button
                                type="submit"
                                disabled={evaluating || !userAnswer.trim()}
                                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm disabled:opacity-50 transition flex items-center gap-2"
                            >
                                {evaluating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Evaluating Answer...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Submit Answer</span>
                                        <ChevronRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Previous Evaluated Questions */}
                    {evaluations.length > 0 && (
                        <div className="space-y-4 pt-4">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Previous Question Evaluations:</h4>
                            {evaluations.map((ev, i) => (
                                <div key={i} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Question {ev.questionNumber}</span>
                                        <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                                            ev.score >= 8 
                                                ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60' 
                                                : ev.score >= 6 
                                                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60' 
                                                : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                                        }`}>
                                            Score: {ev.score}/10
                                        </span>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{ev.question}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">Interviewer Feedback: </span>
                                        {ev.feedback}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Final Performance Scorecard (When Completed) */}
            {isCompleted && (
                <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95">
                    {/* Scorecard Hero Banner */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900   text-white p-8 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                            <div>
                                <span className="text-xs font-bold text-blue-300">Interview Readiness Scorecard</span>
                                <h2 className="text-3xl font-extrabold mt-1">Overall Rating: {calculateOverallScore()}%</h2>
                                <p className="text-xs text-blue-200 mt-2">
                                    {calculateOverallScore() >= 80
                                        ? 'Strong technical mastery. Ready for a technical screening.'
                                        : calculateOverallScore() >= 60
                                        ? 'Solid foundation with a few concepts to review.'
                                        : 'Review the source material and practice the weaker topics.'}
                                </p>
                            </div>
                            <div className="h-20 w-20 rounded-xl bg-white/10  flex items-center justify-center text-4xl shrink-0 shadow-inner">
                                <Award className="h-10 w-10 text-amber-400" />
                            </div>
                        </div>
                    </div>

                    {/* Breakdown of each question */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">Question-by-Question Breakdown</h3>
                        {evaluations.map((ev, i) => (
                            <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Q{ev.questionNumber}: {ev.question}</span>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                        ev.score >= 8 
                                            ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60' 
                                            : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                                    }`}>
                                        {ev.score}/10 Points
                                    </span>
                                </div>

                                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                                    <span className="font-semibold text-slate-900 dark:text-white">Your Answer: </span>
                                    {ev.userAnswer}
                                </div>

                                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/40 rounded-xl text-xs text-blue-900 dark:text-blue-200 border border-blue-100/60 dark:border-blue-900/50">
                                    <span className="font-bold">Interviewer Critique: </span>
                                    {ev.feedback}
                                </div>

                                {ev.idealAnswer && (
                                    <div className="p-3 bg-blue-50/50 dark:bg-blue-950/40 rounded-xl text-xs text-blue-900 dark:text-blue-200 border border-blue-100/60 dark:border-blue-900/50">
                                        <span className="font-bold">Recommended Ideal Answer: </span>
                                        {ev.idealAnswer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center pt-2">
                        <button
                            onClick={() => {
                                setIsCompleted(false)
                                setSessionActive(false)
                            }}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-blue-500 shadow-md transition"
                        >
                            <RotateCcw className="h-4 w-4" />
                            <span>Start Another Interview Session</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default InterviewPage
