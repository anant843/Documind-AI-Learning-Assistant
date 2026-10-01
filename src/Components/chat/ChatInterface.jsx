import React, { useState, useEffect, useRef } from 'react'
import { Send, MessageSquare, Sparkles, Loader2, Volume2, VolumeX, Mic, MicOff } from 'lucide-react'
import { useParams } from 'react-router-dom'
import aiService from '../../services/aiService.js'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../common/Spinner'
import MarkdownRenderer from '../common/MarkdownRenderer.jsx'
import toast from 'react-hot-toast'

import CitationList from './CitationList.jsx'

const ChatInterface = ({ onNavigateToPage = null }) => {
    const { id: documentId } = useParams()
    const { user } = useAuth()
    const [history, setHistory] = useState([])
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
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

    // Initialize Speech-to-Text Recognition
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

            recognition.onerror = (event) => {
                console.warn('Speech recognition error:', event.error)
                setIsListening(false)
            }

            recognition.onend = () => {
                setIsListening(false)
            }

            recognitionRef.current = recognition
        }

        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel()
            }
        }
    }, [])

    useEffect(() => {
        const fetchChatHistory = async () => {
            try {
                setInitialLoading(true)
                const response = await aiService.getChatHistory(documentId)
                setHistory(response.data || [])
            } catch (error) {
                if (error?.status === 404) {
                    setHistory([])
                } else {
                    console.error('Error fetching chat history:', error)
                }
            } finally {
                setInitialLoading(false)
            }
        }

        fetchChatHistory()
    }, [documentId])

    useEffect(() => {
        scrollToBottom()
    }, [history])

    const toggleListening = () => {
        if (!recognitionRef.current) {
            toast.error('Voice input is not supported in this browser. Please use Chrome or Edge.')
            return
        }

        if (isListening) {
            recognitionRef.current.stop()
            setIsListening(false)
        } else {
            try {
                recognitionRef.current.start()
                setIsListening(true)
                toast.success('Listening... Speak now!')
            } catch (err) {
                console.error('Speech recognition start failed:', err)
                setIsListening(false)
            }
        }
    }

    const handleSpeak = (text, index) => {
        if (!window.speechSynthesis) {
            toast.error('Text-to-speech is not supported in this browser.')
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
        utterance.pitch = 1.0

        utterance.onend = () => setSpeakingIndex(null)
        utterance.onerror = () => setSpeakingIndex(null)

        window.speechSynthesis.speak(utterance)
        setSpeakingIndex(index)
    }

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!message.trim()) return

        const userMessage = {
            role: 'user',
            content: message.trim(),
            timestamp: new Date(),
        }

        setHistory((prev) => [...prev, userMessage])
        setMessage('')
        setLoading(true)

        try {
            const response = await aiService.chat(documentId, userMessage.content)
            const assistantMessage = {
                role: 'assistant',
                content: response.data.answer,
                timestamp: new Date(),
                relevantChunks: response.data.relevantChunks,
                citations: response.data.citations || [],
                retrievalMetadata: response.data.retrievalMetadata || null,
            }
            setHistory((prev) => [...prev, assistantMessage])
        } catch (error) {
            console.error('Error sending message:', error)
            toast.error(error.message || 'Failed to send message')
        } finally {
            setLoading(false)
        }
    }

    const renderMessage = (msg, index) => {
        const isUser = msg.role === 'user'

        return (
            <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
                {!isUser && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mr-3 mt-1 shadow-sm">
                        <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                )}
                <div
                    className={`max-w-2xl p-4 rounded-xl shadow-sm transition ${
                        isUser
                            ? 'bg-slate-900   text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-none'
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
                                onCitationClick={onNavigateToPage ? (c) => onNavigateToPage(c.page || c.pageNumber || 1) : null}
                            />
                        </div>
                    )}
                    
                    {/* User author footer */}
                    {isUser && user?.username && (
                        <div className="mt-2 text-xs font-semibold text-emerald-100/90 text-right">{user.username}</div>
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
                                title={speakingIndex === index ? 'Stop audio' : 'Listen to answer'}
                            >
                                {speakingIndex === index ? (
                                    <>
                                        <VolumeX className="h-3.5 w-3.5" />
                                        <span>Stop listening</span>
                                    </>
                                ) : (
                                    <>
                                        <Volume2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>Listen</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    if (initialLoading) {
        return (
            <div className="flex flex-col w-full h-[70vh] max-h-[70vh] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center text-slate-500">
                    <div className="flex items-center gap-3">
                        <MessageSquare strokeWidth={2} className="h-5 w-5 text-emerald-600 animate-pulse" />
                        <span className="text-sm font-medium">Loading conversation history...</span>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-200 flex justify-center">
                    <Spinner size="sm" />
                </div>
            </div>
        )
    }

    return (
        <div className="relative flex flex-col w-full h-[70vh] max-h-[70vh] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Messages area */}
            <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 max-w-sm mx-auto p-6">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 shadow-inner">
                            <Sparkles className="h-6 w-6" />
                        </div>
                        <h4 className="text-base font-semibold text-slate-800">Ask Document Questions</h4>
                        <p className="text-xs text-slate-500 mt-1">
                            Ask any question about your document to get accurate, AI-powered answers.
                        </p>
                    </div>
                ) : (
                    history.map(renderMessage)
                )}
                <div ref={messagesEndRef} />
                {loading && (
                    <div className="flex items-center gap-3 p-3 bg-white/80 rounded-xl border border-slate-200 w-fit text-slate-600 text-xs">
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                        <span>Searching document & generating answer...</span>
                    </div>
                )}
            </div>

            {/* Input area */}
            <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
            >
                <button
                    type="button"
                    onClick={toggleListening}
                    className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition border ${
                        isListening
                            ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title={isListening ? 'Stop recording' : 'Dictate with voice'}
                >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>

                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={isListening ? 'Listening to your voice...' : 'Ask a question about this document...'}
                    disabled={loading}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 bg-slate-50/50"
                />

                <button
                    type="submit"
                    disabled={loading || !message.trim()}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900   text-white shadow-sm hover: hover: disabled:opacity-50 transition"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
            </form>
        </div>
    )
}

export default ChatInterface