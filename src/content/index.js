const translationEntries = window.figmaTranslations;
const translationEngineApi = window.FigmaZhTWTranslationEngine;

if (!Array.isArray(translationEntries)) {
  console.error("Figma zh-TW: Translation data is unavailable.");
} else if (
  !translationEngineApi ||
  typeof translationEngineApi.createTranslationEngine !== "function"
) {
  console.error("Figma zh-TW: Translation engine is unavailable.");
} else {
  initializeTranslator(
    translationEntries,
    translationEngineApi.createTranslationEngine
  );
}

function initializeTranslator(translationEntries, createTranslationEngine) {
  const MutationObserverConstructor =
    window.MutationObserver || window["WebKitMutationObserver"];

  if (!MutationObserverConstructor) {
    console.error("Figma zh-TW: MutationObserver is unavailable.");
    return;
  }

  if (!document.body) {
    document.addEventListener(
      "DOMContentLoaded",
      () => initializeTranslator(translationEntries, createTranslationEngine),
      { once: true }
    );
    return;
  }

  const translationEngine = createTranslationEngine(translationEntries);
  const NODE_TYPE = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
  };
  const TRANSLATABLE_ATTRIBUTES = [
    "data-label",
    "placeholder",
    "data-placeholder",
    "aria-label",
    "data-tooltip",
  ];
  const VARIABLE_NAME_CLASS_FRAGMENT = "variable_name--root";
  const lastTextTranslations = new WeakMap();
  const lastAttributeTranslations = new WeakMap();
  const lastI18nTranslations = new WeakMap();

  function hasVariableNameClass(node) {
    return (
      node.classList &&
      Array.from(node.classList).some((className) =>
        className.includes(VARIABLE_NAME_CLASS_FRAGMENT)
      )
    );
  }

  function isCodeEditorElement(element) {
    if (!element || typeof element.getAttribute !== "function") return false;

    const tagName = element.tagName;
    const className =
      typeof element.className === "string" ? element.className : "";

    return (
      element.isContentEditable ||
      element.getAttribute("role") === "textbox" ||
      tagName === "PRE" ||
      tagName === "CODE" ||
      /code|monaco|codemirror/i.test(className)
    );
  }

  function getElementForNode(node) {
    if (node.nodeType === NODE_TYPE.ELEMENT_NODE) return node;
    return node.parentElement || null;
  }

  function isInsideCodeEditor(node) {
    let currentElement = getElementForNode(node);

    while (currentElement && currentElement !== document.body) {
      if (
        currentElement.getAttribute("translate") === "no" &&
        isCodeEditorElement(currentElement)
      ) {
        return true;
      }
      currentElement = currentElement.parentElement;
    }

    return false;
  }

  function isInsideVariableNameArea(node) {
    let currentElement = getElementForNode(node);

    while (currentElement && currentElement !== document.body) {
      if (hasVariableNameClass(currentElement)) return true;
      currentElement = currentElement.parentElement;
    }

    return false;
  }

  function isEditableRoot(node) {
    return (
      node &&
      node.nodeType === NODE_TYPE.ELEMENT_NODE &&
      typeof node.getAttribute === "function" &&
      node.getAttribute("contenteditable") === "true" &&
      node.isContentEditable
    );
  }

  function isInsideEditableArea(node) {
    let currentElement = getElementForNode(node);

    while (currentElement && currentElement !== document.body) {
      if (currentElement.isContentEditable) {
        return !(currentElement === node && isEditableRoot(node));
      }
      currentElement = currentElement.parentElement;
    }

    return false;
  }

  function shouldSkipTranslation(node) {
    return (
      isInsideCodeEditor(node) ||
      isInsideVariableNameArea(node) ||
      isInsideEditableArea(node)
    );
  }

  function translateTextNode(node) {
    if (shouldSkipTranslation(node)) return;

    const sourceText = node.textContent;
    if (lastTextTranslations.get(node) === sourceText) return;

    const translatedText = translationEngine.translateText(sourceText);
    if (translatedText !== null && translatedText !== sourceText) {
      node.textContent = translatedText;
      lastTextTranslations.set(node, translatedText);
    }
  }

  function preserveOuterWhitespace(sourceText, translatedText) {
    const whitespaceMatch = sourceText.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!whitespaceMatch) return translatedText;
    return whitespaceMatch[1] + translatedText + whitespaceMatch[3];
  }

  function translateAttribute(node, attributeName) {
    if (
      typeof node.getAttribute !== "function" ||
      shouldSkipTranslation(node)
    ) {
      return;
    }

    const sourceText = node.getAttribute(attributeName);
    if (!sourceText) return;

    const translatedAttributes = lastAttributeTranslations.get(node);
    if (translatedAttributes?.get(attributeName) === sourceText) return;

    let translatedText = translationEngine.translateText(sourceText);
    if (translatedText === null && attributeName === "placeholder") {
      const trimmedSourceText = sourceText.trim();
      translatedText = translationEngine.translateText(trimmedSourceText);
      if (translatedText !== null) {
        translatedText = preserveOuterWhitespace(sourceText, translatedText);
      }
    }

    if (translatedText === null || translatedText === sourceText) return;

    node.setAttribute(attributeName, translatedText);
    const updatedTranslations = translatedAttributes || new Map();
    updatedTranslations.set(attributeName, translatedText);
    if (!translatedAttributes) {
      lastAttributeTranslations.set(node, updatedTranslations);
    }
  }

  function translateI18nText(element) {
    if (shouldSkipTranslation(element)) return;

    const initialText = element.textContent;
    if (lastI18nTranslations.get(element) === initialText) return;

    if (element.childElementCount === 0) {
      const translatedText = translationEngine.translateText(initialText);
      if (translatedText !== null && translatedText !== initialText) {
        element.textContent = translatedText;
        lastI18nTranslations.set(element, translatedText);
      }
      return;
    }

    const childElements = Array.from(element.children);
    childElements.forEach(translateSubtree);

    let normalizedSourceText = initialText;
    const childTranslations = childElements
      .map((childElement) => {
        const translatedText = childElement.textContent;
        return {
          sourceText: translationEngine.getSourceText(translatedText),
          translatedText,
        };
      })
      .filter(({ sourceText, translatedText }) => sourceText && translatedText)
      .sort(
        (left, right) =>
          right.translatedText.length - left.translatedText.length
      );

    childTranslations.forEach(({ sourceText, translatedText }) => {
      normalizedSourceText = normalizedSourceText
        .split(translatedText)
        .join(sourceText);
    });

    const translatedText = translationEngine.translateText(normalizedSourceText);
    if (translatedText === null || translatedText === initialText) return;

    const fragment = document.createDocumentFragment();
    let cursor = 0;

    for (const childElement of childElements) {
      const childText = childElement.textContent;
      if (!childText) continue;

      const childIndex = translatedText.indexOf(childText, cursor);
      if (childIndex === -1) return;

      if (childIndex > cursor) {
        fragment.appendChild(
          document.createTextNode(translatedText.slice(cursor, childIndex))
        );
      }
      fragment.appendChild(childElement);
      cursor = childIndex + childText.length;
    }

    if (cursor < translatedText.length) {
      fragment.appendChild(document.createTextNode(translatedText.slice(cursor)));
    }

    element.replaceChildren(fragment);
    lastI18nTranslations.set(element, element.textContent);
  }

  function translateElement(node) {
    if (
      typeof node.getAttribute !== "function" ||
      shouldSkipTranslation(node)
    ) {
      return;
    }

    if (node.tagName === "I18N-TEXT") {
      translateI18nText(node);
    }

    TRANSLATABLE_ATTRIBUTES.forEach((attributeName) => {
      if (node.hasAttribute(attributeName)) {
        translateAttribute(node, attributeName);
      }
    });
  }

  function translateNode(node) {
    if (node.nodeType === NODE_TYPE.TEXT_NODE) {
      translateTextNode(node);
    } else {
      translateElement(node);
    }
  }

  function translateSubtree(root) {
    if (!root || shouldSkipTranslation(root)) return;

    translateNode(root);
    if (root.nodeType === NODE_TYPE.TEXT_NODE) return;

    const treeWalker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ALL,
      {
        acceptNode(node) {
          if (hasVariableNameClass(node)) {
            return NodeFilter.FILTER_REJECT;
          }

          const isTextNode = node.nodeType === NODE_TYPE.TEXT_NODE;
          if (
            (isTextNode || typeof node.hasAttribute === "function") &&
            shouldSkipTranslation(node)
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          if (isTextNode) return NodeFilter.FILTER_ACCEPT;
          if (typeof node.hasAttribute !== "function") {
            return NodeFilter.FILTER_SKIP;
          }

          if (node.tagName === "I18N-TEXT") {
            return NodeFilter.FILTER_ACCEPT;
          }

          const hasTranslatableAttribute = TRANSLATABLE_ATTRIBUTES.some(
            (attributeName) => node.hasAttribute(attributeName)
          );
          return hasTranslatableAttribute
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        },
      },
      false
    );

    let currentNode = treeWalker.nextNode();
    while (currentNode) {
      translateNode(currentNode);
      currentNode = treeWalker.nextNode();
    }
  }

  const pendingTranslationRoots = new Set();
  let scheduledFrameId = null;

  function scheduleNextFrame(callback) {
    if (typeof window.requestAnimationFrame === "function") {
      return window.requestAnimationFrame(callback);
    }
    return window.setTimeout(callback, 16);
  }

  function containsNode(parentNode, childNode) {
    return (
      parentNode === childNode ||
      (typeof parentNode.contains === "function" &&
        parentNode.contains(childNode))
    );
  }

  function flushPendingTranslations() {
    scheduledFrameId = null;
    pendingTranslationRoots.forEach((root) => {
      if (root.isConnected !== false) translateSubtree(root);
    });
    pendingTranslationRoots.clear();
  }

  function scheduleTranslation(root) {
    if (!root || root.isConnected === false) return;

    for (const pendingRoot of pendingTranslationRoots) {
      if (containsNode(pendingRoot, root)) return;
      if (containsNode(root, pendingRoot)) {
        pendingTranslationRoots.delete(pendingRoot);
      }
    }

    pendingTranslationRoots.add(root);
    if (scheduledFrameId === null) {
      scheduledFrameId = scheduleNextFrame(flushPendingTranslations);
    }
  }

  const observer = new MutationObserverConstructor((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach(scheduleTranslation);
      } else if (mutation.target) {
        scheduleTranslation(mutation.target);
      }
    });
  });

  translateSubtree(document.body);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: TRANSLATABLE_ATTRIBUTES,
    characterData: true,
  });
}
