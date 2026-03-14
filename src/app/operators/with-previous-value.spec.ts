import { TestBed } from '@angular/core/testing';
import { resourceFromSnapshots, ResourceSnapshot, signal, WritableSignal } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { withPreviousValue } from './with-previous-value';

describe('withPreviousValue', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('deve manter o valor anterior durante loading', () => {
    let snapshot!: WritableSignal<ResourceSnapshot<string | undefined>>;
    let composed!: ReturnType<typeof withPreviousValue<string | undefined>>;

    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string | undefined>>({
        status: 'resolved',
        value: 'dados originais',
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      composed = withPreviousValue(fakeResource);
    });

    snapshot.set({ status: 'loading', value: undefined });
    TestBed.flushEffects();

    expect(composed.value()).toBe('dados originais');
    expect(composed.status()).toBe('loading');
  });

  it('deve retornar o novo valor quando o carregamento resolve', () => {
    let snapshot!: WritableSignal<ResourceSnapshot<string | undefined>>;
    let composed!: ReturnType<typeof withPreviousValue<string | undefined>>;

    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string | undefined>>({
        status: 'resolved',
        value: 'valor antigo',
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      composed = withPreviousValue(fakeResource);
    });

    snapshot.set({ status: 'resolved', value: 'valor novo' });
    TestBed.flushEffects();

    expect(composed.value()).toBe('valor novo');
    expect(composed.status()).toBe('resolved');
  });

  it('não deve preservar o valor quando o estado anterior era erro', () => {
    let snapshot!: WritableSignal<ResourceSnapshot<string | undefined>>;
    let composed!: ReturnType<typeof withPreviousValue<string | undefined>>;

    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string | undefined>>({
        status: 'error',
        error: new Error('falha anterior'),
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      composed = withPreviousValue(fakeResource);
    });

    snapshot.set({ status: 'loading', value: undefined });
    TestBed.flushEffects();

    expect(composed.status()).toBe('loading');
    expect(composed.value()).toBeUndefined();
  });
});
