import { describe, expect, it, vi } from 'vitest';
import { registerChunkRecovery } from './chunkRecovery';

function browser(storage = new Map()) {
  const target = new EventTarget();
  target.navigator = { onLine: true };
  target.location = { reload: vi.fn() };
  target.sessionStorage = {
    getItem: (key) => storage.get(key),
    setItem: (key, value) => storage.set(key, value),
  };
  return target;
}

function fail(target, message = 'Failed to fetch dynamically imported module: /assets/old.js') {
  const event = new Event('vite:preloadError', { cancelable: true });
  event.payload = new TypeError(message);
  target.dispatchEvent(event);
  return event;
}

describe('chunk recovery', () => {
  it('reloads once and keeps the guard after a page reload with the same bundle', () => {
    const storage = new Map();
    const first = browser(storage);
    registerChunkRecovery(first, '/assets/index-old.js');
    expect(fail(first).defaultPrevented).toBe(false);
    fail(first);
    expect(first.location.reload).toHaveBeenCalledTimes(1);

    const reloaded = browser(storage);
    registerChunkRecovery(reloaded, '/assets/index-old.js');
    fail(reloaded);
    expect(reloaded.location.reload).not.toHaveBeenCalled();

    const nextBuild = browser(storage);
    registerChunkRecovery(nextBuild, '/assets/index-new.js');
    fail(nextBuild);
    expect(nextBuild.location.reload).toHaveBeenCalledTimes(1);
  });

  it.each([
    'Importing a module script failed.',
    'error loading dynamically imported module: /assets/old.js',
    'Unable to preload CSS for /assets/old.css',
  ])('recovers from a resource load error: %s', (message) => {
    const target = browser();
    registerChunkRecovery(target, 'build');
    fail(target, message);
    expect(target.location.reload).toHaveBeenCalledOnce();
  });

  it('does not reload for application errors or while offline', () => {
    const target = browser();
    registerChunkRecovery(target, 'build');
    fail(target, 'Unexpected token');
    target.navigator.onLine = false;
    fail(target);
    expect(target.location.reload).not.toHaveBeenCalled();
    target.navigator.onLine = true;
    fail(target);
    expect(target.location.reload).toHaveBeenCalledOnce();
  });

  it('does not risk a reload loop when session storage is blocked', () => {
    const target = browser();
    target.sessionStorage.setItem = () => { throw new Error('Storage blocked'); };
    registerChunkRecovery(target, 'build');
    fail(target);
    expect(target.location.reload).not.toHaveBeenCalled();
  });

  it('can remove the listener', () => {
    const target = browser();
    const cleanup = registerChunkRecovery(target, 'build');
    cleanup();
    fail(target);
    expect(target.location.reload).not.toHaveBeenCalled();
  });
});
