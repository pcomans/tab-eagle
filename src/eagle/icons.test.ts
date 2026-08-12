import { describe, expect, it } from 'vitest';
import { closeIconSvg, readingListIconSvg } from './icons';

describe('icon-button SVGs', () => {
  it.each([
    ['close', closeIconSvg],
    ['reading list', readingListIconSvg]
  ])('renders the %s icon in the icon-button default slot', (_name, iconSvg) => {
    expect(iconSvg()).toContain('<svg');
    expect(iconSvg()).not.toContain('slot="icon"');
  });
});
