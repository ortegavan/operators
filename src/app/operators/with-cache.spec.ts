import { TestBed } from '@angular/core/testing';
import { resourceFromSnapshots, ResourceSnapshot, signal, WritableSignal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearGlobalCache, withCache } from './with-cache';

describe('withCache', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    clearGlobalCache();
  });

  it('deve servir o valor do cache durante o loading', () => {
    let snapshot!: WritableSignal<ResourceSnapshot<string | undefined>>;
    let composed!: ReturnType<typeof withCache<string | undefined>>;

    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string | undefined>>({
        status: 'resolved',
        value: 'valor em cache',
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      composed = withCache(fakeResource, { key: 'test-key' });
    });

    // Flush para o effect salvar o snapshot resolvido no cache
    TestBed.flushEffects();

    snapshot.set({ status: 'loading', value: undefined });
    TestBed.flushEffects();

    // Durante loading, deve servir o valor cacheado
    expect(composed.value()).toBe('valor em cache');
    expect(composed.status()).toBe('resolved');
  });

  it('deve passar o valor diretamente quando não há cache', () => {
    let snapshot!: WritableSignal<ResourceSnapshot<string | undefined>>;
    let composed!: ReturnType<typeof withCache<string | undefined>>;

    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string | undefined>>({
        status: 'loading',
        value: undefined,
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      composed = withCache(fakeResource, { key: 'empty-key' });
    });

    // Sem cache: deve passar o loading normalmente
    expect(composed.status()).toBe('loading');
  });

  it('deve atualizar o cache quando o resource resolver', () => {
    let snapshot!: WritableSignal<ResourceSnapshot<string | undefined>>;
    let composed!: ReturnType<typeof withCache<string | undefined>>;

    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string | undefined>>({
        status: 'loading',
        value: undefined,
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      composed = withCache(fakeResource, { key: 'update-key' });
    });

    snapshot.set({ status: 'resolved', value: 'dado fresco' });
    TestBed.flushEffects();

    // Depois de resolver, o valor deve estar disponível
    expect(composed.value()).toBe('dado fresco');

    // Ao entrar em loading novamente, deve servir o cache atualizado
    snapshot.set({ status: 'loading', value: undefined });
    TestBed.flushEffects();

    expect(composed.value()).toBe('dado fresco');
  });

  it('deve ignorar cache com TTL expirado na inicialização', () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    let snapshot!: WritableSignal<ResourceSnapshot<string | undefined>>;
    let composed!: ReturnType<typeof withCache<string | undefined>>;

    // Primeiro: cria um resource que resolve e salva no cache
    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string | undefined>>({
        status: 'resolved',
        value: 'dado antigo',
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      withCache(fakeResource, { key: 'expiry-key', ttl: 1000 });
    });
    TestBed.flushEffects();

    // Avança o tempo além do TTL
    vi.advanceTimersByTime(2000);

    // Segundo: cria novo resource com a mesma chave — cache deve estar expirado
    TestBed.runInInjectionContext(() => {
      snapshot = signal<ResourceSnapshot<string | undefined>>({
        status: 'loading',
        value: undefined,
      });

      const fakeResource = resourceFromSnapshots(snapshot);
      composed = withCache(fakeResource, { key: 'expiry-key', ttl: 1000 });
    });

    // Cache expirado: deve passar o loading sem servir dado antigo
    expect(composed.status()).toBe('loading');

    vi.useRealTimers();
  });
});
