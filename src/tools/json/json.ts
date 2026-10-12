import type { Result } from '../../utils/result';

export type JsonDiffLine = {
  type: 'same' | 'change' | 'add' | 'remove';
  leftLineNumber?: number;
  rightLineNumber?: number;
  leftValue: string;
  rightValue: string;
};

export const formatJson = (input: string): Result<string> => {
  try {
    return {
      ok: true,
      value: JSON.stringify(JSON.parse(input), null, 2)
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid JSON'
    };
  }
};

type DiffStep =
  | { type: 'same'; leftLineNumber: number; rightLineNumber: number; value: string }
  | { type: 'remove'; leftLineNumber: number; value: string }
  | { type: 'add'; rightLineNumber: number; value: string };

export const diffJsonLines = (left: string, right: string): JsonDiffLine[] => {
  const leftLines = left.split(/\r?\n/);
  const rightLines = right.split(/\r?\n/);
  const table = Array.from({ length: leftLines.length + 1 }, () =>
    Array<number>(rightLines.length + 1).fill(0)
  );

  for (let leftIndex = leftLines.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = rightLines.length - 1; rightIndex >= 0; rightIndex -= 1) {
      table[leftIndex][rightIndex] =
        leftLines[leftIndex] === rightLines[rightIndex]
          ? table[leftIndex + 1][rightIndex + 1] + 1
          : Math.max(table[leftIndex + 1][rightIndex], table[leftIndex][rightIndex + 1]);
    }
  }

  const steps: DiffStep[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < leftLines.length || rightIndex < rightLines.length) {
    if (leftLines[leftIndex] === rightLines[rightIndex]) {
      steps.push({
        type: 'same',
        leftLineNumber: leftIndex + 1,
        rightLineNumber: rightIndex + 1,
        value: leftLines[leftIndex]
      });
      leftIndex += 1;
      rightIndex += 1;
    } else if (
      rightIndex < rightLines.length &&
      (leftIndex === leftLines.length ||
        table[leftIndex][rightIndex + 1] >= table[leftIndex + 1][rightIndex])
    ) {
      steps.push({ type: 'add', rightLineNumber: rightIndex + 1, value: rightLines[rightIndex] });
      rightIndex += 1;
    } else {
      steps.push({ type: 'remove', leftLineNumber: leftIndex + 1, value: leftLines[leftIndex] });
      leftIndex += 1;
    }
  }

  const rows: JsonDiffLine[] = [];
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];

    if (step.type === 'same') {
      rows.push({
        type: 'same',
        leftLineNumber: step.leftLineNumber,
        rightLineNumber: step.rightLineNumber,
        leftValue: step.value,
        rightValue: step.value
      });
      continue;
    }

    const removes: Extract<DiffStep, { type: 'remove' }>[] = [];
    const adds: Extract<DiffStep, { type: 'add' }>[] = [];

    while (index < steps.length && steps[index].type !== 'same') {
      const diffStep = steps[index];
      if (diffStep.type === 'remove') {
        removes.push(diffStep);
      } else if (diffStep.type === 'add') {
        adds.push(diffStep);
      }
      index += 1;
    }

    index -= 1;

    const rowCount = Math.max(removes.length, adds.length);
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const remove = removes[rowIndex];
      const add = adds[rowIndex];
      rows.push({
        type: remove && add ? 'change' : remove ? 'remove' : 'add',
        leftLineNumber: remove?.leftLineNumber,
        rightLineNumber: add?.rightLineNumber,
        leftValue: remove?.value ?? '',
        rightValue: add?.value ?? ''
      });
    }
  }

  return rows;
};
