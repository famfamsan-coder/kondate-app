-- ============================================================
-- kondate-app Supabase スキーマ（v3 — MenuItem 縦持ち設計）
-- ※ Supabase SQL Editor で一度だけ実行してください
-- 既存テーブルがある場合は DROP してから実行してください:
--   DROP TABLE IF EXISTS "Ooda", "Record", "DailyMeal", "Issue", "MenuItem" CASCADE;
-- ============================================================

-- ─── テーブル定義 ───────────────────────────────────────────

-- 1料理1行（縦持ち）献立・作業記録統合テーブル
create table if not exists "MenuItem" (
  id           uuid primary key default gen_random_uuid(),
  date         date not null,
  meal_type    text not null check (meal_type in ('朝食','昼食','夕食')),
  menu_name    text not null default '',   -- 料理名
  category     text not null default '',   -- カテゴリ（自由テキスト、制約なし）
  prep_time    integer not null default 0, -- 仕込み時間（分）
  measure_time integer not null default 0, -- 計量時間（分）
  cook_time    integer not null default 0, -- 調理時間（分）
  serve_time   integer not null default 0, -- 盛り付け時間（分）
  tags         text[]  not null default '{}', -- タグ（例: {"肉","アレルゲン"}）
  note         text    not null default '',    -- 注意事項（マニュアル的な事前メモ）
  comment      text    not null default '',    -- 改善メモ（当日の出来栄え・気づき）
  created_at   timestamptz not null default now()
  -- UNIQUE制約なし：1食事に複数メニューOK
);
create index if not exists menu_item_date_idx      on "MenuItem"(date);
create index if not exists menu_item_date_meal_idx on "MenuItem"(date, meal_type);
create index if not exists menu_item_created_idx   on "MenuItem"(created_at);

-- 課題・PDCA管理
create table if not exists "Issue" (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  description text not null,
  status      text not null default '未対応' check (status in ('未対応','対応中','解決済')),
  next_action text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists issue_status_idx on "Issue"(status);

-- updated_at 自動更新トリガー
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists issue_updated_at on "Issue";
create trigger issue_updated_at
  before update on "Issue"
  for each row execute function update_updated_at();

-- OODAボード（業務改善ループ管理）
-- menu_item_id は null 許容 — null の場合は献立に紐づかない全般的な課題
create table if not exists "Ooda" (
  id            uuid primary key default gen_random_uuid(),
  menu_item_id  uuid references "MenuItem"(id) on delete set null,
  title         text not null,
  content       text not null default '',
  category      text not null default 'その他'
                  check (category in ('献立', '備品・お皿', '動線・環境', 'マニュアル作成', '衛生・整理・整頓', 'その他')),
  status        text not null default 'Observe'
                  check (status in ('Observe', 'Orient', 'Decide', 'Act')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists ooda_menu_item_id_idx on "Ooda"(menu_item_id);
create index if not exists ooda_status_idx       on "Ooda"(status);

drop trigger if exists ooda_updated_at on "Ooda";
create trigger ooda_updated_at
  before update on "Ooda"
  for each row execute function update_updated_at();


-- 温度管理記録（冷蔵庫6・冷凍庫6スロット、jsonb配列）
create table if not exists "TemperatureLog" (
  id         uuid        primary key default gen_random_uuid(),
  date       date        unique not null,
  fridge     jsonb       not null default '[]'::jsonb,
  freezer    jsonb       not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists temperature_log_updated_at on "TemperatureLog";
create trigger temperature_log_updated_at
  before update on "TemperatureLog"
  for each row execute function update_updated_at();

-- 最終点検チェック（items は [{key,label,checked}] の jsonb 配列）
create table if not exists "FinalCheckLog" (
  id         uuid        primary key default gen_random_uuid(),
  date       date        unique not null,
  items      jsonb       not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists final_check_log_updated_at on "FinalCheckLog";
create trigger final_check_log_updated_at
  before update on "FinalCheckLog"
  for each row execute function update_updated_at();

-- 日次お知らせ（朝礼メモ）— date が一意キー、同日は upsert で上書き
create table if not exists "DailyNotice" (
  id         uuid        primary key default gen_random_uuid(),
  date       date        unique not null,
  content    text        not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists daily_notice_updated_at on "DailyNotice";
create trigger daily_notice_updated_at
  before update on "DailyNotice"
  for each row execute function update_updated_at();

-- ============================================================
-- RLS ポリシー（開発・デモ用）
-- ============================================================
-- ⚠ 本番環境では認証ベースのポリシーに必ず切り替えてください。
-- ============================================================

alter table "MenuItem"        enable row level security;
alter table "Issue"           enable row level security;
alter table "Ooda"            enable row level security;
alter table "DailyNotice"     enable row level security;
alter table "TemperatureLog"  enable row level security;
alter table "FinalCheckLog"   enable row level security;

drop policy if exists "anon_all" on "MenuItem";
drop policy if exists "anon_all" on "Issue";
drop policy if exists "anon_all" on "Ooda";
drop policy if exists "anon_all" on "DailyNotice";
drop policy if exists "anon_all" on "TemperatureLog";
drop policy if exists "anon_all" on "FinalCheckLog";

create policy "anon_all" on "MenuItem"       for all to anon using (true) with check (true);
create policy "anon_all" on "Issue"          for all to anon using (true) with check (true);
create policy "anon_all" on "Ooda"           for all to anon using (true) with check (true);
create policy "anon_all" on "DailyNotice"    for all to anon using (true) with check (true);
create policy "anon_all" on "TemperatureLog" for all to anon using (true) with check (true);
create policy "anon_all" on "FinalCheckLog"  for all to anon using (true) with check (true);
