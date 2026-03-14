# Resource Operators

Uma biblioteca de operadores de composição para a Resource API do Angular, inspirada no modelo mental do `pipe()` do RxJS.

> Repositório de apoio ao artigo **"O novo pipe() do Angular — como `resourceFromSnapshots` ressuscitou o modelo mental do pipe()"**.

## Sobre

O Angular 19+ introduziu a Resource API como forma declarativa de lidar com dados assíncronos. Com `resourceFromSnapshots` e `linkedSignal`, é possível **compor comportamentos em cima de qualquer Resource** de forma reutilizável — exatamente como fazíamos com operadores RxJS.

Este repositório implementa 5 operadores prontos para uso:

| Operador | O que faz |
|---|---|
| `withPreviousValue` | Mantém o valor anterior durante o loading, evitando flash de conteúdo |
| `withRetry` | Retry automático com backoff exponencial em caso de erro |
| `withDebounce` | Suprime o estado de loading na UI durante a janela de debounce |
| `withCache` | Cache em memória com TTL configurável entre instâncias |
| `withOptimisticUpdate` | Atualiza a UI imediatamente antes da resposta do servidor |

## Stack

- **Angular 21** — zoneless, signals, Resource API
- **Vitest** — test runner
- **json-server** — API fake para demonstração

## Como rodar

### Pré-requisitos

- Node.js 20+
- npm 10+

### Instalação

```bash
npm install
```

### Desenvolvimento

Em dois terminais separados:

```bash
# Terminal 1 — API fake (porta 3000)
npm run api

# Terminal 2 — Angular dev server (porta 4200, com proxy para /api)
npm start
```

Acesse `http://localhost:4200`.

### Testes

```bash
npm test
```

## Os operadores

Cada operador é uma função pura que recebe `Resource<T>` e retorna `Resource<T>` (ou um subtipo). Isso permite composição livre:

```typescript
userId = signal(1);

user = withDebounce(
  withRetry(
    withPreviousValue(
      httpResource<User>(() => `/api/users/${this.userId()}`)
    ),
    { maxRetries: 3 }
  ),
  300
);
```

Leia de dentro para fora:
1. `httpResource` faz a requisição HTTP
2. `withPreviousValue` mantém o dado anterior durante loading
3. `withRetry` tenta novamente em caso de falha (até 3x, com backoff)
4. `withDebounce` evita flash de loading em mudanças rápidas

### `withPreviousValue`

```typescript
import { withPreviousValue } from './operators/with-previous-value';

user = withPreviousValue(
  httpResource<User>(() => `/api/users/${this.userId()}`)
);
// user.value() nunca fica undefined entre carregamentos
```

### `withRetry`

```typescript
import { withRetry } from './operators/with-retry';

products = withRetry(
  httpResource<Product[]>(() => '/api/products'),
  { maxRetries: 3, baseDelay: 500, maxDelay: 10000 }
);
```

Opções:

| Opção | Padrão | Descrição |
|---|---|---|
| `maxRetries` | `3` | Número máximo de tentativas |
| `baseDelay` | `1000` | Delay inicial em ms |
| `maxDelay` | `10000` | Delay máximo em ms (cap do backoff) |

### `withDebounce`

```typescript
import { withDebounce } from './operators/with-debounce';

results = withDebounce(
  httpResource<Result[]>(() => `/api/search?q=${this.term()}`),
  400 // delay em ms (padrão: 300)
);
```

> **Nota:** o debounce atua na **camada de apresentação** — suprime o flash de loading na UI. Para debounce real da requisição, aplique o delay no signal que alimenta a URL.

### `withCache`

```typescript
import { withCache } from './operators/with-cache';

categories = withCache(
  httpResource<Category[]>(() => '/api/categories'),
  { key: 'categories', ttl: 60000 } // TTL em ms (padrão: 30000)
);
```

O cache é compartilhado globalmente entre instâncias que usam a mesma `key`. Em testes, use `clearGlobalCache()` para isolar execuções.

### `withOptimisticUpdate`

```typescript
import { withOptimisticUpdate } from './operators/with-optimistic-update';

todos = withOptimisticUpdate(
  httpResource<Todo[]>(() => '/api/todos')
);

async toggleTodo(todo: Todo): Promise<void> {
  const updated = this.todos.value()!.map(t =>
    t.id === todo.id ? { ...t, completed: !t.completed } : t
  );

  this.todos.applyOptimistic(updated); // UI atualiza imediatamente
  await fetch(`/api/todos/${todo.id}`, { method: 'PATCH', ... });
  this.todos.reload();                 // Confirma com o servidor
}
```

Se o `reload()` falhar, o operador reverte automaticamente para o estado de erro.

## Estrutura do projeto

```
src/
└── app/
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
    ├── app.ts          # Componente demo com todos os operadores
    ├── app.html
    └── app.config.ts
db.json                 # Dados da API fake (json-server)
proxy.conf.json         # Proxy /api → localhost:3000
```

## Testando os operadores

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

Não há HTTP, não há servidor, não há timer. O teste valida apenas a transformação do snapshot.
