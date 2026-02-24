'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'

// Minimal Web Speech API type declarations (not in default TS lib)
interface SpeechRecognitionResult {
  readonly 0: { transcript: string }
  readonly length: number
}
interface SpeechRecognitionResultList {
  readonly length: number
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionEvt extends Event {
  readonly results: SpeechRecognitionResultList
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((ev: SpeechRecognitionEvt) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  return (
    (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition ??
    null
  )
}

interface VoiceInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}

export function VoiceInput({ value, onChange, placeholder, rows = 4 }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const baseValueRef = useRef('')

  useEffect(() => {
    setIsSupported(!!getSpeechRecognition())
  }, [])

  const start = () => {
    const SR = getSpeechRecognition()
    if (!SR) return

    const recognition = new SR()
    recognition.lang = 'ja-JP'
    recognition.continuous = true
    recognition.interimResults = true

    baseValueRef.current = value

    recognition.onresult = (e: SpeechRecognitionEvt) => {
      const transcript = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join('')
      const prefix = baseValueRef.current
      onChange(prefix ? prefix + '\n' + transcript : transcript)
    }
    recognition.onend = () => setIsRecording(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const stop = () => {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full p-3 pr-14 border border-slate-300 rounded-xl resize-none text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent leading-relaxed"
      />
      {isSupported && (
        <button
          type="button"
          onClick={isRecording ? stop : start}
          title={isRecording ? '録音停止' : '音声入力開始'}
          className={`absolute right-3 bottom-3 p-2.5 rounded-full transition-all shadow ${
            isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-teal-600 text-white hover:bg-teal-700'
          }`}
        >
          {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
      )}
      {isRecording && (
        <div className="absolute top-2 left-3 flex items-center gap-1.5 text-xs text-red-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          録音中...
        </div>
      )}
    </div>
  )
}
