import React, { useState, useEffect } from 'react';
import { 
    X, ChevronLeft, ChevronRight, Maximize2, Minimize2, 
    Printer, Presentation, Lightbulb, CheckCircle2, Sparkles, 
    Layers, BookOpen, Loader2
} from 'lucide-react';
import aiService from '../../services/aiService';

const PresentationModal = ({ isOpen, onClose, documentId, documentTitle }) => {
    const [slides, setSlides] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSpeakerNotes, setShowSpeakerNotes] = useState(false);

    useEffect(() => {
        if (isOpen && documentId) {
            fetchPresentation();
        }
    }, [isOpen, documentId]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;
            if (e.key === 'ArrowRight' || e.key === 'Space') {
                e.preventDefault();
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrev();
            } else if (e.key === 'Escape') {
                if (isFullscreen) setIsFullscreen(false);
                else onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentIndex, slides.length, isFullscreen]);

    const fetchPresentation = async () => {
        try {
            setLoading(true);
            const res = await aiService.generatePresentation(documentId, 6);
            if (res?.data && Array.isArray(res.data)) {
                setSlides(res.data);
                setCurrentIndex(0);
            }
        } catch (err) {
            console.error('Failed to generate presentation:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (!isOpen) return null;

    const currentSlide = slides[currentIndex] || null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-all duration-300 ${isFullscreen ? 'p-0' : ''}`}>
            <div className={`flex flex-col bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${isFullscreen ? 'w-screen h-screen rounded-none' : 'w-full max-w-5xl h-[85vh]'}`}>
                
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 no-print">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                            <Presentation className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                                    <Sparkles className="h-3 w-3" /> AI Slide Deck
                                </span>
                                <h3 className="text-base font-bold text-white truncate max-w-md">
                                    {documentTitle || 'Study Presentation'}
                                </h3>
                            </div>
                            <p className="text-xs text-slate-400">
                                {slides.length > 0 ? `Slide ${currentIndex + 1} of ${slides.length}` : 'Generating slides...'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSpeakerNotes(prev => !prev)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors ${showSpeakerNotes ? 'bg-indigo-600 text-white border-indigo-500' : 'text-slate-300 border-slate-700 hover:bg-slate-800'}`}
                            title="Toggle Presenter Notes"
                        >
                            <Lightbulb className="h-4 w-4 inline mr-1" /> Notes
                        </button>

                        <button
                            onClick={handlePrint}
                            className="p-2 rounded-xl text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors"
                            title="Print / Save as PDF"
                        >
                            <Printer className="h-4 w-4" />
                        </button>

                        <button
                            onClick={() => setIsFullscreen(prev => !prev)}
                            className="p-2 rounded-xl text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors"
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        >
                            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </button>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Main Slide Viewer Area */}
                <div className="relative flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
                            <p className="text-slate-300 text-sm font-medium">Extracting core concepts & architecting executive slides...</p>
                        </div>
                    ) : currentSlide ? (
                        <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl p-8 md:p-12 shadow-2xl space-y-8 flex flex-col justify-between min-h-[420px] printable-card">
                            
                            {/* Slide Title & Header */}
                            <div className="space-y-2 border-b border-slate-700/60 pb-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                                        {currentSlide.subtitle || `Key Concept #${currentSlide.slideNumber}`}
                                    </span>
                                    <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                        {currentIndex + 1} / {slides.length}
                                    </span>
                                </div>
                                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                                    {currentSlide.title}
                                </h2>
                            </div>

                            {/* Bullet Points */}
                            <div className="space-y-4 py-2">
                                {(currentSlide.bulletPoints || []).map((point, idx) => (
                                    <div key={idx} className="flex items-start gap-4">
                                        <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 mt-1 flex-shrink-0">
                                            <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                        <p className="text-slate-200 text-base md:text-lg leading-relaxed font-normal">
                                            {point}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Executive Key Takeaway Callout */}
                            {currentSlide.keyTakeaway && (
                                <div className="rounded-2xl p-4 bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-3">
                                    <Sparkles className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">Executive Takeaway</p>
                                        <p className="text-sm text-indigo-100 font-medium">{currentSlide.keyTakeaway}</p>
                                    </div>
                                </div>
                            )}

                            {/* Speaker Notes Drawer (Optional) */}
                            {showSpeakerNotes && currentSlide.speakerNotes && (
                                <div className="rounded-2xl p-4 bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 space-y-1 no-print">
                                    <p className="font-bold flex items-center gap-1.5 text-amber-400">
                                        <Lightbulb className="h-3.5 w-3.5" /> Presenter Delivery Cue:
                                    </p>
                                    <p>{currentSlide.speakerNotes}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-slate-400">
                            <p>No slides generated yet.</p>
                        </div>
                    )}
                </div>

                {/* Footer Controls & Navigation */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-950/90 border-t border-slate-800 no-print">
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0 || loading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft className="h-4 w-4" /> Previous
                    </button>

                    {/* Slide Dots / Indicator */}
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-sm px-2">
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentIndex(i)}
                                className={`h-2.5 rounded-full transition-all ${i === currentIndex ? 'w-8 bg-indigo-500' : 'w-2.5 bg-slate-700 hover:bg-slate-600'}`}
                                title={`Jump to slide ${i + 1}`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={currentIndex === slides.length - 1 || loading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        Next <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

            </div>
        </div>
    );
};

export default PresentationModal;
