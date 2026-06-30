// Incremental parser for a streamed `{ "recipes": [ {...}, {...} ] }` payload.
// The model streams the JSON as a growing text buffer; this extracts each recipe
// object as soon as its closing brace arrives, so the Edge Function can emit
// recipes one at a time instead of waiting for the whole response.
//
// It keys off the first '[' in the payload (the recipes array, since the only
// structure before it is the top-level `{"recipes":`) and then brace-counts each
// array element with string/escape awareness so braces inside strings or nested
// ingredient arrays do not confuse the scan.

export type StreamedRecipe = Record<string, unknown>;

export function createRecipeStreamParser() {
  let buffer = '';
  let cursor = 0;
  let arrayStarted = false;
  let arrayEnded = false;

  function findArrayStart(): boolean {
    const index = buffer.indexOf('[', cursor);

    if (index === -1) {
      return false;
    }

    cursor = index + 1;
    arrayStarted = true;

    return true;
  }

  // Returns the next complete recipe object, or null when the array has ended or
  // the current object is not finished yet. Only advances `cursor` past data it
  // has fully consumed so an incomplete object is retried on the next push.
  function nextObject(): StreamedRecipe | null {
    while (cursor < buffer.length && isSkippable(buffer[cursor])) {
      cursor += 1;
    }

    if (cursor >= buffer.length) {
      return null;
    }

    if (buffer[cursor] === ']') {
      arrayEnded = true;
      return null;
    }

    if (buffer[cursor] !== '{') {
      // Unexpected token; step over it so the scan keeps making progress.
      cursor += 1;
      return null;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = cursor; i < buffer.length; i += 1) {
      const char = buffer[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }

        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;

        if (depth === 0) {
          const slice = buffer.slice(cursor, i + 1);
          cursor = i + 1;

          try {
            return JSON.parse(slice) as StreamedRecipe;
          } catch {
            return null;
          }
        }
      }
    }

    return null;
  }

  return {
    // Append a text chunk and return any recipe objects that became complete.
    push(chunk: string): StreamedRecipe[] {
      buffer += chunk;
      const completed: StreamedRecipe[] = [];

      if (arrayEnded) {
        return completed;
      }

      if (!arrayStarted && !findArrayStart()) {
        return completed;
      }

      while (!arrayEnded) {
        const before = cursor;
        const recipe = nextObject();

        if (recipe) {
          completed.push(recipe);
          continue;
        }

        // No object and no forward progress means we are mid-object; wait for
        // more text on the next push.
        if (cursor === before) {
          break;
        }
      }

      return completed;
    },

    isComplete(): boolean {
      return arrayEnded;
    },
  };
}

function isSkippable(char: string): boolean {
  return char === ' ' || char === '\n' || char === '\r' || char === '\t' || char === ',';
}
