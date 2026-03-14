# Resource Operators

> Operadores de composição para a Resource API do Angular — inspirados no modelo mental do `pipe()` do RxJS.

<div align="center">
  <a href="https://angular.dev"><img src="https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white" alt="Angular" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://vitest.dev"><img src="https://img.shields.io/badge/Vitest-3-6E9F18?logo=vitest&logoColor=white" alt="Vitest" /></a>
</div>

Repositório de apoio a artigo em **https://medium.com/@ortegavan**.

## Índice

- [Sobre](#sobre)
- [Operadores disponíveis](#operadores-disponíveis)
- [Como rodar](#como-rodar)
- [Uso](#uso)
  - [withPreviousValue](#withpreviousvalue)
  - [withRetry](#withretry)
  - [withDebounce](#withdebounce)
  - [withCache](#withcache)
  - [withOptimisticUpdate](#withoptimisticupdate)
- [Composição](#composição)
- [Testes](#testes)
- [Estrutura do projeto](#estrutura-do-projeto)

---

## Sobre

O Angular 19+ introduziu a Resource API como forma declarativa de lidar com dados assíncronos. Com `resourceFromSnapshots` e `linkedSignal`, é possível **compor comportamentos em cima de qualquer Resource** de forma reutilizável — exatamente como fazíamos com operadores RxJS.

Cada operador é uma **função pura** que recebe `Resource<T>` e retorna `Resource<T>`. Isso permite encadeamento livre sem acoplamento com HTTP, Angular ou qualquer framework de estado.

## Operadores disponíveis

| Operador                                        | O que faz                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| [`withPreviousValue`](#withpreviousvalue)       | Mantém o valor anterior durante o loading, evitando flash de conteúdo |
| [`withRetry`](#withretry)                       | Retry automático com backoff exponencial em caso de erro              |
| [`withDebounce`](#withdebounce)                 | Suprime o estado de loading na UI durante a janela de debounce        |
| [`withCache`](#withcache)                       | Cache em memória com TTL configurável, compartilhado entre instâncias |
| [`withOptimisticUpdate`](#withoptimisticupdate) | Atualiza a UI imediatamente antes da resposta do servidor             |

---

## Como rodar

**Pré-requisitos:** Node.js 20+ e npm 10+

```bash
npm install
```

Em dois terminais separados:

```bash
# Terminal 1 — API fake (porta 3000)
npm run api

# Terminal 2 — Angular dev server (porta 4200)
npm start
```

Acesse `http://localhost:4200`.

> O dev server possui proxy configurado: chamadas para `/api/*` são redirecionadas automaticamente para `localhost:3000`.

---

## Uso

### `withPreviousValue`

Garante que `resource.value()` nunca fique `undefined` entre carregamentos — o valor anterior é mantido enquanto o novo chega.

```typescript
import { withPreviousValue } from './operators/with-previous-value';

readonly user = withPreviousValue(
  httpResource<User>(() => `/api/users/${this.userId()}`)
);
// user.value() nunca é undefined entre navegações
```

---

### `withRetry`

Tenta novamente automaticamente em caso de erro, com backoff exponencial.

```typescript
import { withRetry } from './operators/with-retry';

readonly products = withRetry(
  httpResource<Product[]>(() => '/api/products'),
  { maxRetries: 3, baseDelay: 500, maxDelay: 10000 }
);
```

| Opção        | Padrão  | Descrição                                 |
| ------------ | ------- | ----------------------------------------- |
| `maxRetries` | `3`     | Número máximo de tentativas               |
| `baseDelay`  | `1000`  | Delay inicial em ms                       |
| `maxDelay`   | `10000` | Delay máximo (cap do backoff exponencial) |

---

### `withDebounce`

Suprime o estado `loading` na UI durante a janela de debounce, evitando flicker em interações rápidas.

```typescript
import { withDebounce } from './operators/with-debounce';

readonly results = withDebounce(
  httpResource<Result[]>(() => `/api/search?q=${this.term()}`),
  400 // delay em ms (padrão: 300)
);
```

> **Nota:** o debounce atua na **camada de apresentação** — ele suprime o flash de loading na UI. Para atrasar a própria requisição, aplique o delay no signal que alimenta a URL.

---

### `withCache`

Armazena o resultado em memória e reutiliza enquanto o TTL não expirar. O cache é compartilhado globalmente entre todas as instâncias que usam a mesma `key`.

```typescript
import { withCache } from './operators/with-cache';

readonly categories = withCache(
  httpResource<Category[]>(() => '/api/categories'),
  { key: 'categories', ttl: 60000 }
);
```

| Opção | Padrão      | Descrição             |
| ----- | ----------- | --------------------- |
| `key` | obrigatório | Chave global do cache |
| `ttl` | `30000`     | Tempo de vida em ms   |

> Em testes, use `clearGlobalCache()` para isolar execuções entre casos de teste.

---

### `withOptimisticUpdate`

Adiciona o método `applyOptimistic(value)` ao resource. A UI atualiza instantaneamente; se o servidor falhar, o estado é revertido automaticamente.

```typescript
import { withOptimisticUpdate } from './operators/with-optimistic-update';

readonly todos = withOptimisticUpdate(
  httpResource<Todo[]>(() => '/api/todos')
);

async toggleTodo(todo: Todo): Promise<void> {
  const updated = this.todos.value()!.map((t) =>
    t.id === todo.id ? { ...t, completed: !t.completed } : t
  );

  this.todos.applyOptimistic(updated);                          // UI atualiza imediatamente

  await firstValueFrom(
    this.http.patch(`/api/todos/${todo.id}`, { completed: !todo.completed })
  );

  this.todos.reload();                                          // Confirma com o servidor
}
```

---

## Composição

Os operadores se encadeiam livremente, como no RxJS — leia de dentro para fora:

```typescript
readonly user = withDebounce(
  withRetry(
    withPreviousValue(
      httpResource<User>(() => `/api/users/${this.userId()}`)
    ),
    { maxRetries: 3 }
  ),
  300
);
```

| Camada              | Responsabilidade                                   |
| ------------------- | -------------------------------------------------- |
| `httpResource`      | Faz a requisição HTTP reativa                      |
| `withPreviousValue` | Mantém o dado anterior durante loading             |
| `withRetry`         | Tenta novamente em caso de falha (3x, com backoff) |
| `withDebounce`      | Evita flash de loading em mudanças rápidas         |

---

## Testes

```bash
npm test
```

Os operadores são testáveis de forma completamente isolada, sem HTTP real. O padrão é criar um `Resource` fake a partir de um `signal` de snapshots:

```typescript
import { TestBed } from '@angular/core/testing';
import { resourceFromSnapshots, ResourceSnapshot, signal } from '@angular/core';
import { withPreviousValue } from './with-previous-value';

it('deve manter o valor anterior durante loading', () => {
  let snapshot!: WritableSignal<ResourceSnapshot<string | undefined>>;
  let composed!: Resource<string | undefined>;

  TestBed.runInInjectionContext(() => {
    snapshot = signal<ResourceSnapshot<string | undefined>>({
      status: 'resolved',
      value: 'dados originais',
    });

    composed = withPreviousValue(resourceFromSnapshots(snapshot));
  });

  snapshot.set({ status: 'loading', value: undefined });
  TestBed.flushEffects();

  expect(composed.value()).toBe('dados originais'); // sem flash!
});
```

Sem HTTP, sem servidor, sem timer — apenas a transformação do snapshot.

---

## Estrutura do projeto

```
src/
└── app/
    ├── model/
    │   ├── user.ts
    │   ├── product.ts
    │   └── todo.ts
    ├── operators/
    │   ├── with-previous-value.ts
    │   ├── with-previous-value.spec.ts
    │   ├── with-retry.ts
    │   ├── with-retry.spec.ts
    │   ├── with-debounce.ts
    │   ├── with-debounce.spec.ts
    │   ├── with-cache.ts
    │   ├── with-cache.spec.ts
    │   ├── with-optimistic-update.ts
    │   └── with-optimistic-update.spec.ts
    ├── services/
    │   ├── user.service.ts
    │   ├── product.service.ts
    │   └── todo.service.ts
    ├── app.ts
    ├── app.html
    └── app.config.ts
db.json                 # Dados da API fake (json-server)
proxy.conf.json         # Proxy /api → localhost:3000
```
