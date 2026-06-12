const translationEntries = window.figmaTranslations;

if (Array.isArray(translationEntries)) {
  initializeTranslator(translationEntries);
} else {
  console.error("Figma zh-TW: Translation data is unavailable.");
}

function initializeTranslator(translationEntries) {
  const MutationObserverConstructor =
    window.MutationObserver || window["WebKitMutationObserver"];

  if (!MutationObserverConstructor) {
    console.error("Figma zh-TW: MutationObserver is unavailable.");
    return;
  }

  if (!document.body) {
    document.addEventListener(
      "DOMContentLoaded",
      () => initializeTranslator(translationEntries),
      { once: true }
    );
    return;
  }

  const translationsBySourceText = new Map();
  translationEntries.forEach(([sourceText, translatedText]) => {
    if (sourceText && !translationsBySourceText.has(sourceText)) {
      translationsBySourceText.set(sourceText, translatedText);
    }
  });

  const NODE_TYPE = {
    TEXT_NODE: 3,
  };

  const TRANSLATABLE_ATTRIBUTES = ["data-label", "placeholder"];
  const VARIABLE_NAME_CLASS_FRAGMENT = "variable_name--root";

  function hasVariableNameClass(node) {
    return (
      node.classList &&
      Array.from(node.classList).some((className) =>
        className.includes(VARIABLE_NAME_CLASS_FRAGMENT)
      )
    );
  }

  function isInsideUntranslatableRegion(node) {
    let currentElement =
      node.nodeType === NODE_TYPE.TEXT_NODE ? node.parentElement : node;

    while (currentElement && currentElement !== document.body) {
      if (
        typeof currentElement.getAttribute === "function" &&
        currentElement.getAttribute("translate") === "no"
      ) {
        return true;
      }

      currentElement = currentElement.parentElement;
    }

    return false;
  }

  function shouldSkipSubtree(node) {
    return hasVariableNameClass(node) || isInsideUntranslatableRegion(node);
  }

  function getTranslation(sourceText) {
    if (!sourceText) return null;
    return translationsBySourceText.has(sourceText)
      ? translationsBySourceText.get(sourceText)
      : null;
  }

  function translateTextNode(node) {
    if (isInsideUntranslatableRegion(node)) return;

    const translatedText = getTranslation(node.textContent);
    if (translatedText !== null) node.textContent = translatedText;
  }

  function translateElement(node) {
    if (
      typeof node.getAttribute !== "function" ||
      isInsideUntranslatableRegion(node)
    ) {
      return;
    }

    const labelText = node.getAttribute("data-label");
    const translatedLabelText = getTranslation(labelText);
    if (translatedLabelText !== null) {
      node.setAttribute("data-label", translatedLabelText);
    }

    const placeholderText = (node.getAttribute("placeholder") || "").trim();
    const translatedPlaceholderText = getTranslation(placeholderText);
    if (translatedPlaceholderText !== null) {
      node.setAttribute("placeholder", translatedPlaceholderText);
    }
  }

  function translateNode(node) {
    if (node.nodeType === NODE_TYPE.TEXT_NODE) {
      translateTextNode(node);
      return;
    }

    translateElement(node);
  }

  function translateSubtree(root) {
    if (!root || shouldSkipSubtree(root)) return;

    translateNode(root);

    if (root.nodeType === NODE_TYPE.TEXT_NODE) return;

    const treeWalker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ALL,
      {
        acceptNode: function (node) {
          if (hasVariableNameClass(node)) {
            return NodeFilter.FILTER_REJECT;
          }

          if (isInsideUntranslatableRegion(node)) {
            return NodeFilter.FILTER_REJECT;
          }

          if (node.nodeType === NODE_TYPE.TEXT_NODE) {
            return NodeFilter.FILTER_ACCEPT;
          }

          if (typeof node.hasAttribute !== "function")
            return NodeFilter.FILTER_SKIP;

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
      if (root.isConnected !== false) {
        translateSubtree(root);
      }
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

  const observer = new MutationObserverConstructor(function (mutations) {
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
