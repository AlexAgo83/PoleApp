import pkg from "../package.json";

export const appName =
  process.env.NEXT_PUBLIC_APP_NAME ??
  (pkg as any).displayName ??
  (pkg as any).name ??
  "PoleApp";

export const appVersion =
  process.env.NEXT_PUBLIC_APP_VERSION ?? (pkg as any).version ?? "0.0.0";

export const appSignature = `${appName} v${appVersion}`;
