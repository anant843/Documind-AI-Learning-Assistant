import React, { useState, useEffect, useRef } from 'react'
import {
    LibraryBig,
    Send,
    CheckSquare,
    Square,
    Volume2,
    VolumeX,
    Mic,
    MicOff,
    Loader2,
    Layers,
    RotateCcw
} from 'lucide-react'
import PageHeader from '../../Components/common/PageHeader.jsx'
import Spinner from '../../Components/common/Spinner.jsx'
import MarkdownRenderer from '../../Components/common/MarkdownRenderer.jsx'
import CitationList from '../../Components/chat/CitationList.jsx'
import documentService from '../../services/documentService.js'
import aiService from '../../services/aiService.js'
import toast from 'react-hot-toast'

const MultiDocChatPage = () => {
    const [documents, setDocuments] = useState([])
    const [selectedDocIds, setSelectedDocIds] = useState([])
    const [history, setHistory] = useState([])
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [docsLoading, setDocsLoading] = useState(true)
    const [isListening, setIsListening] = useState(false)
    const [speakingIndex, setSpeakingIndex] = useState(null)

    const messagesEndRef = useRef(null)
    const messagesContainerRef = useRef(null)
    const recognitionRef = useRef(null)

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
    }

    // Load user's ready documents
    useEffect(() => {
        const fetchDocs = async () => {
            try {
                setDocsLoading(true)
                const res = await documentService.getDocuments()
                const docs = res?.data || res || []
                const readyDocs = docs.filter((d) => d.status === 'ready')
                setDocuments(readyDocs)
                // Default: select all documents for global search
                setSelectedDocIds(readyDocs.map((d) => d._id))
            } catch (err) {
                console.error('Error fetching documents for multi-chat:', err)
                toast.error('Failed to load documents')
            } finally {
                setDocsLoading(false)
            }
        }

        const fetchChatHistory = async () => {
            try {
                const res = await aiService.getMultiChatHistory()
                if (res?.data) {
                    setHistory(res.data)
                }
            } catch {
                console.log('No previous multi-doc history found')
            }
        }

        fetchDocs()
        fetchChatHistory()
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [history])

    // Speech-to-Text Setup
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition()
            recognition.continuous = false
            recognition.interimResults = false
            recognition.lang = 'en-US'

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript
                setMessage((prev) => (prev ? `${prev} ${transcript}` : transcript))
                setIsListening(false)
            }

            recognition.onerror = () => setIsListening(false)
            recognition.onend = () => setIsListening(false)

            recognitionRef.current = recognition
        }

        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel()
            }
        }
    }, [])

    const toggleListening = () => {
        if (!recognitionRef.current) {
            toast.error('Voice dictation is supported in Chrome & Edge')
            return
        }

        if (isListening) {
            recognitionRef.current.stop()
            setIsListening(false)
        } else {
            try {
                recognitionRef.current.start()
                setIsListening(true)
                toast.success('Listening... Speak your multi-document question!')
            } catch {
                setIsListening(false)
            }
        }
    }

    const handleSpeak = (text, index) => {
        if (!window.speechSynthesis) {
            toast.error('Text-to-speech is not supported in this browser')
            return
        }

        if (speakingIndex === index) {
            window.speechSynthesis.cancel()
            setSpeakingIndex(null)
            return
        }

        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`_]/g, ''))
        utterance.rate = 1.0

        utterance.onend = () => setSpeakingIndex(null)
        utterance.onerror = () => setSpeakingIndex(null)

        window.speechSynthesis.speak(utterance)
        setSpeakingIndex(index)
    }

    const toggleDocSelection = (id) => {
        setSelectedDocIds((prev) =>
            prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
        )
    }

    const selectAllDocs = () => {
        if (selectedDocIds.length === documents.length) {
            setSelectedDocIds([])
        } else {
            setSelectedDocIds(documents.map((d) => d._id))
        }
    }

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!message.trim()) return

        if (selectedDocIds.length === 0) {
            toast.error('Please select at least one document to search')
            return
        }

        const userMsg = {
            role: 'user',
            content: message.trim(),
            timestamp: new Date(),
        }

        setHistory((prev) => [...prev, userMsg])
        setMessage('')
        setLoading(true)

        try {
            const res = await aiService.multiChat(userMsg.content, selectedDocIds)
            const assistantMsg = {
                role: 'assistant',
                content: res.data.answer,
                citations: res.data.citations || [],
                retrievalMetadata: res.data.retrievalMetadata || null,
                documentsUsed: res.data.documentsUsed || [],
                timestamp: new Date(),
            }
            setHistory((prev) => [...prev, assistantMsg])
        } catch (err) {
            console.error('Multi-doc chat error:', err)
            toast.error(err.message || 'Failed to get answer across documents')
        } finally {
            setLoading(false)
        }
    }

    const handleClearHistory = async () => {
        if (history.length === 0) return
        try {
            await aiService.clearMultiChatHistory()
            setHistory([])
            toast.success('Multi-doc chat history cleared')
        } catch (err) {
            console.error('Error clearing history:', err)
            toast.error('Failed to clear chat history')
        }
    }

    return (
        <div className="flex flex-col flex-1 h-full min-h-0 gap-3 sm:gap-4">
            <div className="flex-shrink-0">
                <PageHeader
                    title="Ask across your library"
                    subtitle="Choose the documents that should be searched, then ask one question across all of them."
                />
            </div>

            {/* Document Selector Bar */}
            <div className="flex-shrink-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                            Sources ({selectedDocIds.length} of {documents.length})
                        </h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={selectAllDocs}
                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline transition self-start sm:self-auto"
                        >
                            {documents.length > 0 && selectedDocIds.length === documents.length ? 'Deselect all' : 'Select all'}
                        </button>
                        {history.length > 0 && (
                            <button
                                onClick={handleClearHistory}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline transition"
                                title="Clear multi-doc conversation history"
                            >
                                <RotateCcw className="h-3 w-3" />
                                <span>Clear Chat</span>
                            </button>
                        )}
                    </div>
                </div>

                {docsLoading ? (
                    <div className="py-2 flex justify-center">
                        <Spinner size="sm" />
                    </div>
                ) : documents.length === 0 ? (
                    <p className="text-xs text-slate-500 mt-1">No ready documents found. Upload PDFs in the Documents tab.</p>
                ) : (
                    <div className="mt-2.5 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                        {documents.map((doc) => {
                            const isSelected = selectedDocIds.includes(doc._id)
                            return (
                                <button
                                    key={doc._id}
                                    onClick={() => toggleDocSelection(doc._id)}
                                    className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium border transition ${
                                        isSelected
                                            ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-700 shadow-xs'
                                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {isSelected ? (
                                        <CheckSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                    ) : (
                                        <Square className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    )}
                                    <span className="truncate max-w-[180px]">{doc.title}</span>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Chat Container */}
            <div className="relative flex flex-col flex-1 min-h-[350px] w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Messages area */}
                <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/40 dark:bg-slate-950/40">
                    {history.length === 0 ? (
                        <div className="mx-auto flex h-full max-w-md flex-col justify-center p-6 text-left">
                            <LibraryBig className="mb-4 h-7 w-7 text-blue-600" />
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Search selected documents</h4>
                            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Try: <span className="font-medium text-slate-700 dark:text-slate-300">What do these sources disagree about?</span>
                            </p>
                        </div>
                    ) : (
                        history.map((msg, index) => {
                            const isUser = msg.role === 'user'
                            return (
                                <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[85%] px-4 py-3 text-sm leading-6 sm:max-w-2xl ${
                                            isUser
                                                ? 'rounded-xl rounded-br-sm bg-slate-900 text-white dark:bg-blue-600'
                                                : 'rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                                        }`}
                                    >
                                        {isUser ? (
                                            <p className="leading-relaxed">{msg.content}</p>
                                        ) : (
                                            <div>
                                                <MarkdownRenderer content={msg.content} />
                                                <CitationList
                                                    citations={msg.citations}
                                                    retrievalMetadata={msg.retrievalMetadata}
                                                />
                                            </div>
                                        )}

                                        {/* Assistant audio controls */}
                                        {!isUser && (
                                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                                                <button
                                                    onClick={() => handleSpeak(msg.content, index)}
                                                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition ${
                                                        speakingIndex === index
                                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                                                    }`}
                                                >
                                                    {speakingIndex === index ? (
                                                        <>
                                                            <VolumeX className="h-3.5 w-3.5" />
                                                            <span>Stop</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Volume2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                                            <span>Listen</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                    <div ref={messagesEndRef} />
                    {loading && (
                        <div className="flex items-center gap-3 p-3 bg-white/90 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-fit text-slate-600 dark:text-slate-300 text-xs">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                            <span>Comparing supporting passages…</span>
                        </div>
                    )}
                </div>

                {/* Input area */}
                <form
                    onSubmit={handleSendMessage}
                    className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2.5"
                >
                    <button
                        type="button"
                        onClick={toggleListening}
                        className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition border ${
                            isListening
                                ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title={isListening ? 'Stop recording' : 'Dictate with voice'}
                    >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>

                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={
                            isListening
                                ? 'Listening to your voice...'
                                : `Ask across ${selectedDocIds.length} selected documents...`
                        }
                        disabled={loading}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />

                    <button
                        type="submit"
                        disabled={loading || !message.trim() || selectedDocIds.length === 0}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default MultiDocChatPage
