const assert = require("node:assert/strict");
const test = require("node:test");

const translations = require("../src/data/translations.js");
const {
  createTranslationEngine,
} = require("../src/content/translation-engine.js");

test("loads the synchronized exact and pattern entries", () => {
  const engine = createTranslationEngine(translations);

  assert.equal(engine.exactEntryCount, 4263);
  assert.equal(engine.patternEntryCount, 102);
});

test("prefers an exact translation over a matching pattern", () => {
  const engine = createTranslationEngine([
    ["{@} days", "{1} 天"],
    ["2 days", "兩天"],
  ]);

  assert.equal(engine.translateText("2 days"), "兩天");
});

test("fills multiple numbered placeholders in translated word order", () => {
  const engine = createTranslationEngine([
    ["Move {@} to {@}", "將 {2} 移到 {1}"],
  ]);

  assert.equal(engine.translateText("Move Alpha to Beta"), "將 Beta 移到 Alpha");
});

test("translates an exact dynamic capture before filling the template", () => {
  const engine = createTranslationEngine([
    ["Education", "教育版"],
    ["Anyone in {@}", "「{1}」中的任何人"],
  ]);

  assert.equal(
    engine.translateText("Anyone in Education"),
    "「教育版」中的任何人"
  );
});

test("preserves capture whitespace when translating its core value", () => {
  const engine = createTranslationEngine([
    ["Drafts", "草稿"],
    ["Open {@} now", "立即開啟 {1}"],
  ]);

  assert.equal(engine.translateText("Open  Drafts  now"), "立即開啟  草稿 ");
});

test("treats regex punctuation in patterns as literal text", () => {
  const engine = createTranslationEngine([
    ["Value ({@})?", "值：{1}"],
  ]);

  assert.equal(engine.translateText("Value (42)?"), "值：42");
  assert.equal(engine.translateText("Value 42?"), null);
});

test("allows a dynamic value to span multiple lines", () => {
  const engine = createTranslationEngine([
    ["Before {@} after", "之前：{1}：之後"],
  ]);

  assert.equal(
    engine.translateText("Before first\nsecond after"),
    "之前：first\nsecond：之後"
  );
});

test("supports legacy templates that use {@} instead of numbered slots", () => {
  const engine = createTranslationEngine([
    ["{@} of {@}", "{@}／{@}"],
  ]);

  assert.equal(engine.translateText("2 of 5"), "2／5");
});

test("keeps the first duplicate exact or pattern entry", () => {
  const engine = createTranslationEngine([
    ["Open", "開啟"],
    ["Open", "打開"],
    ["{@} days", "{1} 天"],
    ["{@} days", "{1} 日"],
  ]);

  assert.equal(engine.translateText("Open"), "開啟");
  assert.equal(engine.translateText("3 days"), "3 天");
});

test("matches the most specific dynamic phrase first", () => {
  const engine = createTranslationEngine([
    ["{@} minute ago", "{1} 分鐘前"],
    ["Edited {@} minute ago", "{1} 分鐘前編輯"],
    ["Move {@} files", "移動 {1} 個檔案"],
    ["Move file {@} files", "移動 {1} 個檔案"],
  ]);

  assert.equal(engine.translateText("Edited 1 minute ago"), "1 分鐘前編輯");
  assert.equal(engine.translateText("Move file 7 files"), "移動 7 個檔案");
});

test("translates new upstream UI terms and numbered phrases", () => {
  const engine = createTranslationEngine(translations);

  assert.equal(engine.translateText("Verify"), "驗證");
  assert.equal(engine.translateText("Shared folders"), "共用資料夾");
  assert.equal(engine.translateText("Create new slide"), "建立新投影片");
  assert.equal(engine.translateText("12 columns  (auto)"), "12 欄（自動）");
  assert.equal(engine.translateText("23 minutes ago"), "23 分鐘前");
  assert.equal(engine.translateText("Can edit 12 files"), "可編輯 12 個檔案");
  assert.equal(engine.translateText("Add skill"), "新增技能");
  assert.equal(engine.translateText("Shared chat"), "共用聊天");
  assert.equal(engine.translateText("Upload local fonts"), "上傳本機字型");
  assert.equal(engine.translateText("Connectors"), "連接器");
});

test("matches synchronized multi-value translations", () => {
  const engine = createTranslationEngine(translations);

  assert.equal(engine.translateText("Step 2 of 5"), "第 2 步，共 5 步");
  assert.equal(engine.translateText("Comment (8 unread)"), "評論（8 則未讀）");
  assert.equal(engine.translateText("No untranslated phrase"), null);
});

test("uses consistent Taiwan terminology for UI labels and status messages", () => {
  const engine = createTranslationEngine(translations);

  assert.equal(engine.translateText("Bent connector"), "彎曲連接線");
  assert.equal(engine.translateText("Curved connector"), "曲線連接線");
  assert.equal(
    engine.translateText("Straight connector or line"),
    "直線連接線或線條"
  );
  assert.equal(engine.translateText("Component details"), "元件詳細資訊");
  assert.equal(engine.translateText("Documentation"), "說明文件");
  assert.equal(engine.translateText("Documentation link"), "說明文件連結");
  assert.equal(engine.translateText("Multiple documents"), "多份文件");
  assert.equal(
    engine.translateText(
      "The current document has unsaved changes. Figma will continue trying to save in the background. Please try again later."
    ),
    "目前文件有未儲存的變更。Figma 將繼續在背景嘗試儲存。請稍後再試。"
  );
  assert.equal(
    engine.translateText(
      "By providing your phone number, you agree to receive text messages from Figma to enable two-factor authentication when you log in. Message and data rates may apply."
    ),
    "提供電話號碼即表示您同意在登入時接收 Figma 傳送的簡訊，以啟用兩步驗證。電信業者可能收取簡訊及數據傳輸費用。"
  );
});
