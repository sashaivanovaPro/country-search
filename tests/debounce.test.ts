import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from '../scripts/debounce.js';

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('waits for the full delay before calling the callback', () => {
    const callback = vi.fn();
    const run = debounce(callback, 300);
    run('spain');
    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledExactlyOnceWith('spain');
  });

  it('restarts the delay and keeps only the latest arguments', () => {
    const callback = vi.fn();
    const run = debounce(callback, 300);
    run('sp');
    vi.advanceTimersByTime(200);
    run('spain');
    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledExactlyOnceWith('spain');
  });

  it('can schedule another call after the previous one finishes', () => {
    const callback = vi.fn();
    const run = debounce(callback, 300);
    run('spain');
    vi.advanceTimersByTime(300);
    run('italy');
    vi.advanceTimersByTime(300);
    expect(callback.mock.calls).toEqual([['spain'], ['italy']]);
  });

  it('keeps timers independent for separate wrappers', () => {
    const first = vi.fn();
    const second = vi.fn();
    const runFirst = debounce(first, 300);
    const runSecond = debounce(second, 300);
    runFirst('spain');
    vi.advanceTimersByTime(100);
    runSecond('italy');
    vi.advanceTimersByTime(200);
    expect(first).toHaveBeenCalledExactlyOnceWith('spain');
    expect(second).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(second).toHaveBeenCalledExactlyOnceWith('italy');
  });

  it('forwards all arguments, including an empty argument list', () => {
    const callback = vi.fn();
    const run = debounce(callback, 0);
    run('spain', 2);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(callback).toHaveBeenCalledExactlyOnceWith('spain', 2);
    run();
    vi.advanceTimersByTime(0);
    expect(callback.mock.calls[1]).toEqual([]);
  });
});
