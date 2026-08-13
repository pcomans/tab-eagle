import { describe, expect, it } from 'vitest';
import manifest from '../../public/manifest.json';

describe('extension manifest', () => {
  it('defines a cross-platform keyboard shortcut', () => {
    const shortcut = manifest.commands._execute_action.suggested_key;

    expect(shortcut.default).toBe('Ctrl+Shift+E');
    expect(shortcut.mac).toBe('Command+Shift+E');
  });
});
