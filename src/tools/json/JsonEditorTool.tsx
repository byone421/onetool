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
import { Alert, Button, Empty, Input, InputNumber, Select, Tag, Tooltip, message } from 'antd';
import { ToolHeader } from '../../components/ToolHeader';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type JsonPath = Array<string | number>;
type JsonType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

const initialValue = {
  name: 'OneTool',
  enabled: true,
  features: ['format', 'edit', 'validate'],
  config: { indent: 2 }
};

const typeOptions: Array<{ label: string; value: JsonType }> = [
  { label: '字符串', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '布尔值', value: 'boolean' },
  { label: '空值', value: 'null' },
  { label: '对象', value: 'object' },
  { label: '数组', value: 'array' }
];

const isObject = (value: JsonValue): value is { [key: string]: JsonValue } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getType = (value: JsonValue): JsonType => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value as JsonType;
};

const getDefaultValue = (type: JsonType): JsonValue => {
  const values: Record<JsonType, JsonValue> = {
    string: '',
    number: 0,
    boolean: false,
    null: null,
    object: {},
    array: []
  };
  return values[type];
};

const getAtPath = (root: JsonValue, path: JsonPath): JsonValue => {
  let current = root;
  for (const part of path) {
    current = Array.isArray(current)
      ? current[part as number]
      : (current as { [key: string]: JsonValue })[part as string];
  }
  return current;
};

const replaceAtPath = (root: JsonValue, path: JsonPath, value: JsonValue): JsonValue => {
  if (path.length === 0) return value;

  const copy = structuredClone(root);
  const parent = getAtPath(copy, path.slice(0, -1));
  const key = path[path.length - 1];
  if (Array.isArray(parent)) {
    parent[key as number] = value;
  } else {
    (parent as { [key: string]: JsonValue })[key as string] = value;
  }
  return copy;
};

const removeAtPath = (root: JsonValue, path: JsonPath): JsonValue => {
  const copy = structuredClone(root);
  const parent = getAtPath(copy, path.slice(0, -1));
  const key = path[path.length - 1];
  if (Array.isArray(parent)) {
    parent.splice(key as number, 1);
  } else {
    delete (parent as { [key: string]: JsonValue })[key as string];
  }
  return copy;
};

const nextObjectKey = (value: { [key: string]: JsonValue }): string => {
  let key = 'newKey';
  let suffix = 1;
  while (Object.hasOwn(value, key)) {
    key = `newKey${suffix}`;
    suffix += 1;
  }
  return key;
};

interface TreeNodeProps {
  name: string | number;
  value: JsonValue;
  path: JsonPath;
  depth: number;
  parentType?: 'object' | 'array';
  onChange: (path: JsonPath, value: JsonValue) => void;
  onDelete: (path: JsonPath) => void;
  onRename: (path: JsonPath, key: string) => boolean;
}

const JsonTreeNode = ({
  name,
  value,
  path,
  depth,
  parentType,
  onChange,
  onDelete,
  onRename
}: TreeNodeProps) => {
  const [expanded, setExpanded] = useState(true);
  const [keyDraft, setKeyDraft] = useState(String(name));
  const type = getType(value);
  const isContainer = type === 'object' || type === 'array';
  const children: Array<[string | number, JsonValue]> = Array.isArray(value)
    ? value.map((child, index) => [index, child])
    : isObject(value)
      ? Object.entries(value)
      : [];

  useEffect(() => setKeyDraft(String(name)), [name]);

  const commitKey = (): void => {
    const key = keyDraft.trim();
    if (!key || !onRename(path, key)) {
      setKeyDraft(String(name));
    }
  };

  const addChild = (): void => {
    if (Array.isArray(value)) {
      onChange(path, [...value, null]);
    } else if (isObject(value)) {
      onChange(path, { ...value, [nextObjectKey(value)]: null });
    }
    setExpanded(true);
  };

  return (
    <div className="json-tree-node" role="treeitem" aria-expanded={isContainer ? expanded : undefined}>
      <div className="json-tree-row" style={{ paddingLeft: depth * 18 }}>
        {isContainer ? (
          <Button
            className="json-tree-toggle"
            type="text"
            size="small"
            icon={expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
            aria-label={expanded ? '收起节点' : '展开节点'}
            onClick={() => setExpanded((current) => !current)}
          />
        ) : (
          <span className="json-tree-toggle-placeholder" />
        )}

        {parentType === 'object' ? (
          <Input
            className="json-tree-key"
            size="small"
            value={keyDraft}
            aria-label="属性名"
            onChange={(event) => setKeyDraft(event.target.value)}
            onBlur={commitKey}
            onPressEnter={(event) => event.currentTarget.blur()}
          />
        ) : (
          <span className="json-tree-label">{parentType === 'array' ? `[${name}]` : name}</span>
        )}

        <Select<JsonType>
          className="json-tree-type"
          size="small"
          value={type}
          options={typeOptions}
          aria-label="值类型"
          onChange={(nextType) => onChange(path, getDefaultValue(nextType))}
        />

        <div className="json-tree-value">
          {type === 'string' ? (
            <Input
              size="small"
              value={value as string}
              aria-label="字符串值"
              onChange={(event) => onChange(path, event.target.value)}
            />
          ) : null}
          {type === 'number' ? (
            <InputNumber
              size="small"
              value={value as number}
              aria-label="数字值"
              onChange={(nextValue) => {
                if (typeof nextValue === 'number') onChange(path, nextValue);
              }}
            />
          ) : null}
          {type === 'boolean' ? (
            <Select<'true' | 'false'>
              size="small"
              value={String(value) as 'true' | 'false'}
              aria-label="布尔值"
              options={[
                { label: 'true', value: 'true' },
                { label: 'false', value: 'false' }
              ]}
              onChange={(nextValue) => onChange(path, nextValue === 'true')}
            />
          ) : null}
          {type === 'null' ? <Tag>null</Tag> : null}
          {isContainer ? <span className="json-tree-count">{children.length} 项</span> : null}
        </div>

        {isContainer ? (
          <Tooltip title="添加子项">
            <Button type="text" size="small" icon={<PlusOutlined />} onClick={addChild} />
          </Tooltip>
        ) : null}
        {path.length > 0 ? (
          <Tooltip title="删除节点">
            <Button
              danger
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => onDelete(path)}
            />
          </Tooltip>
        ) : null}
      </div>

      {isContainer && expanded
        ? children.map(([childName, childValue]) => (
            <JsonTreeNode
              key={JSON.stringify([...path, childName])}
              name={childName}
              value={childValue}
              path={[...path, childName]}
              depth={depth + 1}
              parentType={type}
              onChange={onChange}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))
        : null}
    </div>
  );
};

export const JsonEditorTool = () => {
  const [input, setInput] = useState(JSON.stringify(initialValue, null, 2));
  const parsed = useMemo(() => {
    if (!input.trim()) return { ok: false as const, error: '请输入 JSON' };
    try {
      return { ok: true as const, value: JSON.parse(input) as JsonValue };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : 'JSON 格式无效'
      };
    }
  }, [input]);

  const writeValue = (value: JsonValue, compact = false): void => {
    setInput(JSON.stringify(value, null, compact ? 0 : 2));
  };

  const changeNode = (path: JsonPath, value: JsonValue): void => {
    if (parsed.ok) writeValue(replaceAtPath(parsed.value, path, value));
  };

  const deleteNode = (path: JsonPath): void => {
    if (parsed.ok) writeValue(removeAtPath(parsed.value, path));
  };

  const renameNode = (path: JsonPath, key: string): boolean => {
    if (!parsed.ok || path.length === 0) return false;
    const oldKey = String(path[path.length - 1]);
    if (key === oldKey) return true;

    const parentPath = path.slice(0, -1);
    const parent = getAtPath(parsed.value, parentPath);
    if (!isObject(parent) || Object.hasOwn(parent, key)) {
      void message.warning('属性名不能为空或重复');
      return false;
    }

    const renamed = Object.fromEntries(
      Object.entries(parent).map(([entryKey, entryValue]) =>
        entryKey === oldKey ? [key, entryValue] : [entryKey, entryValue]
      )
    );
    writeValue(replaceAtPath(parsed.value, parentPath, renamed));
    return true;
  };

  const copyInput = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(input);
      void message.success('已复制 JSON');
    } catch {
      void message.error('复制失败，请检查剪贴板权限');
    }
  };

  return (
    <section className="tool-page">
      <ToolHeader title="JSON编辑" description="编辑、校验并以树形结构查看 JSON 数据。" />

      <div className="structured-editor-toolbar">
        <Button
          type="primary"
          icon={<CodeOutlined />}
          disabled={!parsed.ok}
          onClick={() => parsed.ok && writeValue(parsed.value)}
        >
          格式化
        </Button>
        <Button disabled={!parsed.ok} onClick={() => parsed.ok && writeValue(parsed.value, true)}>
          压缩
        </Button>
        <Button icon={<CopyOutlined />} disabled={!input} onClick={() => void copyInput()}>
          复制
        </Button>
        <Button icon={<ClearOutlined />} disabled={!input} onClick={() => setInput('')}>
          清空
        </Button>
        <Tag color={parsed.ok ? 'success' : input.trim() ? 'error' : 'default'}>
          {parsed.ok ? 'JSON 有效' : input.trim() ? 'JSON 无效' : '等待输入'}
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
              <JsonTreeNode
                name="$"
                value={parsed.value}
                path={[]}
                depth={0}
                onChange={changeNode}
                onDelete={deleteNode}
                onRename={renameNode}
              />
            ) : input.trim() ? (
              <Alert type="error" showIcon message="无法生成树形结构" description={parsed.error} />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="输入 JSON 后显示树形结构" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
