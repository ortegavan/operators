import { TestBed } from '@angular/core/testing';
import { resourceFromSnapshots, ResourceSnapshot, signal, WritableSignal } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { withOptimisticUpdate } from './with-optimistic-update';

describe('withOptimisticUpdate', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('deve aplicar o valor otimista imediatamente durante loading', () => {
    let snapshot!: WritableSignal<ResourceSnapshot<string[] | undefined>>;
    let composed!: ReturnType<typeof withOptimisticUpdate<string[] | undefined>>;

    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string[] | undefined>>({
        status: 'resolved',
        value: ['item1', 'item2'],
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      composed = withOptimisticUpdate(fakeResource);
    });

    // Aplica o valor otimista e inicia loading
    composed.applyOptimistic(['item1', 'item2', 'item3']);
    snapshot.set({ status: 'loading', value: undefined });
    TestBed.flushEffects();

    // Deve mostrar o valor otimista como se já estivesse resolvido
    expect(composed.status()).toBe('resolved');
    expect(composed.value()).toEqual(['item1', 'item2', 'item3']);
  });

  it('deve limpar o valor otimista quando o servidor responde com sucesso', () => {
    let snapshot!: WritableSignal<ResourceSnapshot<string[] | undefined>>;
    let composed!: ReturnType<typeof withOptimisticUpdate<string[] | undefined>>;

    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string[] | undefined>>({
        status: 'loading',
        value: undefined,
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      composed = withOptimisticUpdate(fakeResource);
    });

    composed.applyOptimistic(['otimista']);
    snapshot.set({ status: 'loading', value: undefined });
    TestBed.flushEffects();

    expect(composed.value()).toEqual(['otimista']);

    // Servidor responde com o valor real
    snapshot.set({ status: 'resolved', value: ['real'] });
    TestBed.flushEffects();

    expect(composed.status()).toBe('resolved');
    expect(composed.value()).toEqual(['real']);
  });

  it('deve reverter ao estado de erro quando o servidor falha', () => {
    let snapshot!: WritableSignal<ResourceSnapshot<string[] | undefined>>;
    let composed!: ReturnType<typeof withOptimisticUpdate<string[] | undefined>>;

    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string[] | undefined>>({
        status: 'resolved',
        value: ['original'],
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      composed = withOptimisticUpdate(fakeResource);
    });

    composed.applyOptimistic(['otimista']);
    snapshot.set({ status: 'loading', value: undefined });
    TestBed.flushEffects();

    expect(composed.value()).toEqual(['otimista']);

    // Servidor responde com erro
    snapshot.set({ status: 'error', error: new Error('Falha ao salvar') });
    TestBed.flushEffects();

    // Reverte: expõe o erro (valor otimista descartado)
    expect(composed.status()).toBe('error');
  });

  it('não deve aplicar valor otimista quando não está em loading', () => {
    let snapshot!: WritableSignal<ResourceSnapshot<string[] | undefined>>;
    let composed!: ReturnType<typeof withOptimisticUpdate<string[] | undefined>>;

    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string[] | undefined>>({
        status: 'resolved',
        value: ['original'],
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      composed = withOptimisticUpdate(fakeResource);
    });

    // Aplica otimista mas sem mudar para loading
    composed.applyOptimistic(['otimista']);
    TestBed.flushEffects();

    // Sem loading, o valor real deve permanecer
    expect(composed.value()).toEqual(['original']);
  });
});
