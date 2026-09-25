(function attachTranslationEngine(root) {
  "use strict";

  const PATTERN_TOKEN = "{@}";

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function compilePattern(sourceText, translatedTemplate) {
    const literalParts = sourceText.split(PATTERN_TOKEN);
    const captureCount = literalParts.length - 1;
    const expression = literalParts.map(escapeRegExp).join("([\\s\\S]+?)");

    return {
      captureCount,
      literalLength: literalParts.join("").length,
      regex: new RegExp(`^${expression}$`),
      template: translatedTemplate,
    };
  }

  function createTranslationEngine(translationEntries) {
    const translationsBySourceText = new Map();
    const sourceTextByTranslation = new Map();
    const patternEntries = [];
    const seenSourceTexts = new Set();

    translationEntries.forEach(([sourceText, translatedText]) => {
      if (
        typeof sourceText !== "string" ||
        sourceText.length === 0 ||
        seenSourceTexts.has(sourceText)
      ) {
        return;
      }

      seenSourceTexts.add(sourceText);

      if (sourceText.includes(PATTERN_TOKEN)) {
        patternEntries.push(compilePattern(sourceText, translatedText));
        return;
      }

      translationsBySourceText.set(sourceText, translatedText);
      if (!sourceTextByTranslation.has(translatedText)) {
        sourceTextByTranslation.set(translatedText, sourceText);
      }
    });

    // Match a more specific phrase before a shorter pattern embedded in it.
    patternEntries.sort((a, b) => b.literalLength - a.literalLength);

    function translateCapturedValue(capturedValue) {
      if (translationsBySourceText.has(capturedValue)) {
        return translationsBySourceText.get(capturedValue);
      }

      const whitespaceMatch = capturedValue.match(/^(\s*)([\s\S]*?)(\s*)$/);
      if (!whitespaceMatch) return capturedValue;

      const [, leadingWhitespace, coreValue, trailingWhitespace] =
        whitespaceMatch;
      if (!translationsBySourceText.has(coreValue)) return capturedValue;

      return (
        leadingWhitespace +
        translationsBySourceText.get(coreValue) +
        trailingWhitespace
      );
    }

    function fillPatternTemplate(template, capturedValues) {
      const translatedCaptures = capturedValues.map(translateCapturedValue);
      const hasNumberedPlaceholders = /\{[1-9]\d*\}/.test(template);

      if (hasNumberedPlaceholders) {
        return template.replace(/\{([1-9]\d*)\}/g, (placeholder, index) => {
          const capturedValue = translatedCaptures[Number(index) - 1];
          return capturedValue === undefined ? placeholder : capturedValue;
        });
      }

      let captureIndex = 0;
      return template.replace(/\{@\}/g, () => {
        const capturedValue = translatedCaptures[captureIndex];
        captureIndex += 1;
        return capturedValue === undefined ? PATTERN_TOKEN : capturedValue;
      });
    }

    function translateText(sourceText) {
      if (typeof sourceText !== "string") return null;

      if (translationsBySourceText.has(sourceText)) {
        return translationsBySourceText.get(sourceText);
      }

      for (const patternEntry of patternEntries) {
        const match = sourceText.match(patternEntry.regex);
        if (!match) continue;

        const capturedValues = match.slice(1, patternEntry.captureCount + 1);
        return fillPatternTemplate(patternEntry.template, capturedValues);
      }

      return null;
    }

    return Object.freeze({
      exactEntryCount: translationsBySourceText.size,
      getSourceText(translatedText) {
        return sourceTextByTranslation.get(translatedText) || null;
      },
      patternEntryCount: patternEntries.length,
      translateText,
    });
  }

  const api = Object.freeze({ createTranslationEngine });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.FigmaZhTWTranslationEngine = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
