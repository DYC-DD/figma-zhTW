const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const translations = require("../src/data/translations.js");
const translationEngineApi = require("../src/content/translation-engine.js");

const NodeFilter = {
  SHOW_ALL: 0xffffffff,
  FILTER_ACCEPT: 1,
  FILTER_REJECT: 2,
  FILTER_SKIP: 3,
};

class FakeNode {
  constructor(nodeType) {
    this.nodeType = nodeType;
    this.parentElement = null;
    this.isConnected = true;
  }

  contains(node) {
    if (node === this) return true;
    return (this.childNodes || []).some((child) => child.contains(node));
  }
}

class FakeText extends FakeNode {
  constructor(textContent) {
    super(3);
    this.textContent = textContent;
  }
}

class FakeComment extends FakeNode {
  constructor(textContent) {
    super(8);
    this.textContent = textContent;
  }
}

class FakeElement extends FakeNode {
  constructor(tagName, attributes = {}) {
    super(1);
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map(Object.entries(attributes));
    this.childNodes = [];
    this.className = attributes.class || "";
    this.classList = this.className ? this.className.split(/\s+/) : [];
    this.isContentEditable = attributes.contenteditable === "true";
  }

  appendChild(node) {
    node.parentElement = this;
    node.isConnected = this.isConnected;
    this.childNodes.push(node);
    return node;
  }

  get children() {
    return this.childNodes.filter((node) => node.nodeType === 1);
  }

  get childElementCount() {
    return this.children.length;
  }

  get textContent() {
    return this.childNodes.map((node) => node.textContent).join("");
  }

  set textContent(value) {
    this.childNodes.forEach((node) => {
      node.parentElement = null;
      node.isConnected = false;
    });
    this.childNodes = [];
    this.appendChild(new FakeText(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  replaceChildren(fragment) {
    this.childNodes = [];
    fragment.childNodes.slice().forEach((node) => this.appendChild(node));
  }
}

class FakeFragment extends FakeNode {
  constructor() {
    super(11);
    this.childNodes = [];
  }

  appendChild(node) {
    this.childNodes.push(node);
    return node;
  }
}

class FakeDocument {
  constructor(body) {
    this.body = body;
  }

  addEventListener() {}

  createDocumentFragment() {
    return new FakeFragment();
  }

  createTextNode(value) {
    return new FakeText(value);
  }

  createTreeWalker(root, _whatToShow, filter) {
    const acceptedNodes = [];

    function visit(parent) {
      for (const child of parent.childNodes || []) {
        const decision = filter.acceptNode(child);
        if (decision === NodeFilter.FILTER_ACCEPT) acceptedNodes.push(child);
        if (decision !== NodeFilter.FILTER_REJECT) visit(child);
      }
    }

    visit(root);
    let index = 0;
    return {
      nextNode() {
        const node = acceptedNodes[index] || null;
        index += 1;
        return node;
      },
    };
  }
}

class FakeMutationObserver {
  static instances = [];

  constructor(callback) {
    this.callback = callback;
    this.observed = null;
    FakeMutationObserver.instances.push(this);
  }

  observe(target, options) {
    this.observed = { options, target };
  }
}

function elementWithText(tagName, text, attributes) {
  const element = new FakeElement(tagName, attributes);
  element.appendChild(new FakeText(text));
  return element;
}

test("content script translates dynamic text and supported attributes", () => {
  FakeMutationObserver.instances = [];
  const body = new FakeElement("body");
  const dynamicText = elementWithText("div", "Step 2 of 5");
  const regularTranslateNo = elementWithText("div", "Apps", {
    translate: "no",
  });
  const codeEditor = elementWithText("pre", "Apps", { translate: "no" });
  const variableName = elementWithText("div", "Apps", {
    class: "variable_name--root-test",
  });
  const editable = elementWithText("div", "Apps", {
    contenteditable: "true",
  });
  const input = new FakeElement("input", {
    "aria-label": "Apps",
    "data-label": "Add motion",
    "data-placeholder": "Apps",
    "data-tooltip": "Add motion",
    placeholder: "  Apps  ",
  });
  const i18nText = elementWithText("i18n-text", "Apps");
  const comment = new FakeComment("Apps");

  [
    dynamicText,
    regularTranslateNo,
    codeEditor,
    variableName,
    editable,
    input,
    i18nText,
    comment,
  ].forEach((node) => body.appendChild(node));

  const document = new FakeDocument(body);
  const window = {
    FigmaZhTWTranslationEngine: translationEngineApi,
    MutationObserver: FakeMutationObserver,
    figmaTranslations: translations,
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    setTimeout,
  };
  const source = fs.readFileSync(
    path.join(__dirname, "../src/content/index.js"),
    "utf8"
  );

  vm.runInNewContext(source, {
    NodeFilter,
    console,
    document,
    window,
  });

  assert.equal(dynamicText.textContent, "第 2 步，共 5 步");
  assert.equal(regularTranslateNo.textContent, "應用程式");
  assert.equal(codeEditor.textContent, "Apps");
  assert.equal(variableName.textContent, "Apps");
  assert.equal(editable.textContent, "Apps");
  assert.equal(i18nText.textContent, "應用程式");
  assert.equal(input.getAttribute("aria-label"), "應用程式");
  assert.equal(input.getAttribute("data-label"), "新增動畫");
  assert.equal(input.getAttribute("data-placeholder"), "應用程式");
  assert.equal(input.getAttribute("data-tooltip"), "新增動畫");
  assert.equal(input.getAttribute("placeholder"), "  應用程式  ");

  assert.deepEqual(
    Array.from(
      FakeMutationObserver.instances[0].observed.options.attributeFilter
    ),
    [
      "data-label",
      "placeholder",
      "data-placeholder",
      "aria-label",
      "data-tooltip",
    ]
  );
});
