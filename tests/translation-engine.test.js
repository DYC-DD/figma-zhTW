const assert = require("node:assert/strict");
const test = require("node:test");

const translations = require("../src/data/translations.js");
const {
  createTranslationEngine,
} = require("../src/content/translation-engine.js");

test("loads the synchronized exact and pattern entries", () => {
  const engine = createTranslationEngine(translations);

  assert.equal(engine.exactEntryCount, 4328);
  assert.equal(engine.patternEntryCount, 54);
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

test("matches synchronized multi-value translations", () => {
  const engine = createTranslationEngine(translations);

  assert.equal(engine.translateText("Step 2 of 5"), "第 2 步，共 5 步");
  assert.equal(engine.translateText("Comment (8 unread)"), "評論（8 則未讀）");
  assert.equal(engine.translateText("No untranslated phrase"), null);
});
