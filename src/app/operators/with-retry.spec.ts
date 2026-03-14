import { TestBed } from '@angular/core/testing';
import { resourceFromSnapshots, ResourceSnapshot, signal, WritableSignal } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { withRetry } from './with-retry';

describe('withRetry', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('deve mascarar o erro como loading enquanto há tentativas restantes', () => {
    let snapshot!: WritableSignal<ResourceSnapshot<string | undefined>>;
    let composed!: ReturnType<typeof withRetry<string | undefined>>;

    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string | undefined>>({
        status: 'error',
        error: new Error('Network error'),
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      composed = withRetry(fakeResource, { maxRetries: 3 });
    });

    // retryCount=0 < maxRetries=3 → erro mascarado como loading
    expect(composed.status()).toBe('loading');
  });

  it('deve expor o erro quando maxRetries é zero', () => {
    let snapshot!: WritableSignal<ResourceSnapshot<string | undefined>>;
    let composed!: ReturnType<typeof withRetry<string | undefined>>;

    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string | undefined>>({
        status: 'error',
        error: new Error('Network error'),
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      composed = withRetry(fakeResource, { maxRetries: 0 });
    });

    // retryCount=0, não é menor que maxRetries=0 → expõe o erro
    expect(composed.status()).toBe('error');
  });

  it('deve resetar o contador de tentativas quando resolver', () => {
    vi.useFakeTimers();

    let snapshot!: WritableSignal<ResourceSnapshot<string | undefined>>;
    let composed!: ReturnType<typeof withRetry<string | undefined>>;

    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string | undefined>>({
        status: 'error',
        error: new Error('fail'),
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      composed = withRetry(fakeResource, { maxRetries: 3, baseDelay: 100 });
    });

    expect(composed.status()).toBe('loading');

    snapshot.set({ status: 'resolved', value: 'sucesso' });
    TestBed.flushEffects();

    expect(composed.status()).toBe('resolved');
    expect(composed.value()).toBe('sucesso');

    vi.useRealTimers();
  });

  it('deve expor o erro após esgotar todas as tentativas', () => {
    vi.useFakeTimers();

    let snapshot!: WritableSignal<ResourceSnapshot<string | undefined>>;
    let composed!: ReturnType<typeof withRetry<string | undefined>>;

    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string | undefined>>({
        status: 'error',
        error: new Error('persistent error'),
      });

      const fakeResource = resourceFromSnapshots(snapshot);

      // Simula reload que sempre retorna erro
      Object.assign(fakeResource, {
        reload: vi.fn(() => {
          snapshot.set({ status: 'error', error: new Error('persistent error') });
          return true;
        }),
      });

      composed = withRetry(fakeResource, { maxRetries: 2, baseDelay: 100 });
    });

    // Tentativa 1
    vi.advanceTimersByTime(100);
    TestBed.flushEffects();
    // Tentativa 2 (backoff: 200ms)
    vi.advanceTimersByTime(200);
    TestBed.flushEffects();
    // Esgotado: retryCount=2, não é menor que maxRetries=2
    expect(composed.status()).toBe('error');

    vi.useRealTimers();
  });
});
