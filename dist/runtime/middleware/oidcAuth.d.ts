interface MiddlewareOptions {
    /**
     * Whether to enable the middleware.
     *
     * @default true
     */
    enabled: boolean;
}
declare module '#app' {
    interface PageMeta {
        oidcAuth?: MiddlewareOptions;
    }
}
declare module 'vue-router' {
    interface RouteMeta {
        oidcAuth?: MiddlewareOptions;
    }
}
declare const _default: import("#app").RouteMiddleware;
export default _default;
