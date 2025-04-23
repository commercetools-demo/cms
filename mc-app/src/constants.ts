// Make sure to import the helper functions from the `ssr` entry point.
import { entryPointUriPathToPermissionKeys } from '@commercetools-frontend/application-shell/ssr';

declare const window: Window &
  typeof globalThis & {
    app: { entryPointUriPath: string };
  };

export const entryPointUriPath =
  typeof window === 'undefined'
    ? process.env.ENTRY_POINT_URI_PATH || 'cms-app'
    : window.app.entryPointUriPath || 'cms-app';

export const PERMISSIONS = entryPointUriPathToPermissionKeys(entryPointUriPath);
