// Splits a byte/text stream into newline-delimited JSON lines. Holds a partial
// trailing line between chunks so a record split across two network reads is not
// dropped. Pure and synchronous so it can be unit tested without a real stream.
export function createLineBuffer() {
  let buffer = '';

  return {
    // Append a chunk and return any complete lines it produced.
    push(chunk: string): string[] {
      buffer += chunk;
      const lines: string[] = [];
      let newlineIndex = buffer.indexOf('\n');

      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (line) {
          lines.push(line);
        }

        newlineIndex = buffer.indexOf('\n');
      }

      return lines;
    },

    // Return whatever is left once the stream ends (a final line without a
    // trailing newline).
    flush(): string[] {
      const line = buffer.trim();
      buffer = '';

      return line ? [line] : [];
    },
  };
}
