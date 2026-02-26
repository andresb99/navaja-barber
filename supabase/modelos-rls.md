# RLS - Modulo de Modelos

Resumen de politicas aplicadas en `202602230002_models_module.sql`:

- `models`
  - Publico (`anon`/`authenticated`): solo `insert`.
  - Admin: `CRUD` por `shop_id` via `public.is_admin(shop_id)`.
  - No hay politicas de lectura publica.

- `model_requirements`
  - Publico: `select` unicamente si `is_open = true` y la sesion/curso estan activos.
  - Admin: `CRUD` para sesiones de su tienda.

- `model_applications`
  - Publico: `insert` solo con `status='applied'`, convocatoria abierta y coherencia entre `model_id` y tienda de la sesion.
  - Admin: `CRUD` para sesiones de su tienda.
  - No hay lectura publica.

- `waivers`
  - Publico: `insert` solo si existe postulacion (`session_id`, `model_id`) en `model_applications`.
  - Admin: `CRUD` para sesiones de su tienda.
  - No hay lectura publica.

Notas:
- El MVP mantiene registro publico anonimo sin lectura de datos sensibles.
- Subida de fotos de modelos queda pendiente para fase siguiente (TODO), priorizando seguridad.
