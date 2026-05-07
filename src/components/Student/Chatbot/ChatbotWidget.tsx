import { useCallback, useEffect, useRef, useState } from 'react'
import { chatbotService, type ChatMessage } from '@/services/ChatbotService'
import { CloseIcon, PaperPlaneIcon } from '@/icons'

type DisplayMessage = {
    id: string
    role: 'user' | 'model'
    text: string
    loading?: boolean
}

const BOT_AVATAR = (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E02020] to-[#B01818] text-white text-xs font-bold select-none">
        AI
    </div>
)

const WELCOME_MESSAGE: DisplayMessage = {
    id: 'welcome',
    role: 'model',
    text: 'Xin chào! Mình là trợ lý học vụ AI. Mình có thể giúp bạn về:\n• Dữ liệu học tập & điểm rủi ro của bạn\n• Quy chế học vụ đại học\n• Tư vấn cải thiện kết quả học tập\n• Hướng dẫn sử dụng hệ thống\n\nBạn cần hỏi gì không?',
}

const SUGGESTED_QUESTIONS = [
    'GPA của mình hiện tại là bao nhiêu?',
    'Mức rủi ro học tập của mình thế nào?',
    'Điều kiện tốt nghiệp đại học là gì?',
    'Làm sao để cải thiện điểm?',
]

function TypingDots() {
    return (
        <span className="inline-flex items-center gap-1 py-1">
            {[0, 1, 2].map(i => (
                <span
                    key={i}
                    className="size-1.5 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                />
            ))}
        </span>
    )
}

function MessageBubble({ msg }: { msg: DisplayMessage }) {
    const isUser = msg.role === 'user'
    return (
        <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {!isUser && BOT_AVATAR}
            <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${isUser
                    ? 'rounded-br-sm bg-[#E02020] text-white'
                    : 'rounded-bl-sm bg-[#F3F4F6] text-[#111111]'
                    }`}
            >
                {msg.loading ? <TypingDots /> : msg.text}
            </div>
        </div>
    )
}

export default function ChatbotWidget() {
    const [open, setOpen] = useState(false)
    const [messages, setMessages] = useState<DisplayMessage[]>([WELCOME_MESSAGE])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const historyRef = useRef<ChatMessage[]>([])
    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (open) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, open])

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [open])

    const sendMessage = useCallback(
        async (text: string) => {
            const trimmed = text.trim()
            if (!trimmed || loading) return

            const userMsg: DisplayMessage = {
                id: `user-${Date.now()}`,
                role: 'user',
                text: trimmed,
            }
            const loadingMsg: DisplayMessage = {
                id: `loading-${Date.now()}`,
                role: 'model',
                text: '',
                loading: true,
            }

            setMessages(prev => [...prev, userMsg, loadingMsg])
            setInput('')
            setLoading(true)

            try {
                const res = await chatbotService.sendMessage(trimmed, historyRef.current)
                const reply = res.data?.reply || 'Xin lỗi, mình không thể trả lời lúc này.'

                historyRef.current = [
                    ...historyRef.current,
                    { role: 'user' as const, parts: [{ text: trimmed }] as [{ text: string }] },
                    { role: 'model' as const, parts: [{ text: reply }] as [{ text: string }] },
                ].slice(-20)

                setMessages(prev =>
                    prev.map(m =>
                        m.id === loadingMsg.id ? { ...m, text: reply, loading: false } : m
                    )
                )
            } catch (err: unknown) {
                const errMsg =
                    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                    'Đã có lỗi xảy ra. Vui lòng thử lại.'
                setMessages(prev =>
                    prev.map(m =>
                        m.id === loadingMsg.id
                            ? { ...m, text: errMsg, loading: false }
                            : m
                    )
                )
            } finally {
                setLoading(false)
            }
        },
        [loading]
    )

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            void sendMessage(input)
        }
    }

    const handleSuggest = (q: string) => {
        void sendMessage(q)
    }

    const handleReset = () => {
        setMessages([WELCOME_MESSAGE])
        historyRef.current = []
        setInput('')
    }

    const showSuggestions = messages.length === 1

    return (
        <>
            {/* Floating button */}
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                aria-label={open ? 'Đóng chatbot' : 'Mở chatbot hỗ trợ học vụ'}
                className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E02020] focus-visible:ring-offset-2"
                style={{ background: 'linear-gradient(135deg, #E02020, #B01818)' }}
            >
                {open ? (
                    <CloseIcon className="size-6 text-white" />
                ) : (
                    /* Chat bubble icon */
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path
                            d="M12 2C6.477 2 2 6.268 2 11.5c0 2.1.74 4.04 1.97 5.6L2.5 21l4.18-1.37A10.1 10.1 0 0 0 12 21c5.523 0 10-4.268 10-9.5S17.523 2 12 2Z"
                            fill="white"
                        />
                        <circle cx="8.5" cy="11.5" r="1.2" fill="#E02020" />
                        <circle cx="12" cy="11.5" r="1.2" fill="#E02020" />
                        <circle cx="15.5" cy="11.5" r="1.2" fill="#E02020" />
                    </svg>
                )}
            </button>

            {/* Chat panel */}
            {open && (
                <div
                    className="fixed bottom-24 right-6 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[#F0F0F0] bg-white shadow-2xl"
                    style={{ height: '520px' }}
                    role="dialog"
                    aria-label="Trợ lý học vụ AI"
                >
                    {/* Header */}
                    <div
                        className="flex shrink-0 items-center justify-between px-4 py-3"
                        style={{ background: 'linear-gradient(135deg, #E02020, #B01818)' }}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="flex size-8 items-center justify-center rounded-full bg-white/20 text-white text-xs font-bold">
                                AI
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white leading-tight">Trợ lý học vụ</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={handleReset}
                                title="Bắt đầu cuộc trò chuyện mới"
                                className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                                aria-label="Xóa lịch sử chat"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M3 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                                aria-label="Đóng chatbot"
                            >
                                <CloseIcon className="size-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 scroll-smooth">
                        {messages.map(msg => (
                            <MessageBubble key={msg.id} msg={msg} />
                        ))}

                        {/* Suggested questions — chỉ hiện khi chưa chat */}
                        {showSuggestions && (
                            <div className="mt-1 flex flex-col gap-2">
                                <p className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wide">Gợi ý câu hỏi</p>
                                {SUGGESTED_QUESTIONS.map(q => (
                                    <button
                                        key={q}
                                        type="button"
                                        onClick={() => handleSuggest(q)}
                                        className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-left text-xs text-[#374151] transition-colors hover:border-[#E02020] hover:bg-[#FFF5F5] hover:text-[#E02020]"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="shrink-0 border-t border-[#F0F0F0] bg-white px-3 py-3">
                        <div className="flex items-end gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 focus-within:border-[#E02020] focus-within:bg-white transition-colors">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Nhập câu hỏi... (Enter để gửi)"
                                rows={1}
                                maxLength={1000}
                                disabled={loading}
                                className="flex-1 resize-none bg-transparent text-sm text-[#111111] placeholder-[#9CA3AF] outline-none disabled:opacity-50"
                                style={{ maxHeight: '96px', overflowY: 'auto' }}
                                aria-label="Nhập tin nhắn"
                            />
                            <button
                                type="button"
                                onClick={() => void sendMessage(input)}
                                disabled={loading || !input.trim()}
                                aria-label="Gửi tin nhắn"
                                className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{
                                    background: input.trim() && !loading
                                        ? 'linear-gradient(135deg, #E02020, #B01818)'
                                        : '#E5E7EB',
                                }}
                            >
                                <PaperPlaneIcon
                                    className="size-4"
                                    style={{ color: input.trim() && !loading ? 'white' : '#9CA3AF' }}
                                />
                            </button>
                        </div>
                        <p className="mt-1.5 text-center text-[10px] text-[#D1D5DB]">
                            Chỉ hỗ trợ câu hỏi về học vụ & hệ thống
                        </p>
                    </div>
                </div>
            )}
        </>
    )
}
