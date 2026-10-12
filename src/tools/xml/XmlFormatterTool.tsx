import { useEffect, useMemo, useState } from 'react';
import {
  CaretDownOutlined,
  CaretRightOutlined,
  ClearOutlined,
  CodeOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { Alert, Button, Dropdown, Empty, Input, Tag, Tooltip, message } from 'antd';
import type { MenuProps } from 'antd';
import { ToolHeader } from '../../components/ToolHeader';
import {
  cloneXmlDocument,
  formatXml,
  getXmlNode,
  nextXmlAttributeName,
  parseXml,
  renameXmlAttribute,
  renameXmlElement,
  serializeXml
} from './xml';
import type { XmlPath } from './xml';

type AddNodeType = 'element' | 'attribute' | 'text' | 'comment' | 'cdata';

interface XmlTreeCallbacks {
  onAdd: (path: XmlPath, type: AddNodeType) => void;
  onDelete: (path: XmlPath) => void;
  onRenameElement: (path: XmlPath, name: string) => boolean;
  onRenameAttribute: (path: XmlPath, oldName: string, name: string) => boolean;
  onChangeAttribute: (path: XmlPath, name: string, value: string) => void;
  onDeleteAttribute: (path: XmlPath, name: string) => void;
  onChangeValue: (path: XmlPath, value: string) => void;
}

interface XmlTreeNodeProps extends XmlTreeCallbacks {
  node: Node;
  path: XmlPath;
  depth: number;
  rootElement: Element;
}

const addMenuItems: MenuProps['items'] = [
  { key: 'element', label: '子元素' },
  { key: 'attribute', label: '属性' },
  { key: 'text', label: '文本' },
  { key: 'comment', label: '注释' },
  { key: 'cdata', label: 'CDATA' }
];

const nodeTypeLabel = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return '文本';
  if (node.nodeType === Node.COMMENT_NODE) return '注释';
  if (node.nodeType === Node.CDATA_SECTION_NODE) return 'CDATA';
  if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) return '处理指令';
  if (node.nodeType === Node.DOCUMENT_TYPE_NODE) return 'DOCTYPE';
  return '节点';
};

const visibleChildren = (node: Node): Array<{ node: Node; index: number }> =>
  Array.from(node.childNodes).flatMap((child, index) =>
    child.nodeType === Node.TEXT_NODE && !child.nodeValue?.trim() ? [] : [{ node: child, index }]
  );

interface XmlAttributeRowProps {
  attribute: Attr;
  elementPath: XmlPath;
  depth: number;
  onRename: XmlTreeCallbacks['onRenameAttribute'];
  onChange: XmlTreeCallbacks['onChangeAttribute'];
  onDelete: XmlTreeCallbacks['onDeleteAttribute'];
}

const XmlAttributeRow = ({
  attribute,
  elementPath,
  depth,
  onRename,
  onChange,
  onDelete
}: XmlAttributeRowProps) => {
  const [nameDraft, setNameDraft] = useState(attribute.name);

  useEffect(() => setNameDraft(attribute.name), [attribute.name]);

  const commitName = (): void => {
    if (!onRename(elementPath, attribute.name, nameDraft)) {
      setNameDraft(attribute.name);
    }
  };

  return (
    <div className="xml-tree-row" style={{ paddingLeft: depth * 18 }}>
      <span className="xml-tree-toggle-placeholder" />
      <Tag className="xml-tree-kind" color="blue">
        属性
      </Tag>
      <Input
        className="xml-tree-name"
        size="small"
        value={nameDraft}
        aria-label="属性名"
        onChange={(event) => setNameDraft(event.target.value)}
        onBlur={commitName}
        onPressEnter={(event) => event.currentTarget.blur()}
      />
      <Input
        className="xml-tree-value"
        size="small"
        value={attribute.value}
        aria-label={`${attribute.name} 属性值`}
        onChange={(event) => onChange(elementPath, attribute.name, event.target.value)}
      />
      <Tooltip title="删除属性">
        <Button
          danger
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => onDelete(elementPath, attribute.name)}
        />
      </Tooltip>
    </div>
  );
};

const XmlTreeNode = ({
  node,
  path,
  depth,
  rootElement,
  onAdd,
  onDelete,
  onRenameElement,
  onRenameAttribute,
  onChangeAttribute,
  onDeleteAttribute,
  onChangeValue
}: XmlTreeNodeProps) => {
  const [expanded, setExpanded] = useState(true);
  const [nameDraft, setNameDraft] = useState(node.nodeName);
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : null;
  const children = element ? visibleChildren(element) : [];
  const attributes = element ? Array.from(element.attributes) : [];
  const isReadonly =
    node.nodeType === Node.PROCESSING_INSTRUCTION_NODE ||
    node.nodeType === Node.DOCUMENT_TYPE_NODE;

  useEffect(() => setNameDraft(node.nodeName), [node.nodeName]);

  const commitElementName = (): void => {
    if (element && !onRenameElement(path, nameDraft)) {
      setNameDraft(element.nodeName);
    }
  };

  if (element) {
    return (
      <div className="xml-tree-node" role="treeitem" aria-expanded={expanded}>
        <div className="xml-tree-row" style={{ paddingLeft: depth * 18 }}>
          <Button
            className="xml-tree-toggle"
            type="text"
            size="small"
            icon={expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
            aria-label={expanded ? '收起元素' : '展开元素'}
            onClick={() => setExpanded((current) => !current)}
          />
          <Tag className="xml-tree-kind" color="green">
            元素
          </Tag>
          <Input
            className="xml-tree-name"
            size="small"
            value={nameDraft}
            aria-label="元素名"
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={commitElementName}
            onPressEnter={(event) => event.currentTarget.blur()}
          />
          <span className="xml-tree-summary">
            {attributes.length} 属性 · {children.length} 节点
          </span>
          <Dropdown
            menu={{
              items: addMenuItems,
              onClick: ({ key }) => onAdd(path, key as AddNodeType)
            }}
            trigger={['click']}
          >
            <Tooltip title="添加内容">
              <Button type="text" size="small" icon={<PlusOutlined />} />
            </Tooltip>
          </Dropdown>
          {element !== rootElement ? (
            <Tooltip title="删除节点">
              <Button
                danger
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => onDelete(path)}
              />
            </Tooltip>
          ) : (
            <span className="xml-tree-action-placeholder" />
          )}
        </div>

        {expanded
          ? attributes.map((attribute) => (
              <XmlAttributeRow
                key={attribute.name}
                attribute={attribute}
                elementPath={path}
                depth={depth + 1}
                onRename={onRenameAttribute}
                onChange={onChangeAttribute}
                onDelete={onDeleteAttribute}
              />
            ))
          : null}
        {expanded
          ? children.map(({ node: child, index }) => (
              <XmlTreeNode
                key={`${index}-${child.nodeType}-${child.nodeName}`}
                node={child}
                path={[...path, index]}
                depth={depth + 1}
                rootElement={rootElement}
                onAdd={onAdd}
                onDelete={onDelete}
                onRenameElement={onRenameElement}
                onRenameAttribute={onRenameAttribute}
                onChangeAttribute={onChangeAttribute}
                onDeleteAttribute={onDeleteAttribute}
                onChangeValue={onChangeValue}
              />
            ))
          : null}
      </div>
    );
  }

  return (
    <div className="xml-tree-row" role="treeitem" style={{ paddingLeft: depth * 18 }}>
      <span className="xml-tree-toggle-placeholder" />
      <Tag className="xml-tree-kind">{nodeTypeLabel(node)}</Tag>
      <span className="xml-tree-node-name">{node.nodeName}</span>
      {isReadonly ? (
        <Tooltip title="该节点仅展示并保留">
          <span className="xml-tree-readonly-value">
            {new XMLSerializer().serializeToString(node)}
          </span>
        </Tooltip>
      ) : (
        <Input
          className="xml-tree-value"
          size="small"
          value={node.nodeValue ?? ''}
          aria-label={`${nodeTypeLabel(node)}内容`}
          onChange={(event) => onChangeValue(path, event.target.value)}
        />
      )}
      {!isReadonly ? (
        <Tooltip title="删除节点">
          <Button
            danger
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => onDelete(path)}
          />
        </Tooltip>
      ) : (
        <span className="xml-tree-action-placeholder" />
      )}
    </div>
  );
};

const initialXml = `<?xml version="1.0" encoding="UTF-8"?>
<root enabled="true">
  <name>OneTool</name>
  <!-- 可在右侧编辑 XML 结构 -->
</root>`;

export const XmlFormatterTool = () => {
  const [input, setInput] = useState(initialXml);
  const parsed = useMemo(() => parseXml(input), [input]);

  const updateDocument = (change: (document: XMLDocument) => void): boolean => {
    if (!parsed.ok) return false;
    try {
      const document = cloneXmlDocument(parsed.value.document);
      change(document);
      setInput(serializeXml(document, parsed.value.declaration));
      return true;
    } catch (error) {
      void message.warning(error instanceof Error ? error.message : 'XML 修改失败');
      return false;
    }
  };

  const handleFormat = (compact = false): void => {
    const result = formatXml(input, compact ? 'compact' : 'formatted');
    if (result.ok) setInput(result.value);
  };

  const copyInput = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(input);
      void message.success('已复制 XML');
    } catch {
      void message.error('复制失败，请检查剪贴板权限');
    }
  };

  const addNode = (path: XmlPath, type: AddNodeType): void => {
    updateDocument((document) => {
      const element = getXmlNode(document, path) as Element;
      if (type === 'attribute') {
        element.setAttribute(nextXmlAttributeName(element), '');
      } else if (type === 'element') {
        element.appendChild(
          document.createElementNS(element.lookupNamespaceURI(null), 'element')
        );
      } else if (type === 'text') {
        element.appendChild(document.createTextNode('text'));
      } else if (type === 'comment') {
        element.appendChild(document.createComment('comment'));
      } else {
        element.appendChild(document.createCDATASection('content'));
      }
    });
  };

  const deleteNode = (path: XmlPath): void => {
    updateDocument((document) => {
      const node = getXmlNode(document, path);
      if (node === document.documentElement) throw new Error('根元素不能删除');
      node.parentNode?.removeChild(node);
    });
  };

  const renameElement = (path: XmlPath, name: string): boolean =>
    updateDocument((document) => {
      renameXmlElement(getXmlNode(document, path) as Element, name);
    });

  const renameAttribute = (path: XmlPath, oldName: string, name: string): boolean =>
    updateDocument((document) => {
      renameXmlAttribute(getXmlNode(document, path) as Element, oldName, name);
    });

  const changeAttribute = (path: XmlPath, name: string, value: string): void => {
    updateDocument((document) => {
      const element = getXmlNode(document, path) as Element;
      const attribute = element.getAttributeNode(name);
      if (!attribute) throw new Error('XML 属性不存在');
      attribute.value = value;
    });
  };

  const deleteAttribute = (path: XmlPath, name: string): void => {
    updateDocument((document) => {
      const element = getXmlNode(document, path) as Element;
      const attribute = element.getAttributeNode(name);
      if (!attribute) throw new Error('XML 属性不存在');
      element.removeAttributeNode(attribute);
    });
  };

  const changeNodeValue = (path: XmlPath, value: string): void => {
    updateDocument((document) => {
      const node = getXmlNode(document, path);
      if (node.nodeType === Node.COMMENT_NODE && (value.includes('--') || value.endsWith('-'))) {
        throw new Error('XML 注释不能包含 -- 或以 - 结尾');
      }
      if (node.nodeType === Node.CDATA_SECTION_NODE && value.includes(']]>')) {
        throw new Error('CDATA 内容不能包含 ]]>');
      }
      node.nodeValue = value;
    });
  };

  return (
    <section className="tool-page">
      <ToolHeader title="XML编辑" description="编辑、校验并以树形结构查看 XML 数据。" />

      <div className="structured-editor-toolbar">
        <Button
          type="primary"
          icon={<CodeOutlined />}
          disabled={!parsed.ok}
          onClick={() => handleFormat()}
        >
          格式化
        </Button>
        <Button disabled={!parsed.ok} onClick={() => handleFormat(true)}>
          压缩
        </Button>
        <Button icon={<CopyOutlined />} disabled={!input} onClick={() => void copyInput()}>
          复制
        </Button>
        <Button icon={<ClearOutlined />} disabled={!input} onClick={() => setInput('')}>
          清空
        </Button>
        <Tag color={parsed.ok ? 'success' : input.trim() ? 'error' : 'default'}>
          {parsed.ok ? 'XML 有效' : input.trim() ? 'XML 无效' : '等待输入'}
        </Tag>
      </div>

      <div className="structured-editor-workspace">
        <div className="structured-editor-pane">
          <div className="structured-editor-pane-heading">
            <strong>文本编辑</strong>
            <span>{input.length} 字符</span>
          </div>
          <Input.TextArea
            className="structured-editor-input"
            value={input}
            spellCheck={false}
            status={!parsed.ok && input.trim() ? 'error' : undefined}
            onChange={(event) => setInput(event.target.value)}
          />
        </div>

        <div className="structured-editor-pane">
          <div className="structured-editor-pane-heading">
            <strong>树形编辑</strong>
            <span>修改后自动同步文本</span>
          </div>
          <div className="structured-editor-tree" role="tree">
            {parsed.ok ? (
              visibleChildren(parsed.value.document).map(({ node, index }) => (
                <XmlTreeNode
                  key={`${index}-${node.nodeType}-${node.nodeName}`}
                  node={node}
                  path={[index]}
                  depth={0}
                  rootElement={parsed.value.document.documentElement}
                  onAdd={addNode}
                  onDelete={deleteNode}
                  onRenameElement={renameElement}
                  onRenameAttribute={renameAttribute}
                  onChangeAttribute={changeAttribute}
                  onDeleteAttribute={deleteAttribute}
                  onChangeValue={changeNodeValue}
                />
              ))
            ) : input.trim() ? (
              <Alert type="error" showIcon message="无法生成树形结构" description={parsed.error} />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="输入 XML 后显示树形结构" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
