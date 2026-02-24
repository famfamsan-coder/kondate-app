-- ============================================================
-- kondate-app Supabase スキーマ
-- ※ Supabase SQL Editor で一度だけ実行してください
-- ============================================================

-- ─── テーブル定義 ───────────────────────────────────────────

-- メニューマスタ
create table if not exists "Menu" (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  category         text not null check (category in ('主食','主菜','副菜','汁物','デザート')),
  standard_time    integer not null default 0,    -- 標準作業時間（分）
  calories         numeric(7,1) not null default 0,
  protein          numeric(5,1) not null default 0,
  salt             numeric(4,1) not null default 0,
  fat              numeric(5,1) not null default 0,
  carbohydrate     numeric(5,1) not null default 0,
  tags             text[] not null default '{}',  -- タグ配列（例: ARRAY['魚','和食','煮物']）
  is_fixed_time    boolean not null default false, -- true = 定番メニュー（作業時間固定）
  created_at       timestamptz not null default now(),
  unique (name, category)                          -- シードの冪等実行のため
);

-- 献立スケジュール
create table if not exists "Schedule" (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  meal_type  text not null check (meal_type in ('朝食','昼食','夕食')),
  menu_id    uuid not null references "Menu"(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists schedule_date_idx on "Schedule"(date);

-- 現場評価・作業記録
create table if not exists "Record" (
  id             uuid primary key default gen_random_uuid(),
  schedule_id    uuid not null references "Schedule"(id) on delete cascade,
  prep_score     smallint not null check (prep_score between 0 and 10),    -- 0 = 不要
  measure_score  smallint not null check (measure_score between 0 and 10),
  cook_score     smallint not null check (cook_score between 0 and 10),
  serve_score    smallint not null check (serve_score between 0 and 10),
  total_time     integer,   -- 実作業時間（分）
  note           text,
  created_at     timestamptz not null default now()
);

-- 課題・PDCA管理
create table if not exists "Issue" (
  id          uuid primary key default gen_random_uuid(),
  menu_id     uuid not null references "Menu"(id) on delete cascade,
  date        date not null,
  description text not null,
  status      text not null default '未対応' check (status in ('未対応','対応中','解決済')),
  next_action text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists issue_menu_id_idx on "Issue"(menu_id);
create index if not exists issue_status_idx  on "Issue"(status);

-- updated_at 自動更新トリガー
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger issue_updated_at
  before update on "Issue"
  for each row execute function update_updated_at();


-- ─── シードデータ（Menu） ───────────────────────────────────
-- 同名・同カテゴリが既にある場合はスキップします（冪等）
-- ────────────────────────────────────────────────────────────

insert into "Menu" (name, category, standard_time, calories, protein, salt, fat, carbohydrate, tags, is_fixed_time)
values
  -- 主食
  ('白飯',         '主食', 10,  168.0,  2.5, 0.0,  0.3,  37.0, ARRAY['米','和食'],              true),
  ('食パン(2枚)',  '主食',  5,  264.0,  9.3, 1.4,  4.4,  46.2, ARRAY['パン','洋食'],            true),
  ('カレーライス', '主食', 40,  550.0, 18.2, 1.8, 12.0,  88.5, ARRAY['肉','洋食','カレー'],     false),
  ('親子丼',       '主食', 25,  478.0, 21.5, 2.0, 10.2,  68.5, ARRAY['肉','卵','和食','丼'],    false),
  -- 主菜
  ('焼き鮭',       '主菜', 20,  133.0, 20.1, 0.8,  5.1,   0.1, ARRAY['魚','和食','焼き物'],     false),
  ('肉じゃが',     '主菜', 35,  220.0, 12.0, 1.2,  7.5,  24.5, ARRAY['肉','和食','煮物'],       false),
  ('煮魚（タラ）', '主菜', 25,  110.0, 17.5, 1.5,  1.2,   3.5, ARRAY['魚','和食','煮物'],       false),
  ('鶏の唐揚げ',   '主菜', 30,  290.0, 19.8, 0.9, 15.2,  14.8, ARRAY['肉','揚げ物','和食'],    false),
  -- 副菜
  ('ほうれん草の胡麻和え', '副菜', 15, 58.0,  2.8, 0.4,  3.2,   4.5, ARRAY['野菜','和食'],      false),
  ('卵焼き',       '副菜', 15,   90.0,  6.5, 0.6,  6.1,   2.0, ARRAY['卵','和食'],              false),
  ('野菜炒め',     '副菜', 15,   82.0,  2.5, 0.5,  5.0,   7.2, ARRAY['野菜','中華'],            false),
  ('ポテトサラダ', '副菜', 20,  143.0,  2.3, 0.8,  8.2,  16.0, ARRAY['野菜','洋食'],            false),
  ('茶碗蒸し',     '副菜', 25,   65.0,  5.2, 0.8,  2.1,   5.5, ARRAY['卵','和食'],              false),
  ('ひじきの煮物', '副菜', 20,   55.0,  2.0, 0.7,  1.5,   7.8, ARRAY['海藻','和食','煮物'],     false),
  -- 汁物
  ('豆腐の味噌汁', '汁物', 10,   45.0,  3.2, 1.0,  1.5,   3.2, ARRAY['大豆','和食'],            false),
  ('なめこ汁',     '汁物', 10,   30.0,  1.8, 1.0,  0.5,   3.5, ARRAY['きのこ','和食'],          false),
  ('豚汁',         '汁物', 20,  128.0,  8.1, 1.3,  5.0,  11.5, ARRAY['肉','和食'],              false),
  -- デザート
  ('ヨーグルト',   'デザート',  5,  62.0,  3.6, 0.1,  3.0,   4.9, ARRAY['乳製品','洋食'],       true),
  ('バナナ',       'デザート',  5,  86.0,  1.1, 0.0,  0.2,  22.5, ARRAY['果物'],                true),
  ('りんご',       'デザート',  5,  54.0,  0.1, 0.0,  0.1,  14.3, ARRAY['果物'],                true)
on conflict (name, category) do nothing;
