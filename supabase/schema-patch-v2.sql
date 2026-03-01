-- ============================================================
-- schema-patch-v2.sql
-- 危険物施設点検表 / 厨房機器点検表 / 厨房清掃管理点検表 追加
-- TemperatureLog に assignee カラム追加
-- Supabase SQL Editor で実行してください。
-- ============================================================

-- ── 危険物施設点検表 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hazardouschecklog (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  date       date        UNIQUE NOT NULL,
  items      jsonb       NOT NULL DEFAULT '[]',
  confirmer  text        NOT NULL DEFAULT '',
  admin_sign text        NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER hazardouschecklog_updated_at
  BEFORE UPDATE ON hazardouschecklog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE hazardouschecklog ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_all ON hazardouschecklog
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── 厨房機器点検表 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipmentchecklog (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  date       date        UNIQUE NOT NULL,
  items      jsonb       NOT NULL DEFAULT '[]',
  confirmer  text        NOT NULL DEFAULT '',
  admin_sign text        NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER equipmentchecklog_updated_at
  BEFORE UPDATE ON equipmentchecklog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE equipmentchecklog ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_all ON equipmentchecklog
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── 厨房清掃管理点検表 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cleaningchecklog (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  date       date        UNIQUE NOT NULL,
  items      jsonb       NOT NULL DEFAULT '[]',
  assignee   text        NOT NULL DEFAULT '',
  admin_sign text        NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER cleaningchecklog_updated_at
  BEFORE UPDATE ON cleaningchecklog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE cleaningchecklog ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_all ON cleaningchecklog
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── temperaturelog（行単位・新規作成）────────────────────────
-- ※ 既存テーブルが古い jsonb 配列スキーマの場合は DROP して再作成してください。
--    DROP TABLE IF EXISTS temperaturelog;
CREATE TABLE IF NOT EXISTS temperaturelog (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  date        date    NOT NULL,
  slot        integer NOT NULL CHECK (slot BETWEEN 1 AND 7),
  temperature numeric,
  assignee    text    NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE (date, slot)
);

CREATE TRIGGER temperaturelog_updated_at
  BEFORE UPDATE ON temperaturelog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE temperaturelog ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_all ON temperaturelog
  FOR ALL TO anon USING (true) WITH CHECK (true);
