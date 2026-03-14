import { Injectable } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { withCache } from '../operators/with-cache';
import { Product } from '../model/product';

@Injectable({ providedIn: 'root' })
export class ProductService {
  // withCache: lista de produtos em cache por 60s para evitar requisições repetidas
  readonly products = withCache(
    httpResource<Product[]>(() => '/api/products'),
    { key: 'products', ttl: 60000 },
  );
}
