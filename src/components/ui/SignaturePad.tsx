'use client'

import { useRef, useEffect, useCallback } from 'react'
import { Trash2 } from 'lucide-react'

interface Props {
  /** base64 dataURL (空文字 = 未署名) */
  value:    string
  onChange: (dataUrl: string) => void
}

/**
 * タッチ・マウス両対応の署名入力キャンバス。
 * 描画結果を PNG の base64 dataURL として onChange に渡す。
 */
export function SignaturePad({ value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing   = useRef(false)

  // 保存済みの署名を初期描画
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !value) return
    const img = new Image()
    img.onload = () => {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      ctx?.drawImage(img, 0, 0)
    }
    img.src = value
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return {
        x: (t.clientX - rect.left) * scaleX,
        y: (t.clientY - rect.top)  * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    }
  }

  const commit = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onChange(canvas.toDataURL('image/png'))
  }, [onChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth   = 2
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'

    const onStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      drawing.current = true
      const pos = getPos(e, canvas)
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!drawing.current) return
      e.preventDefault()
      const pos = getPos(e, canvas)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
    const onEnd = () => {
      if (!drawing.current) return
      drawing.current = false
      commit()
    }

    canvas.addEventListener('mousedown',  onStart)
    canvas.addEventListener('mousemove',  onMove)
    canvas.addEventListener('mouseup',    onEnd)
    canvas.addEventListener('mouseleave', onEnd)
    canvas.addEventListener('touchstart', onStart, { passive: false })
    canvas.addEventListener('touchmove',  onMove,  { passive: false })
    canvas.addEventListener('touchend',   onEnd)

    return () => {
      canvas.removeEventListener('mousedown',  onStart)
      canvas.removeEventListener('mousemove',  onMove)
      canvas.removeEventListener('mouseup',    onEnd)
      canvas.removeEventListener('mouseleave', onEnd)
      canvas.removeEventListener('touchstart', onStart)
      canvas.removeEventListener('touchmove',  onMove)
      canvas.removeEventListener('touchend',   onEnd)
    }
  }, [commit])

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    onChange('')
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">管理者サイン欄</span>
        {value && (
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3 h-3" />クリア
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={100}
        className={`w-full rounded-xl border-2 cursor-crosshair touch-none ${
          value ? 'border-teal-300 bg-teal-50/30' : 'border-slate-200 bg-slate-50'
        }`}
        style={{ height: '100px' }}
      />
      {!value && (
        <p className="text-xs text-slate-400 text-center">タッチまたはマウスで署名してください</p>
      )}
    </div>
  )
}
