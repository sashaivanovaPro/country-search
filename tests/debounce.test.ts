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

describe('debounce cancellation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('cancels a pending callback', () => {
    const callback = vi.fn();
    const run = debounce(callback, 300);
    run('spain');
    run.cancel();
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('can be canceled repeatedly before and after a completed call', () => {
    const callback = vi.fn();
    const run = debounce(callback, 300);
    run.cancel();
    run.cancel();
    run('italy');
    vi.advanceTimersByTime(300);
    run.cancel();
    expect(callback).toHaveBeenCalledExactlyOnceWith('italy');
  });

  it('can schedule new work after cancellation without affecting other wrappers', () => {
    const first = vi.fn();
    const second = vi.fn();
    const one = debounce(first, 300);
    const two = debounce(second, 300);
    one('old');
    two('italy');
    one.cancel();
    one('spain');
    vi.advanceTimersByTime(300);
    expect(first).toHaveBeenCalledExactlyOnceWith('spain');
    expect(second).toHaveBeenCalledExactlyOnceWith('italy');
  });
});
