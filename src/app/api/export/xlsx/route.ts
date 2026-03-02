import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { EQUIPMENT_CHECK_ITEMS } from '@/lib/api/equipmentCheckLog'
import { CLEANING_CHECK_ITEMS }  from '@/lib/api/cleaningCheckLog'

// ─── 型定義 ───────────────────────────────────────────────────────────────

type TempSlots = (number | null)[]
interface CheckItem { key: string; label: string; checked: boolean }

interface TempLogRow {
  date: string; fridge: TempSlots; freezer: TempSlots
  assignee: string; updated_at: string
}
interface EquipmentCheckLogRow {
  date: string; items: CheckItem[]; confirmer: string; updated_at: string
}
interface CleaningCheckLogRow {
  date: string; items: CheckItem[]; assignee: string; updated_at: string
}
interface OodaRow {
  id: string; title: string; content: string
  category: string; status: string; created_at: string
}

// ─── 定数 ─────────────────────────────────────────────────────────────────

const FRIDGE_SLOT_COUNT  = 5
const FREEZER_SLOT_COUNT = 2

const C = {
  TEAL:      'FF0D9488',
  PERIOD_BG: 'FFF1F5F9',
  HEADER_BG: 'FFE2E8F0',
  ROW_ALT:   'FFF8FAFC',
  WHITE:     'FFFFFFFF',
  RED_BG:    'FFFEF2F2',
  GREEN:     'FF16A34A',
  RED:       'FFDC2626',
  SLATE:     'FF64748B',
  BORDER:    'FF94A3B8',
  CONFIRM:   'FF475569',
} as const

const OODA_STATUS_COLOR: Record<string, string> = {
  Observe: 'FFF97316',
  Orient:  'FFEAB308',
  Decide:  'FF3B82F6',
  Act:     'FF22C55E',
}

// ─── フォーマット ─────────────────────────────────────────────────────────

function fmtDate(d: string): string {
  return d ? d.replace(/-/g, '/') : ''
}

function fmtDateTime(dt: string): string {
  if (!dt) return ''
  try {
    const d = new Date(dt)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch { return dt }
}

function addOneDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().split('T')[0]
}

// ─── データ取得 ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any>

function mergeItems(
  defs: Omit<CheckItem, 'checked'>[],
  stored: unknown,
): CheckItem[] {
  if (!Array.isArray(stored)) return defs.map(d => ({ ...d, checked: false }))
  const map = new Map<string, boolean>(
    stored
      .filter((i): i is { key: string; checked: boolean } => typeof i?.key === 'string')
      .map(i => [i.key, !!i.checked]),
  )
  return defs.map(d => ({ ...d, checked: map.get(d.key) ?? false }))
}

async function fetchTempRows(sb: SB, start: string, end: string): Promise<TempLogRow[]> {
  const { data, error } = await sb
    .from('temperaturelog')
    .select('date, slot, temperature, assignee, updated_at')
    .gte('date', start).lte('date', end)
    .order('date', { ascending: true }).order('slot', { ascending: true })
  if (error || !data) return []

  const byDate = new Map<string, { slot: number; temperature: number | null; assignee: string; updated_at: string }[]>()
  for (const row of data as Record<string, unknown>[]) {
    const key = row.date as string
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push({
      slot:        row.slot        as number,
      temperature: row.temperature as number | null,
      assignee:    (row.assignee   as string) ?? '',
      updated_at:  (row.updated_at  as string) ?? '',
    })
  }
  return Array.from(byDate.entries()).map(([date, slots]) => {
    const fridge  = Array.from({ length: FRIDGE_SLOT_COUNT },  (_, i) => slots.find(r => r.slot === i + 1)?.temperature ?? null)
    const freezer = Array.from({ length: FREEZER_SLOT_COUNT }, (_, i) => slots.find(r => r.slot === FRIDGE_SLOT_COUNT + i + 1)?.temperature ?? null)
    const assignee   = slots[0]?.assignee ?? ''
    const updated_at = slots.reduce((max, r) => r.updated_at > max ? r.updated_at : max, '')
    return { date, fridge, freezer, assignee, updated_at }
  })
}

async function fetchEquipmentRows(sb: SB, start: string, end: string): Promise<EquipmentCheckLogRow[]> {
  const { data, error } = await sb
    .from('equipmentchecklog')
    .select('date, items, confirmer, updated_at')
    .gte('date', start).lte('date', end)
    .order('date', { ascending: true })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(row => ({
    date:       row.date       as string,
    items:      mergeItems(EQUIPMENT_CHECK_ITEMS, row.items),
    confirmer:  (row.confirmer as string) ?? '',
    updated_at: (row.updated_at as string) ?? '',
  }))
}

async function fetchCleaningRows(sb: SB, start: string, end: string): Promise<CleaningCheckLogRow[]> {
  const { data, error } = await sb
    .from('cleaningchecklog')
    .select('date, items, assignee, updated_at')
    .gte('date', start).lte('date', end)
    .order('date', { ascending: true })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(row => ({
    date:       row.date       as string,
    items:      mergeItems(CLEANING_CHECK_ITEMS, row.items),
    assignee:   (row.assignee  as string) ?? '',
    updated_at: (row.updated_at as string) ?? '',
  }))
}

async function fetchOodaRows(sb: SB, start: string, end: string): Promise<OodaRow[]> {
  const { data, error } = await sb
    .from('Ooda')
    .select('id, title, content, category, status, created_at')
    .gte('created_at', `${start}T00:00:00`)
    .lt('created_at',  `${addOneDay(end)}T00:00:00`)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(row => ({
    id:         row.id         as string,
    title:      (row.title     as string) ?? '',
    content:    (row.content   as string) ?? '',
    category:   (row.category  as string) ?? '',
    status:     (row.status    as string) ?? '',
    created_at: (row.created_at as string) ?? '',
  }))
}

// ─── ExcelJS ヘルパー ─────────────────────────────────────────────────────

type Fill = ExcelJS.Fill
type Font = Partial<ExcelJS.Font>

const titleFill: Fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.TEAL } }
const periodFill: Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.PERIOD_BG } }
const headerFill: Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.HEADER_BG } }
const altFill: Fill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ROW_ALT } }
const whiteFill: Fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.WHITE } }
const redBgFill: Fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.RED_BG } }

const titleFont: Font  = { bold: true, size: 13, color: { argb: C.WHITE } }
const headerFont: Font = { bold: true, size: 10 }
const dataFont:  Font  = { size: 10 }

function addSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
  title: string,
  period: string,
  headers: string[],
  colWidths: number[],
): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(sheetName)
  ws.pageSetup.paperSize   = 9
  ws.pageSetup.orientation = 'landscape'
  ws.pageSetup.fitToPage   = true
  ws.pageSetup.fitToWidth  = 1
  ws.pageSetup.fitToHeight = 0

  const cc = headers.length

  // Row 1: タイトル
  ws.mergeCells(1, 1, 1, cc)
  const t = ws.getCell(1, 1)
  t.value = title; t.font = titleFont; t.fill = titleFill
  t.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 28

  // Row 2: 出力期間
  ws.mergeCells(2, 1, 2, cc)
  const p = ws.getCell(2, 1)
  p.value = period
  p.font  = { size: 10, italic: true, color: { argb: C.SLATE } }
  p.fill  = periodFill
  p.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
  ws.getRow(2).height = 18

  // Row 3: ヘッダー
  const hr = ws.getRow(3)
  hr.height = 24
  headers.forEach((h, i) => {
    const c = hr.getCell(i + 1)
    c.value = h; c.font = headerFont; c.fill = headerFill
    c.border = {
      top:    { style: 'thin',   color: { argb: C.BORDER } },
      bottom: { style: 'medium', color: { argb: C.BORDER } },
      left:   { style: 'thin',   color: { argb: C.BORDER } },
      right:  { style: 'thin',   color: { argb: C.BORDER } },
    }
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 3, topLeftCell: 'A4' }]
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: cc } }
  colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w })

  return ws
}

function styleCell(
  cell: ExcelJS.Cell,
  rowIdx: number,
  opts: { align?: ExcelJS.Alignment['horizontal']; font?: Font; fill?: Fill } = {},
) {
  cell.fill = opts.fill ?? (rowIdx % 2 === 0 ? altFill : whiteFill)
  cell.font = { ...dataFont, ...opts.font }
  cell.alignment = { horizontal: opts.align ?? 'center', vertical: 'middle' }
}

/** 月次確認欄を各シートの最下部に追加 */
function addConfirmationSection(
  ws: ExcelJS.Worksheet,
  dataEndRow: number,
  colCount: number,
  large = false,
) {
  if (colCount < 2) return
  const startRow = dataEndRow + 2          // 1行空ける
  const signRows = large ? 8 : 4
  const midCol   = Math.max(2, Math.min(Math.floor(colCount / 2), colCount - 2))

  // ─ ヘッダー行
  ws.mergeCells(startRow, 1, startRow, colCount)
  const hc = ws.getCell(startRow, 1)
  hc.value = '月次確認欄（手書き記入）'
  hc.font  = { bold: true, size: 11, color: { argb: C.WHITE } }
  hc.fill  = titleFill
  hc.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(startRow).height = 24

  // ─ 確認者・確認日 行
  const r1 = startRow + 1
  ws.getRow(r1).height = 28

  ws.getCell(r1, 1).value = '確認者（氏名）：'
  ws.getCell(r1, 1).font  = { bold: true, size: 10 }
  ws.getCell(r1, 1).alignment = { vertical: 'middle', indent: 1 }

  if (midCol >= 2) ws.mergeCells(r1, 2, r1, midCol)
  ws.getCell(r1, 2).border = { bottom: { style: 'medium', color: { argb: C.CONFIRM } } }

  if (midCol + 1 <= colCount) {
    ws.getCell(r1, midCol + 1).value = '確認日：'
    ws.getCell(r1, midCol + 1).font  = { bold: true, size: 10 }
    ws.getCell(r1, midCol + 1).alignment = { vertical: 'middle', indent: 1 }
  }
  if (midCol + 2 <= colCount) {
    ws.mergeCells(r1, midCol + 2, r1, colCount)
    ws.getCell(r1, midCol + 2).border = { bottom: { style: 'medium', color: { argb: C.CONFIRM } } }
  }

  // ─ 確認サイン エリア
  const r2  = startRow + 2
  const rEnd = r2 + signRows - 1

  ws.mergeCells(r2, 1, rEnd, 1)
  const sl = ws.getCell(r2, 1)
  sl.value = '確認サイン：'
  sl.font  = { bold: true, size: 10 }
  sl.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }

  ws.mergeCells(r2, 2, rEnd, colCount)
  ws.getCell(r2, 2).border = {
    top:    { style: 'medium', color: { argb: C.CONFIRM } },
    left:   { style: 'medium', color: { argb: C.CONFIRM } },
    right:  { style: 'medium', color: { argb: C.CONFIRM } },
    bottom: { style: 'medium', color: { argb: C.CONFIRM } },
  }

  for (let r = r2; r <= rEnd; r++) ws.getRow(r).height = 22
}

// ─── GET ハンドラー ───────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl
  const start = searchParams.get('start') ?? ''
  const end   = searchParams.get('end')   ?? ''

  if (!start || !end || start > end) {
    return NextResponse.json({ error: 'start/end が不正です' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase が未設定です' }, { status: 503 })
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const [tempRows, eqRows, clRows, oodaRows] = await Promise.all([
    fetchTempRows(sb, start, end),
    fetchEquipmentRows(sb, start, end),
    fetchCleaningRows(sb, start, end),
    fetchOodaRows(sb, start, end),
  ])

  if (tempRows.length === 0 && eqRows.length === 0 && clRows.length === 0 && oodaRows.length === 0) {
    return NextResponse.json({ error: '指定期間にデータがありません' }, { status: 404 })
  }

  const wb = new ExcelJS.Workbook()
  wb.creator = '厨房管理システム'
  wb.created = new Date()

  const TITLE    = '厨房 温度・点検 記録表'
  const period   = `出力期間：${fmtDate(start)} 〜 ${fmtDate(end)}`
  const eqLabels = EQUIPMENT_CHECK_ITEMS.map(d => d.label)
  const clLabels = CLEANING_CHECK_ITEMS.map(d => d.label)

  // ── Sheet 1: 温度記録 ────────────────────────────────────────────────────
  {
    const CC = 11
    const ws = addSheet(wb, '温度記録', `${TITLE} ─ 温度記録`, period,
      ['日付', '冷蔵庫 1', '冷蔵庫 2', '冷蔵庫 3', '冷蔵庫 4', '冷蔵庫 5',
               '冷凍庫 6', '冷凍庫 7', '未入力数', '記録者', '更新日時'],
      [12, 9, 9, 9, 9, 9, 9, 9, 9, 14, 20],
    )
    tempRows.forEach((r, ri) => {
      const row = ws.getRow(ri + 4)
      const vals: (string | number | null)[] = [
        fmtDate(r.date), ...r.fridge, ...r.freezer,
        [...r.fridge, ...r.freezer].filter(v => v === null).length,
        r.assignee, fmtDateTime(r.updated_at),
      ]
      vals.forEach((v, ci) => {
        const cell = row.getCell(ci + 1)
        cell.value = v
        const isTempCol = ci >= 1 && ci <= 7
        styleCell(cell, ri, {
          align: ci === 0 || ci >= 9 ? 'left' : 'center',
          fill:  isTempCol && v === null ? redBgFill : undefined,
        })
      })
      row.height = 18
    })
    addConfirmationSection(ws, 3 + Math.max(tempRows.length, 1), CC)
  }

  // ── Sheet 2: 設備点検 ────────────────────────────────────────────────────
  {
    const CC = 1 + eqLabels.length + 3
    const ws = addSheet(wb, '設備点検', `${TITLE} ─ 設備点検`, period,
      ['日付', ...eqLabels, '未実施数', '未実施項目', '確認者', '更新日時'],
      [12, ...eqLabels.map(() => 10), 9, 35, 14, 20],
    )
    eqRows.forEach((r, ri) => {
      const row = ws.getRow(ri + 4)
      const uncheckedLabels = r.items.filter(i => !i.checked).map(i => i.label).join('、')
      const vals: (string | number)[] = [
        fmtDate(r.date),
        ...r.items.map(i => i.checked ? '✓' : '×'),
        r.items.filter(i => !i.checked).length,
        uncheckedLabels, r.confirmer, fmtDateTime(r.updated_at),
      ]
      vals.forEach((v, ci) => {
        const cell = row.getCell(ci + 1)
        cell.value = v
        const isCheckCol = ci >= 1 && ci <= eqLabels.length
        const checked    = v === '✓'
        styleCell(cell, ri, {
          align: ci === 0 || ci > eqLabels.length + 1 ? 'left' : 'center',
          font:  isCheckCol ? { size: 10, bold: true, color: { argb: checked ? C.GREEN : C.RED } } : undefined,
        })
      })
      row.height = 18
    })
    addConfirmationSection(ws, 3 + Math.max(eqRows.length, 1), CC)
  }

  // ── Sheet 3: 清掃点検 ────────────────────────────────────────────────────
  {
    const CC = 1 + clLabels.length + 3
    const ws = addSheet(wb, '清掃点検', `${TITLE} ─ 清掃点検`, period,
      ['日付', ...clLabels, '未実施数', '未実施項目', '担当者', '更新日時'],
      [12, ...clLabels.map(() => 12), 9, 35, 14, 20],
    )
    clRows.forEach((r, ri) => {
      const row = ws.getRow(ri + 4)
      const uncheckedLabels = r.items.filter(i => !i.checked).map(i => i.label).join('、')
      const vals: (string | number)[] = [
        fmtDate(r.date),
        ...r.items.map(i => i.checked ? '✓' : '×'),
        r.items.filter(i => !i.checked).length,
        uncheckedLabels, r.assignee, fmtDateTime(r.updated_at),
      ]
      vals.forEach((v, ci) => {
        const cell = row.getCell(ci + 1)
        cell.value = v
        const isCheckCol = ci >= 1 && ci <= clLabels.length
        const checked    = v === '✓'
        styleCell(cell, ri, {
          align: ci === 0 || ci > clLabels.length + 1 ? 'left' : 'center',
          font:  isCheckCol ? { size: 10, bold: true, color: { argb: checked ? C.GREEN : C.RED } } : undefined,
        })
      })
      row.height = 18
    })
    addConfirmationSection(ws, 3 + Math.max(clRows.length, 1), CC)
  }

  // ── Sheet 4: OODA ────────────────────────────────────────────────────────
  {
    const CC = 5
    const ws = addSheet(wb, 'OODA', `${TITLE} ─ 課題・改善記録（OODA）`, period,
      ['作成日時', 'タイトル', 'カテゴリ', 'ステータス', '内容'],
      [18, 30, 16, 12, 50],
    )
    oodaRows.forEach((r, ri) => {
      const row = ws.getRow(ri + 4)
      const statusColor = OODA_STATUS_COLOR[r.status] ?? C.SLATE
      const vals: string[] = [
        fmtDateTime(r.created_at), r.title, r.category, r.status, r.content,
      ]
      vals.forEach((v, ci) => {
        const cell = row.getCell(ci + 1)
        cell.value = v
        const isStatus = ci === 3
        styleCell(cell, ri, {
          align: ci === 0 || ci === 3 ? 'center' : 'left',
          font:  isStatus ? { size: 10, bold: true, color: { argb: statusColor } } : undefined,
        })
      })
      row.height = 18
    })
    addConfirmationSection(ws, 3 + Math.max(oodaRows.length, 1), CC)
  }

  // ── Sheet 5: まとめ ──────────────────────────────────────────────────────
  {
    const CC = 17
    const ws = addSheet(wb, 'まとめ', `${TITLE} ─ まとめ`, period,
      [
        '日付',
        '冷蔵庫 1', '冷蔵庫 2', '冷蔵庫 3', '冷蔵庫 4', '冷蔵庫 5',
        '冷凍庫 6', '冷凍庫 7',
        '温度\n未記録合計',
        '設備点検\n未実施数', '設備点検\n未実施項目',
        '清掃点検\n未実施数', '清掃点検\n未実施項目',
        '記録者', '確認者', '担当者', '更新日時',
      ],
      [12, 9, 9, 9, 9, 9, 9, 9, 10, 10, 30, 10, 30, 12, 12, 12, 20],
    )

    const tempMap = new Map(tempRows.map(r => [r.date, r]))
    const eqMap   = new Map(eqRows.map(r => [r.date, r]))
    const clMap   = new Map(clRows.map(r => [r.date, r]))
    const allDates = Array.from(
      new Set([...tempMap.keys(), ...eqMap.keys(), ...clMap.keys()])
    ).sort()

    allDates.forEach((date, ri) => {
      const t  = tempMap.get(date)
      const eq = eqMap.get(date)
      const cl = clMap.get(date)

      const fridge  = t?.fridge  ?? Array.from({ length: 5 }, () => null as number | null)
      const freezer = t?.freezer ?? Array.from({ length: 2 }, () => null as number | null)
      const tempMissing = [...fridge, ...freezer].filter(v => v === null).length

      const eqItems           = eq?.items ?? []
      const eqUncheckedCount  = eqItems.filter(i => !i.checked).length
      const eqUncheckedLabels = eqItems.filter(i => !i.checked).map(i => i.label).join('、')

      const clItems           = cl?.items ?? []
      const clUncheckedCount  = clItems.filter(i => !i.checked).length
      const clUncheckedLabels = clItems.filter(i => !i.checked).map(i => i.label).join('、')

      const updatedAt = [t?.updated_at, eq?.updated_at, cl?.updated_at]
        .filter((v): v is string => !!v).sort().slice(-1)[0] ?? ''

      const vals: (string | number | null)[] = [
        fmtDate(date),
        ...fridge, ...freezer,
        tempMissing,
        eqUncheckedCount, eqUncheckedLabels,
        clUncheckedCount, clUncheckedLabels,
        t?.assignee   ?? '',
        eq?.confirmer ?? '',
        cl?.assignee  ?? '',
        fmtDateTime(updatedAt),
      ]

      const row = ws.getRow(ri + 4)
      vals.forEach((v, ci) => {
        const cell = row.getCell(ci + 1)
        cell.value = v
        const isTempCol  = ci >= 1 && ci <= 7
        const isCountCol = ci === 9 || ci === 11
        const isLeft     = ci === 0 || ci === 10 || ci === 12 || ci >= 13

        const fill = isTempCol && v === null ? redBgFill : undefined
        const font = isCountCol && typeof v === 'number' && v > 0
          ? { size: 10, bold: true, color: { argb: C.RED } }
          : undefined

        styleCell(cell, ri, { align: isLeft ? 'left' : 'center', fill, font })
      })
      row.height = 18
    })

    // まとめシートの確認欄は大きめ（large=true）
    addConfirmationSection(ws, 3 + Math.max(allDates.length, 1), CC, true)
  }

  const buffer = await wb.xlsx.writeBuffer()
  const suffix = `${start.replace(/-/g, '')}-${end.replace(/-/g, '')}`
  const filename = encodeURIComponent(`厨房記録_${suffix}.xlsx`)

  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  })
}
