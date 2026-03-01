'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'

// Web Speech API の最小型定義
interface SpeechRecognitionResult {
  readonly 0: { transcript: string }
}
interface SpeechRecognitionResultList {
  readonly length: number
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionEvt extends Event {
  readonly results: SpeechRecognitionResultList
}
interface SpeechRecognitionInstance extends EventTarget {
  lang:            string
  continuous:      boolean
  interimResults:  boolean
  onresult:        ((ev: SpeechRecognitionEvt) => void) | null
  onend:           (() => void) | null
  onerror:         ((ev: Event) => void) | null
  start(): void
  stop():  void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

function getSR(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  return (
    (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition ??
    null
  )
}

interface Props {
  /** 認識したテキストを受け取るコールバック */
  onResult:  (text: string) => void
  className?: string
  title?:     string
}

/**
 * スタンドアロンの音声入力ボタン。
 * テキスト入力欄の隣に配置し、onResult で入力値を更新する想定。
 * continuous: false — 一フレーズ認識で自動停止。
 */
export function VoiceInputButton({ onResult, className = '', title }: Props) {
  const [isRecording,  setIsRecording]  = useState(false)
  const [isSupported,  setIsSupported]  = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  useEffect(() => {
    setIsSupported(!!getSR())
  }, [])

  const start = () => {
    const SR = getSR()
    if (!SR) return
    const rec = new SR()
    rec.lang           = 'ja-JP'
    rec.continuous     = false
    rec.interimResults = false
    rec.onresult = (e: SpeechRecognitionEvt) => {
      const text = Array.from(
        { length: e.results.length },
        (_, i) => e.results[i][0].transcript,
      ).join('')
      onResult(text)
    }
    rec.onend  = () => setIsRecording(false)
    rec.onerror = () => setIsRecording(false)
    recognitionRef.current = rec
    rec.start()
    setIsRecording(true)
  }

  const stop = () => {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  if (!isSupported) return null

  return (
    <button
      type="button"
      onClick={isRecording ? stop : start}
      title={title ?? (isRecording ? '録音停止' : '音声入力')}
      className={`p-2 rounded-lg transition-all shrink-0 ${
        isRecording
          ? 'bg-red-500 text-white animate-pulse'
          : 'bg-teal-600 text-white hover:bg-teal-700'
      } ${className}`}
    >
      {isRecording
        ? <Square className="w-4 h-4" />
        : <Mic    className="w-4 h-4" />
      }
    </button>
  )
}
