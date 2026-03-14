import { TestBed } from '@angular/core/testing';
import { resourceFromSnapshots, ResourceSnapshot, signal, WritableSignal } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { withDebounce } from './with-debounce';

describe('withDebounce', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve suprimir o estado loading durante a janela de debounce', () => {
    let snapshot!: WritableSignal<ResourceSnapshot<string | undefined>>;
    let composed!: ReturnType<typeof withDebounce<string | undefined>>;

    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string | undefined>>({
        status: 'resolved',
        value: 'resultado anterior',
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      composed = withDebounce(fakeResource, 300);
    });

    snapshot.set({ status: 'loading', value: undefined });
    TestBed.flushEffects();

    // Antes do timeout: debounced ainda tem o snapshot resolvido
    // withDebounce também preserva o valor anterior durante loading (como withPreviousValue)
    expect(composed.value()).toBe('resultado anterior');
  });

  it('deve propagar o loading após o delay expirar', () => {
    let snapshot!: WritableSignal<ResourceSnapshot<string | undefined>>;
    let composed!: ReturnType<typeof withDebounce<string | undefined>>;

    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string | undefined>>({
        status: 'resolved',
        value: 'resultado',
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      composed = withDebounce(fakeResource, 300);
    });

    snapshot.set({ status: 'loading', value: undefined });
    TestBed.flushEffects();

    vi.advanceTimersByTime(300);
    TestBed.flushEffects();

    // Após o delay: loading foi propagado (mas com o valor anterior mantido)
    expect(composed.status()).toBe('loading');
  });

  it('deve propagar o estado resolved imediatamente sem debounce', () => {
    let snapshot!: WritableSignal<ResourceSnapshot<string | undefined>>;
    let composed!: ReturnType<typeof withDebounce<string | undefined>>;

    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string | undefined>>({
        status: 'loading',
        value: undefined,
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      composed = withDebounce(fakeResource, 300);
    });

    snapshot.set({ status: 'resolved', value: 'novo valor' });
    TestBed.flushEffects();

    // Resolved não tem debounce: deve propagar imediatamente
    expect(composed.status()).toBe('resolved');
    expect(composed.value()).toBe('novo valor');
  });

  it('deve propagar o estado error imediatamente sem debounce', () => {
    let snapshot!: WritableSignal<ResourceSnapshot<string | undefined>>;
    let composed!: ReturnType<typeof withDebounce<string | undefined>>;

    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string | undefined>>({
        status: 'loading',
        value: undefined,
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      composed = withDebounce(fakeResource, 300);
    });

    snapshot.set({ status: 'error', error: new Error('falha') });
    TestBed.flushEffects();

    // Error não tem debounce: deve propagar imediatamente
    expect(composed.status()).toBe('error');
  });
});
