import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnimationPreviewCard } from './AnimationPreviewCard';

describe('AnimationPreviewCard', () => {
  it('shows title, category and selected state and handles selection', () => {
    const onSelect = vi.fn();
    render(
      <AnimationPreviewCard
        title="DVD"
        category="Classic"
        icon="📀"
        selected
        onSelect={onSelect}
      />,
    );
    const card = screen.getByRole('button', { name: /DVD/ });
    expect(card).toHaveAttribute('aria-pressed', 'true');
    expect(card).toHaveTextContent('Classic');
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('uses unified CSS classes without conflicting height classes', () => {
    render(
      <AnimationPreviewCard
        title="DVD"
        category="Classic"
        icon="📀"
        selected={false}
        onSelect={() => {}}
      />,
    );
    const card = screen.getByRole('button', { name: /DVD/ });
    expect(card.className).toContain('animation-card');
    expect(card.className).not.toContain('h-28');
  });
});
