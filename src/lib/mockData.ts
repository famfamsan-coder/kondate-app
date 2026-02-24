import { Menu, Schedule, WorkRecord, Issue } from './types'

export const MENUS: Menu[] = [
  // ─── 主食 ───────────────────────────────────────────────────────
  {
    id: 'm1',  name: '白飯',         category: '主食',   standard_time: 10,
    calories: 168,  protein: 2.5,  salt: 0.0, fat: 0.3,  carbohydrate: 37.0,
    tags: ['米', '和食'], is_fixed_time: true,
  },
  {
    id: 'm2',  name: '食パン(2枚)', category: '主食',   standard_time: 5,
    calories: 264,  protein: 9.3,  salt: 1.4, fat: 4.4,  carbohydrate: 46.2,
    tags: ['パン', '洋食'], is_fixed_time: true,
  },
  {
    id: 'm16', name: 'カレーライス', category: '主食',   standard_time: 40,
    calories: 550,  protein: 18.2, salt: 1.8, fat: 12.0, carbohydrate: 88.5,
    tags: ['肉', '洋食', 'カレー'], is_fixed_time: false,
  },
  {
    id: 'm17', name: '親子丼',       category: '主食',   standard_time: 25,
    calories: 478,  protein: 21.5, salt: 2.0, fat: 10.2, carbohydrate: 68.5,
    tags: ['肉', '卵', '和食', '丼'], is_fixed_time: false,
  },
  // ─── 主菜 ───────────────────────────────────────────────────────
  {
    id: 'm3',  name: '焼き鮭',       category: '主菜',   standard_time: 20,
    calories: 133,  protein: 20.1, salt: 0.8, fat: 5.1,  carbohydrate: 0.1,
    tags: ['魚', '和食', '焼き物'], is_fixed_time: false,
  },
  {
    id: 'm4',  name: '肉じゃが',     category: '主菜',   standard_time: 35,
    calories: 220,  protein: 12.0, salt: 1.2, fat: 7.5,  carbohydrate: 24.5,
    tags: ['肉', '和食', '煮物'], is_fixed_time: false,
  },
  {
    id: 'm7',  name: '煮魚（タラ）', category: '主菜',   standard_time: 25,
    calories: 110,  protein: 17.5, salt: 1.5, fat: 1.2,  carbohydrate: 3.5,
    tags: ['魚', '和食', '煮物'], is_fixed_time: false,
  },
  {
    id: 'm8',  name: '鶏の唐揚げ',   category: '主菜',   standard_time: 30,
    calories: 290,  protein: 19.8, salt: 0.9, fat: 15.2, carbohydrate: 14.8,
    tags: ['肉', '揚げ物', '和食'], is_fixed_time: false,
  },
  // ─── 副菜 ───────────────────────────────────────────────────────
  {
    id: 'm6',  name: 'ほうれん草の胡麻和え', category: '副菜', standard_time: 15,
    calories: 58,   protein: 2.8,  salt: 0.4, fat: 3.2,  carbohydrate: 4.5,
    tags: ['野菜', '和食'], is_fixed_time: false,
  },
  {
    id: 'm9',  name: '卵焼き',       category: '副菜',   standard_time: 15,
    calories: 90,   protein: 6.5,  salt: 0.6, fat: 6.1,  carbohydrate: 2.0,
    tags: ['卵', '和食'], is_fixed_time: false,
  },
  {
    id: 'm11', name: '野菜炒め',     category: '副菜',   standard_time: 15,
    calories: 82,   protein: 2.5,  salt: 0.5, fat: 5.0,  carbohydrate: 7.2,
    tags: ['野菜', '中華'], is_fixed_time: false,
  },
  {
    id: 'm14', name: 'ポテトサラダ', category: '副菜',   standard_time: 20,
    calories: 143,  protein: 2.3,  salt: 0.8, fat: 8.2,  carbohydrate: 16.0,
    tags: ['野菜', '洋食'], is_fixed_time: false,
  },
  {
    id: 'm18', name: '茶碗蒸し',     category: '副菜',   standard_time: 25,
    calories: 65,   protein: 5.2,  salt: 0.8, fat: 2.1,  carbohydrate: 5.5,
    tags: ['卵', '和食'], is_fixed_time: false,
  },
  {
    id: 'm19', name: 'ひじきの煮物', category: '副菜',   standard_time: 20,
    calories: 55,   protein: 2.0,  salt: 0.7, fat: 1.5,  carbohydrate: 7.8,
    tags: ['海藻', '和食', '煮物'], is_fixed_time: false,
  },
  // ─── 汁物 ───────────────────────────────────────────────────────
  {
    id: 'm5',  name: '豆腐の味噌汁', category: '汁物',   standard_time: 10,
    calories: 45,   protein: 3.2,  salt: 1.0, fat: 1.5,  carbohydrate: 3.2,
    tags: ['大豆', '和食'], is_fixed_time: false,
  },
  {
    id: 'm10', name: 'なめこ汁',     category: '汁物',   standard_time: 10,
    calories: 30,   protein: 1.8,  salt: 1.0, fat: 0.5,  carbohydrate: 3.5,
    tags: ['きのこ', '和食'], is_fixed_time: false,
  },
  {
    id: 'm15', name: '豚汁',         category: '汁物',   standard_time: 20,
    calories: 128,  protein: 8.1,  salt: 1.3, fat: 5.0,  carbohydrate: 11.5,
    tags: ['肉', '和食'], is_fixed_time: false,
  },
  // ─── デザート ────────────────────────────────────────────────────
  {
    id: 'm12', name: 'ヨーグルト',   category: 'デザート', standard_time: 5,
    calories: 62,   protein: 3.6,  salt: 0.1, fat: 3.0,  carbohydrate: 4.9,
    tags: ['乳製品', '洋食'], is_fixed_time: true,
  },
  {
    id: 'm13', name: 'バナナ',       category: 'デザート', standard_time: 5,
    calories: 86,   protein: 1.1,  salt: 0.0, fat: 0.2,  carbohydrate: 22.5,
    tags: ['果物'], is_fixed_time: true,
  },
  {
    id: 'm20', name: 'りんご',       category: 'デザート', standard_time: 5,
    calories: 54,   protein: 0.1,  salt: 0.0, fat: 0.1,  carbohydrate: 14.3,
    tags: ['果物'], is_fixed_time: true,
  },
]

const menuMap = Object.fromEntries(MENUS.map(m => [m.id, m]))

function s(id: string, date: string, meal_type: Schedule['meal_type'], menu_id: string): Schedule {
  return { id, date, meal_type, menu_id, menu: menuMap[menu_id] }
}

export const SCHEDULES: Schedule[] = [
  // 2026-02-23 月
  s('s1',  '2026-02-23', '朝食', 'm1'),
  s('s2',  '2026-02-23', '朝食', 'm3'),
  s('s3',  '2026-02-23', '朝食', 'm5'),
  s('s4',  '2026-02-23', '昼食', 'm4'),
  s('s5',  '2026-02-23', '昼食', 'm1'),
  s('s6',  '2026-02-23', '昼食', 'm6'),
  s('s7',  '2026-02-23', '昼食', 'm10'),
  s('s8',  '2026-02-23', '夕食', 'm8'),
  s('s9',  '2026-02-23', '夕食', 'm1'),
  s('s10', '2026-02-23', '夕食', 'm11'),
  s('s11', '2026-02-23', '夕食', 'm15'),
  // 2026-02-24 火
  s('s12', '2026-02-24', '朝食', 'm2'),
  s('s13', '2026-02-24', '朝食', 'm9'),
  s('s14', '2026-02-24', '朝食', 'm12'),
  s('s15', '2026-02-24', '昼食', 'm7'),
  s('s16', '2026-02-24', '昼食', 'm1'),
  s('s17', '2026-02-24', '昼食', 'm14'),
  s('s18', '2026-02-24', '昼食', 'm5'),
  s('s19', '2026-02-24', '夕食', 'm17'),
  s('s20', '2026-02-24', '夕食', 'm6'),
  // 2026-02-25 水
  s('s21', '2026-02-25', '朝食', 'm1'),
  s('s22', '2026-02-25', '朝食', 'm3'),
  s('s23', '2026-02-25', '朝食', 'm10'),
  s('s24', '2026-02-25', '昼食', 'm16'),
  s('s25', '2026-02-25', '昼食', 'm11'),
  s('s26', '2026-02-25', '夕食', 'm4'),
  s('s27', '2026-02-25', '夕食', 'm1'),
  s('s28', '2026-02-25', '夕食', 'm18'),
  s('s29', '2026-02-25', '夕食', 'm5'),
  // 2026-02-26 木
  s('s30', '2026-02-26', '朝食', 'm2'),
  s('s31', '2026-02-26', '朝食', 'm12'),
  s('s32', '2026-02-26', '朝食', 'm13'),
  s('s33', '2026-02-26', '昼食', 'm8'),
  s('s34', '2026-02-26', '昼食', 'm1'),
  s('s35', '2026-02-26', '昼食', 'm19'),
  s('s36', '2026-02-26', '昼食', 'm15'),
  s('s37', '2026-02-26', '夕食', 'm7'),
  s('s38', '2026-02-26', '夕食', 'm1'),
  s('s39', '2026-02-26', '夕食', 'm6'),
  s('s40', '2026-02-26', '夕食', 'm10'),
  // 2026-02-27 金
  s('s41', '2026-02-27', '朝食', 'm1'),
  s('s42', '2026-02-27', '朝食', 'm9'),
  s('s43', '2026-02-27', '朝食', 'm5'),
  s('s44', '2026-02-27', '昼食', 'm17'),
  s('s45', '2026-02-27', '昼食', 'm14'),
  s('s46', '2026-02-27', '夕食', 'm3'),
  s('s47', '2026-02-27', '夕食', 'm1'),
  s('s48', '2026-02-27', '夕食', 'm11'),
  s('s49', '2026-02-27', '夕食', 'm15'),
  // 2026-02-28 土
  s('s50', '2026-02-28', '朝食', 'm2'),
  s('s51', '2026-02-28', '朝食', 'm9'),
  s('s52', '2026-02-28', '朝食', 'm20'),
  s('s53', '2026-02-28', '昼食', 'm4'),
  s('s54', '2026-02-28', '昼食', 'm1'),
  s('s55', '2026-02-28', '昼食', 'm18'),
  s('s56', '2026-02-28', '昼食', 'm5'),
  s('s57', '2026-02-28', '夕食', 'm16'),
  s('s58', '2026-02-28', '夕食', 'm19'),
  // 2026-03-01 日
  s('s59', '2026-03-01', '朝食', 'm1'),
  s('s60', '2026-03-01', '朝食', 'm3'),
  s('s61', '2026-03-01', '朝食', 'm5'),
  s('s62', '2026-03-01', '昼食', 'm8'),
  s('s63', '2026-03-01', '昼食', 'm1'),
  s('s64', '2026-03-01', '昼食', 'm6'),
  s('s65', '2026-03-01', '昼食', 'm10'),
  s('s66', '2026-03-01', '夕食', 'm4'),
  s('s67', '2026-03-01', '夕食', 'm1'),
  s('s68', '2026-03-01', '夕食', 'm18'),
  s('s69', '2026-03-01', '夕食', 'm5'),
]

export const RECORDS: WorkRecord[] = [
  {
    id: 'r1', schedule_id: 's1',
    prep_score: 7, measure_score: 6, cook_score: 8, serve_score: 9,
    total_time: 12, note: '手際よく盛り付けできた',
    created_at: '2026-02-23T07:30:00',
    schedule: { ...SCHEDULES[0], menu: menuMap['m1'] },
  },
  {
    id: 'r2', schedule_id: 's4',
    prep_score: 5, measure_score: 6, cook_score: 4, serve_score: 7,
    total_time: 42, note: '煮込み時間が予定より長かった。火加減の調整が必要',
    created_at: '2026-02-23T12:15:00',
    schedule: { ...SCHEDULES[3], menu: menuMap['m4'] },
  },
  {
    id: 'r3', schedule_id: 's8',
    prep_score: 3, measure_score: 5, cook_score: 4, serve_score: 6,
    total_time: 38, note: '油温管理が難しい。二度揚げの手順を標準化したい',
    created_at: '2026-02-23T17:45:00',
    schedule: { ...SCHEDULES[7], menu: menuMap['m8'] },
  },
  {
    id: 'r4', schedule_id: 's12',
    prep_score: 0, measure_score: 0, cook_score: 0, serve_score: 9,
    total_time: 5, note: 'パン系は効率よく準備できた（仕込み・計量・調理は不要）',
    created_at: '2026-02-24T07:20:00',
    schedule: { ...SCHEDULES[11], menu: menuMap['m2'] },
  },
  {
    id: 'r5', schedule_id: 's15',
    prep_score: 6, measure_score: 7, cook_score: 5, serve_score: 7,
    total_time: 28, note: '骨除去に時間がかかった',
    created_at: '2026-02-24T12:30:00',
    schedule: { ...SCHEDULES[14], menu: menuMap['m7'] },
  },
]

export const ISSUES: Issue[] = [
  {
    id: 'i1', menu_id: 'm4', date: '2026-02-10', status: '未対応',
    description: '煮込み時間が標準より20分多くかかる。じゃがいもの大きさにばらつきがある。',
    next_action: 'じゃがいもの切り方を統一し、標準サイズ（2cm角）を定める。',
    menu: menuMap['m4'],
  },
  {
    id: 'i2', menu_id: 'm8', date: '2026-02-05', status: '対応中',
    description: '揚げ油の温度管理が難しく、焼きムラが発生。仕込み時の下味時間が不足気味。',
    next_action: '油温計を厨房に常備。下味は前日から実施するフローに変更。',
    menu: menuMap['m8'],
  },
  {
    id: 'i3', menu_id: 'm16', date: '2026-01-20', status: '解決済',
    description: '食材の計量に15分以上かかっていた。',
    next_action: '前日に計量・小分けを済ませる手順を標準化 → 実施済み。7分に短縮。',
    menu: menuMap['m16'],
  },
  {
    id: 'i4', menu_id: 'm7', date: '2026-02-15', status: '未対応',
    description: '骨の除去作業が標準時間の倍以上かかる。高齢者向けには完全除骨が必要。',
    next_action: '骨なし加工済みの冷凍タラを発注元に確認・切り替え検討。',
    menu: menuMap['m7'],
  },
  {
    id: 'i5', menu_id: 'm17', date: '2026-02-20', status: '対応中',
    description: '塩分が2.0gで目安上限に近い。個別対応の取り分け作業に時間がかかる。',
    next_action: 'つゆの配合を見直し、塩分を1.5g以下に抑えるレシピ改訂。',
    menu: menuMap['m17'],
  },
]
