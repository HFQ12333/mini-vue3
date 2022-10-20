import { NodeTypes } from "./ast";

function createParseContext(content) {
  return {
    line: 1,
    column: 1,
    offset: 0,
    source: content, // 就会被不停的截取
    originalSource: content, // 永远不会变的
  };
}

function getCursor(context) {
  const { line, column, offset } = context;
  return { line, column, offset };
}

function isEnd(context) {
  const s = context.source;
  return !s;
}

function startsWith(s, key) {
  return s.startsWith(key);
}

function pushNode(nodes, node) {
  nodes.push(node);
}

function advanceBy(context, length) {
  const source = context.source;
  advancePositionWithMutation(context, source, length);
  context.source = source.slice(length);
}

function advancePositionWithMutation(context, source, length) {
  let linesCount = 0;
  let lastNewPos = -1;
  for (let i = 0; i < length; i++) {
    if (source.charCodeAt(i) === 10) {
      // 换行符
      linesCount++;
      lastNewPos = i;
    }
  }

  context.line += linesCount; // abcccc
  context.offset += length;
  /**
   * column:
   *  a
   *  b
   *    cccc
   *
   */
  context.column =
    lastNewPos === -1 ? context.column + length : length - lastNewPos;
}

function getSelection(context, start, end?) {
  end = end || getCursor(context);
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset),
  };
}

export function baseParse(content) {
  const context = createParseContext(content); // 创建好了一个上下文
  return parseChildren(context);
}

function parseChildren(context) {
  // node
  const nodes = [];
  //
  while (!isEnd(context)) {
    // 解析
    const s = context.source; // 用户传入的字符串
    let node;
    if (startsWith(s, "{{")) {
      // {{ <
      // 解析插值语法
      // node = parseFn1
      node = parseInterPolation(context);
    } else if (s[0] === "<" && /[a-z]/i.test(s[1])) {
      // <d
      // node = parseFn2
    }

    if (!node) {
      // 就当成文本解析
      node = parseText(context);
    }

    pushNode(nodes, node);
  }
  return nodes;
}

function parseInterPolation(context) {
  // {{abc}} type
  const start = getCursor(context);
  const open = "{{";
  const close = "}}";

  const endIndex = context.source.indexOf(close, open.length);
  advanceBy(context, open.length); // 删掉 {{
  const innerStart = getCursor(context);
  const rawContentLength = endIndex - open.length;
  const content = parseTextData(context, rawContentLength);
  const innerEnd = getCursor(context);
  advanceBy(context, close.length); // 删除 }}

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION, // 简单表达式
      content, // abc
      loc: getSelection(context, innerStart, innerEnd), //
    },
    loc: getSelection(context, start),
  };
}

function parseText(context) {
  // 'abc123 {{e}}<div></div> abc123'
  const endTokens = ["<", "{{"];
  const start = getCursor(context);
  let endIndex = context.source.length;
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i], 1);
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }
  const content = parseTextData(context, endIndex);

  return {
    type: NodeTypes.TEXT,
    content,
    loc: getSelection(context, start),
  };
}

function parseTextData(context, length) {
  const rawText = context.source.slice(0, length);
  advanceBy(context, length);
  return rawText;
}