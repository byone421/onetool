import type { Result } from '../../utils/result';

export type XmlPath = number[];
export type XmlOutputMode = 'formatted' | 'compact';

export interface ParsedXml {
  document: XMLDocument;
  declaration: string;
}

const parserErrorTagName = 'parsererror';
const declarationPattern = /^\s*(<\?xml\s+[\s\S]*?\?>)/i;
const xmlNamespace = 'http://www.w3.org/XML/1998/namespace';
const xmlnsNamespace = 'http://www.w3.org/2000/xmlns/';

export const parseXml = (input: string): Result<ParsedXml> => {
  const source = input.trim();
  if (!source) {
    return { ok: false, error: '请输入 XML 内容' };
  }

  const document = new DOMParser().parseFromString(source, 'application/xml');
  const parserError = document.getElementsByTagName(parserErrorTagName)[0];
  if (parserError) {
    return {
      ok: false,
      error: parserError.textContent?.trim() || 'XML 格式无效'
    };
  }

  return {
    ok: true,
    value: {
      document,
      declaration: source.match(declarationPattern)?.[1] ?? ''
    }
  };
};

const hasSignificantText = (element: Element): boolean =>
  Array.from(element.childNodes).some(
    (child) => child.nodeType === Node.TEXT_NODE && Boolean(child.nodeValue?.trim())
  );

const openingTag = (element: Element): string => {
  const serialized = new XMLSerializer().serializeToString(element.cloneNode(false));
  return serialized.endsWith('/>') ? `${serialized.slice(0, -2)}>` : serialized;
};

const formatNode = (node: Node, depth: number): string[] => {
  const indent = '  '.repeat(depth);
  if (node.nodeType !== Node.ELEMENT_NODE) {
    if (node.nodeType === Node.TEXT_NODE && !node.nodeValue?.trim()) return [];
    return [`${indent}${new XMLSerializer().serializeToString(node)}`];
  }

  const element = node as Element;
  if (!element.childNodes.length) {
    return [`${indent}${new XMLSerializer().serializeToString(element)}`];
  }

  if (hasSignificantText(element)) {
    return [`${indent}${new XMLSerializer().serializeToString(element)}`];
  }

  const children = Array.from(element.childNodes).flatMap((child) => formatNode(child, depth + 1));
  if (!children.length) {
    return [`${indent}${new XMLSerializer().serializeToString(element)}`];
  }

  return [
    `${indent}${openingTag(element)}`,
    ...children,
    `${indent}</${element.nodeName}>`
  ];
};

const removeFormattingWhitespace = (node: Node): void => {
  if (node.nodeType === Node.ELEMENT_NODE && !hasSignificantText(node as Element)) {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE && !child.nodeValue?.trim()) {
        node.removeChild(child);
      }
    });
  }
  Array.from(node.childNodes).forEach(removeFormattingWhitespace);
};

export const serializeXml = (
  document: XMLDocument,
  declaration = '',
  mode: XmlOutputMode = 'formatted'
): string => {
  const clone = document.cloneNode(true) as XMLDocument;
  removeFormattingWhitespace(clone);

  const body =
    mode === 'compact'
      ? new XMLSerializer().serializeToString(clone)
      : Array.from(clone.childNodes)
          .flatMap((node) => formatNode(node, 0))
          .join('\n');

  return declaration ? `${declaration}${mode === 'formatted' ? '\n' : ''}${body}` : body;
};

export const formatXml = (input: string, mode: XmlOutputMode = 'formatted'): Result<string> => {
  const parsed = parseXml(input);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    value: serializeXml(parsed.value.document, parsed.value.declaration, mode)
  };
};

export const getXmlNode = (document: XMLDocument, path: XmlPath): Node => {
  let node: Node = document;
  for (const index of path) {
    const child = node.childNodes.item(index);
    if (!child) throw new Error('XML 节点不存在');
    node = child;
  }
  return node;
};

export const cloneXmlDocument = (document: XMLDocument): XMLDocument =>
  document.cloneNode(true) as XMLDocument;

const namespaceForName = (
  context: Element,
  qualifiedName: string,
  attribute: boolean
): string | null => {
  const separator = qualifiedName.indexOf(':');
  if (separator < 0) {
    if (attribute && qualifiedName === 'xmlns') return xmlnsNamespace;
    return attribute ? null : context.lookupNamespaceURI(null);
  }

  const prefix = qualifiedName.slice(0, separator);
  if (prefix === 'xml') return xmlNamespace;
  if (prefix === 'xmlns') return xmlnsNamespace;

  const namespace = context.lookupNamespaceURI(prefix);
  if (!namespace) throw new Error(`命名空间前缀 ${prefix} 未绑定`);
  return namespace;
};

export const renameXmlElement = (element: Element, qualifiedName: string): Element => {
  const name = qualifiedName.trim();
  if (!name) throw new Error('元素名不能为空');
  if (name === element.nodeName) return element;

  const namespace = namespaceForName(element, name, false);
  const replacement = element.ownerDocument.createElementNS(namespace, name);
  Array.from(element.attributes).forEach((attribute) => {
    replacement.setAttributeNodeNS(attribute.cloneNode(true) as Attr);
  });
  while (element.firstChild) replacement.appendChild(element.firstChild);
  element.parentNode?.replaceChild(replacement, element);
  return replacement;
};

export const renameXmlAttribute = (
  element: Element,
  oldName: string,
  qualifiedName: string
): void => {
  const name = qualifiedName.trim();
  if (!name) throw new Error('属性名不能为空');
  if (name === oldName) return;
  if (element.hasAttribute(name)) throw new Error(`属性 ${name} 已存在`);

  const oldAttribute = element.getAttributeNode(oldName);
  if (!oldAttribute) throw new Error('XML 属性不存在');

  const namespace = namespaceForName(element, name, true);
  const replacement = element.ownerDocument.createAttributeNS(namespace, name);
  replacement.value = oldAttribute.value;
  element.removeAttributeNode(oldAttribute);
  element.setAttributeNodeNS(replacement);
};

export const nextXmlAttributeName = (element: Element): string => {
  let name = 'attribute';
  let suffix = 1;
  while (element.hasAttribute(name)) {
    name = `attribute${suffix}`;
    suffix += 1;
  }
  return name;
};
