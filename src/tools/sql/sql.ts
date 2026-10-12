import { format } from 'sql-formatter';
import type { SqlLanguage } from 'sql-formatter';
import type { Result } from '../../utils/result';

export const sqlDialects: Array<{ value: SqlLanguage; label: string }> = [
  { value: 'sql', label: '通用 SQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'mariadb', label: 'MariaDB' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'tsql', label: 'SQL Server' },
  { value: 'plsql', label: 'Oracle PL/SQL' },
  { value: 'db2', label: 'DB2' },
  { value: 'duckdb', label: 'DuckDB' },
  { value: 'tidb', label: 'TiDB' }
];

const sqlClausePattern =
  /\b(WITH|SELECT|FROM|WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|OFFSET|JOIN|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|ON|AND|OR|UNION(?:\s+ALL)?|INSERT\s+INTO|VALUES|UPDATE|SET|DELETE\s+FROM)\b/gi;

const protectTemplateVariables = (input: string) => {
  const variables: string[] = [];
  const value = input.replace(/\$\{[^}]*\}/g, (match) => {
    const token = `__SQLFMT_TEMPLATE_${variables.length}__`;
    variables.push(match);
    return token;
  });

  return {
    value,
    restore: (output: string) =>
      variables.reduce(
        (text, variable, index) =>
          text.replace(new RegExp(`__SQLFMT_TEMPLATE_${index}__`, 'gi'), variable),
        output
      )
  };
};

const protectVerbatimChunks = (input: string) => {
  const chunks: string[] = [];
  const value = input.replace(
    /\/\*[\s\S]*?\*\/|--[^\n]*|'(?:''|[^'])*'|"(?:\\"|""|[^"])*"|`[^`]*`|\[[^\]]*]/g,
    (match) => {
      const token = `__SQLFMT_CHUNK_${chunks.length}__`;
      chunks.push(match);
      return token;
    }
  );

  return {
    value,
    restore: (output: string) =>
      chunks.reduce(
        (text, chunk, index) => text.replace(new RegExp(`__SQLFMT_CHUNK_${index}__`, 'gi'), chunk),
        output
      )
  };
};

const formatLooseSql = (input: string): string => {
  const protectedChunks = protectVerbatimChunks(input);

  return protectedChunks.restore(
    protectedChunks.value
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s*;\s*/g, ';\n')
      .replace(sqlClausePattern, (match) => `\n${match.toUpperCase().replace(/\s+/g, ' ')}`)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => (/^(AND|OR)\b/i.test(line) ? `  ${line}` : line))
      .join('\n')
  );
};

export const formatSql = (input: string, language: SqlLanguage): Result<string> => {
  if (!input.trim()) {
    return {
      ok: false,
      error: '请输入 SQL 内容'
    };
  }

  const protectedSql = protectTemplateVariables(input);

  try {
    return {
      ok: true,
      value: protectedSql.restore(
        format(protectedSql.value, {
          language,
          keywordCase: 'upper',
          tabWidth: 2,
          linesBetweenQueries: 1
        })
      )
    };
  } catch {
    return {
      ok: true,
      value: protectedSql.restore(formatLooseSql(protectedSql.value))
    };
  }
};
