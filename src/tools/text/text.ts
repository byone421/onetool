export const compressText = (input: string, removeInnerSpaces: boolean): string => {
  const text = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');

  return removeInnerSpaces ? text.replace(/\s+/g, '') : text.replace(/\s+/g, ' ');
};

export type DiffPart = {
  type: 'same' | 'add' | 'remove';
  value: string;
};

export const diffText = (left: string, right: string): DiffPart[] => {
  const leftChars = Array.from(left);
  const rightChars = Array.from(right);
  const table = Array.from({ length: leftChars.length + 1 }, () =>
    Array<number>(rightChars.length + 1).fill(0)
  );

  for (let leftIndex = leftChars.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = rightChars.length - 1; rightIndex >= 0; rightIndex -= 1) {
      table[leftIndex][rightIndex] =
        leftChars[leftIndex] === rightChars[rightIndex]
          ? table[leftIndex + 1][rightIndex + 1] + 1
          : Math.max(table[leftIndex + 1][rightIndex], table[leftIndex][rightIndex + 1]);
    }
  }

  const parts: DiffPart[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  const pushPart = (type: DiffPart['type'], value: string): void => {
    const lastPart = parts.at(-1);
    if (lastPart?.type === type) {
      lastPart.value += value;
    } else {
      parts.push({ type, value });
    }
  };

  while (leftIndex < leftChars.length || rightIndex < rightChars.length) {
    if (leftChars[leftIndex] === rightChars[rightIndex]) {
      pushPart('same', leftChars[leftIndex]);
      leftIndex += 1;
      rightIndex += 1;
    } else if (
      rightIndex < rightChars.length &&
      (leftIndex === leftChars.length ||
        table[leftIndex][rightIndex + 1] >= table[leftIndex + 1][rightIndex])
    ) {
      pushPart('add', rightChars[rightIndex]);
      rightIndex += 1;
    } else {
      pushPart('remove', leftChars[leftIndex]);
      leftIndex += 1;
    }
  }

  return parts;
};
