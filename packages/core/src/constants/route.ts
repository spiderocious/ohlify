/**
 * Type-safe nested route builder.
 *
 *   const ROUTES = route('', {
 *     HOME: route('home'),
 *     PROFESSIONAL: route('professional/:id', {
 *       SCHEDULE: route('schedule'),
 *     }),
 *   });
 *
 *   ROUTES.HOME.absPath                    // '/home'
 *   ROUTES.HOME.relativePath               // 'home'
 *   ROUTES.PROFESSIONAL.absPath            // '/professional/:id'
 *   ROUTES.PROFESSIONAL.SCHEDULE.absPath   // '/professional/:id/schedule'
 *   ROUTES.PROFESSIONAL.build({ id: 'p1' })// '/professional/p1'
 *
 * Returns objects with `relativePath`, `absPath`, and (when the path includes
 * `:param` segments) a typed `build(params)` helper.
 */
type ParamName<S extends string> = S extends `${string}:${infer P}/${infer Rest}`
  ? P | ParamName<`/${Rest}`>
  : S extends `${string}:${infer P}`
    ? P
    : never;

type ParamsOf<S extends string> = [ParamName<S>] extends [never]
  ? Record<string, never>
  : { [K in ParamName<S>]: string };

export interface RouteNode<P extends string> {
  /** Path segment relative to the parent. e.g. `'detail/:id'`. */
  relativePath: P;
  /** Absolute path from the root. e.g. `'/professional/detail/:id'`. */
  absPath: string;
  /** Build a concrete URL by substituting the path params. */
  build: (params: ParamsOf<P>) => string;
}

type RouteWithChildren<P extends string, C extends Record<string, unknown>> = RouteNode<P> & C;

function buildPath<P extends string>(template: P, params: ParamsOf<P>): string {
  return template.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key: string) => {
    const value = (params as Record<string, string | undefined>)[key];
    if (value === undefined) {
      throw new Error(`route.build: missing required param '${key}' for '${template}'`);
    }
    return encodeURIComponent(value);
  });
}

function joinAbs(parent: string, segment: string): string {
  if (segment === '') return parent === '' ? '/' : parent;
  if (parent === '' || parent === '/') return `/${segment}`;
  return `${parent}/${segment}`;
}

function rehydrate<C extends Record<string, RouteNode<string>>>(children: C, parentAbs: string): C {
  const out = {} as Record<string, RouteNode<string>>;
  for (const key in children) {
    const child = children[key];
    if (!child) continue;
    const newAbs = joinAbs(parentAbs, child.relativePath);
    const childChildren: Record<string, RouteNode<string>> = {};
    for (const k in child) {
      if (k === 'relativePath' || k === 'absPath' || k === 'build') continue;
      const v = (child as unknown as Record<string, unknown>)[k];
      if (v && typeof v === 'object' && 'relativePath' in (v as object)) {
        childChildren[k] = v as RouteNode<string>;
      }
    }
    out[key] = {
      ...child,
      ...rehydrate(childChildren, newAbs),
      absPath: newAbs,
      build: (params: Record<string, string>) =>
        buildPath(child.relativePath, params as ParamsOf<typeof child.relativePath>),
    };
  }
  return out as C;
}

export function route<P extends string>(relativePath: P): RouteNode<P>;
export function route<P extends string, C extends Record<string, RouteNode<string>>>(
  relativePath: P,
  children: C,
): RouteWithChildren<P, C>;
export function route<P extends string, C extends Record<string, RouteNode<string>>>(
  relativePath: P,
  children?: C,
): RouteNode<P> | RouteWithChildren<P, C> {
  const absPath = relativePath === '' ? '/' : `/${relativePath}`;
  const node: RouteNode<P> = {
    relativePath,
    absPath,
    build: (params) => buildPath(relativePath, params),
  };

  if (!children) return node;

  return {
    ...node,
    ...rehydrate(children, absPath),
  } as RouteWithChildren<P, C>;
}
