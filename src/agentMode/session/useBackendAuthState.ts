import { COPILOT_LITE } from "@/lite";
import type { BackendAuth, BackendAuthStatus, BackendDescriptor } from "@/agentMode/session/types";
import { logError } from "@/logger";
import { useSettingsValue } from "@/settings/model";
import { Notice } from "obsidian";
import React from "react";

interface BackendAuthSnapshot {
  readonly status: BackendAuthStatus | null;
  readonly signingIn: boolean;
  readonly signingOut: boolean;
  readonly url: string | null;
  readonly deviceCode: string | null;
  readonly failed: boolean;
}

const EMPTY_AUTH_SNAPSHOT = Object.freeze<BackendAuthSnapshot>({
  status: null,
  signingIn: false,
  signingOut: false,
  url: null,
  deviceCode: null,
  failed: false,
});

// eslint-disable-next-line no-control-regex -- strips the CLI's ANSI color codes
const ANSI_ESCAPES = /\x1b\[[0-9;]*m/g;
const DEVICE_CODE_LINE = /^\s*([A-Z0-9]{4}-[A-Z0-9]{4,8})\s*$/;

export function parseDeviceCodeLine(line: string): string | null {
  return DEVICE_CODE_LINE.exec(line.replace(ANSI_ESCAPES, ""))?.[1] ?? null;
}
const authSnapshots = new WeakMap<BackendAuth, BackendAuthSnapshot>();
const authSubscribers = new WeakMap<BackendAuth, Set<() => void>>();
const authControllers = new WeakMap<BackendAuth, AbortController>();
const authOperations = new WeakMap<BackendAuth, Promise<void>>();
const authProbeGenerations = new WeakMap<BackendAuth, number>();
const authStdins = new WeakMap<BackendAuth, import("node:stream").Writable>();

const getAuthSnapshot = (auth: BackendAuth): BackendAuthSnapshot =>
  authSnapshots.get(auth) ?? EMPTY_AUTH_SNAPSHOT;

const subscribeAuthState = (auth: BackendAuth, subscriber: () => void): (() => void) => {
  const subscribers = authSubscribers.get(auth) ?? new Set<() => void>();
  subscribers.add(subscriber);
  authSubscribers.set(auth, subscribers);
  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) authSubscribers.delete(auth);
  };
};

const updateAuthSnapshot = (auth: BackendAuth, update: Partial<BackendAuthSnapshot>): void => {
  const current = getAuthSnapshot(auth);
  const next = Object.freeze({ ...current, ...update });
  if (
    current.status === next.status &&
    current.signingIn === next.signingIn &&
    current.signingOut === next.signingOut &&
    current.url === next.url &&
    current.deviceCode === next.deviceCode &&
    current.failed === next.failed
  ) {
    return;
  }
  authSnapshots.set(auth, next);
  authSubscribers.get(auth)?.forEach((subscriber) => subscriber());
};

const beginAuthProbe = (auth: BackendAuth): number => {
  const generation = (authProbeGenerations.get(auth) ?? 0) + 1;
  authProbeGenerations.set(auth, generation);
  return generation;
};

const publishAuthProbeStatus = (
  auth: BackendAuth,
  status: BackendAuthStatus,
  generation: number
): void => {
  if (
    authProbeGenerations.get(auth) !== generation ||
    getAuthSnapshot(auth).signingIn ||
    getAuthSnapshot(auth).signingOut
  )
    return;
  updateAuthSnapshot(auth, { status });
};

export interface BackendAuthUiState {
  checking: boolean;
  status: BackendAuthStatus | null;
  signingIn: boolean;
  signingOut: boolean;
  url: string | null;
  deviceCode?: string | null;
  signIn: () => void;
  submitCode?: (code: string) => void;
  cancelSignIn: () => void;
  signOut: () => void;
  failed: boolean;
}

export function useBackendAuthState(
  descriptor: BackendDescriptor,
  callerProbeKey?: unknown
): BackendAuthUiState {
  const settings = useSettingsValue();
  // All surfaces must invalidate the same profile; installation paths may change without changing accounts.
  // https://github.com/Brevilabs/obsidian-copilot-private/issues/379
  const probeKey = descriptor.auth?.getProbeKey?.(settings) ?? callerProbeKey;
  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;

  const operationController = React.useRef<AbortController | null>(null);
  const auth = descriptor.auth;
  const [checking, setChecking] = React.useState(Boolean(auth));
  const cancelSignIn = React.useCallback(() => {
    if (auth) authControllers.get(auth)?.abort();
  }, [auth]);
  // Backend replacement must stop the authentication process owned by this surface.
  // https://github.com/Brevilabs/obsidian-copilot-private/issues/379
  React.useEffect(() => () => operationController.current?.abort(), [auth]);
  const previousProbeKey = React.useRef(probeKey);
  const subscribe = React.useCallback(
    (subscriber: () => void) => (auth ? subscribeAuthState(auth, subscriber) : () => undefined),
    [auth]
  );
  const getSnapshot = React.useCallback(
    () => (auth ? getAuthSnapshot(auth) : EMPTY_AUTH_SNAPSHOT),
    [auth]
  );
  const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  React.useEffect(() => {
    if (!auth) return;
    if (previousProbeKey.current !== probeKey) {
      previousProbeKey.current = probeKey;
      authControllers.get(auth)?.abort();
      // Clear the old profile's status and failure, while retaining the busy state until
      // its process stops. Additional mounts keep the cached status during refresh.
      // https://github.com/Brevilabs/obsidian-copilot-private/issues/379
      updateAuthSnapshot(auth, { status: null, failed: false, url: null, deviceCode: null });
    } else if (getAuthSnapshot(auth).signingIn || getAuthSnapshot(auth).signingOut) {
      setChecking(false);
      return;
    }
    // Cached sign-in may be stale when opening a fresh chat.
    // https://github.com/Brevilabs/obsidian-copilot-private/issues/532
    let active = true;
    setChecking(true);
    const generation = beginAuthProbe(auth);
    void (async () => {
      await authOperations.get(auth);
      return auth.getStatus(settingsRef.current);
    })()
      .then(
        (s) => publishAuthProbeStatus(auth, s, generation),
        (e) => {
          logError("[AgentMode] auth status probe failed", e);
          publishAuthProbeStatus(auth, { signedIn: false }, generation);
        }
      )
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [auth, probeKey]);

  const runAuth = React.useCallback(
    (action: "signIn" | "signOut") => {
      // Login and logout share one owned process so one cannot undo the other across surfaces.
      // https://github.com/Brevilabs/obsidian-copilot-private/issues/379
      if (
        !auth ||
        !auth[action] ||
        getAuthSnapshot(auth).signingIn ||
        getAuthSnapshot(auth).signingOut
      )
        return;
      const signingIn = action === "signIn";
      const generation = beginAuthProbe(auth);
      const controller = new AbortController();
      operationController.current = controller;
      authControllers.set(auth, controller);
      updateAuthSnapshot(auth, {
        signingIn,
        signingOut: !signingIn,
        url: null,
        deviceCode: null,
        failed: false,
      });
      if (signingIn) new Notice(`Opening your browser to sign in to ${descriptor.displayName}…`);
      const pending = auth[action](settingsRef.current, {
        signal: controller.signal,
        onUrl: (url: string) => {
          if (!controller.signal.aborted && getAuthSnapshot(auth).signingIn)
            updateAuthSnapshot(auth, { url });
        },
        ...(COPILOT_LITE && signingIn
          ? {
              onLine: (line: string) => {
                const deviceCode = parseDeviceCodeLine(line);
                if (deviceCode && !controller.signal.aborted && getAuthSnapshot(auth).signingIn)
                  updateAuthSnapshot(auth, { deviceCode });
              },
            }
          : {}),
        ...(COPILOT_LITE && signingIn && auth.acceptsPastedCode
          ? { onStdin: (stdin: import("node:stream").Writable) => authStdins.set(auth, stdin) }
          : {}),
      })
        .then((s) => {
          // Cancelled or replaced probes must not publish credentials for an old profile.
          // https://github.com/Brevilabs/obsidian-copilot-private/issues/379
          if (controller.signal.aborted || authProbeGenerations.get(auth) !== generation) return;
          const succeeded = s.signedIn === signingIn;
          updateAuthSnapshot(auth, { status: s, failed: !succeeded });
          new Notice(
            succeeded
              ? signingIn
                ? `Signed in to ${descriptor.displayName}${s.label ? ` as ${s.label}` : ""}.`
                : `Signed out of ${descriptor.displayName}.`
              : `${signingIn ? "Sign-in" : "Sign-out"} didn't complete. Please try again.`
          );
        })
        .catch((e) => {
          if (controller.signal.aborted || authProbeGenerations.get(auth) !== generation) return;
          updateAuthSnapshot(auth, { failed: true });
          logError(`[AgentMode] ${action} failed`, e);
          new Notice(
            `${signingIn ? "Sign-in" : "Sign-out"} for ${descriptor.displayName} failed. Please try again.`
          );
        })
        .finally(() => {
          if (authControllers.get(auth) === controller) {
            authStdins.delete(auth);
            updateAuthSnapshot(auth, {
              signingIn: false,
              signingOut: false,
              url: null,
              deviceCode: null,
            });
          }
        });
      authOperations.set(auth, pending);
    },
    [auth, descriptor.displayName]
  );
  const signIn = React.useCallback(() => runAuth("signIn"), [runAuth]);
  const signOut = React.useCallback(() => runAuth("signOut"), [runAuth]);
  const submitCode = React.useCallback(
    (code: string) => {
      if (auth) authStdins.get(auth)?.write(`${code.trim()}\n`);
    },
    [auth]
  );

  return {
    ...snapshot,
    checking: Boolean(auth && checking),
    signIn,
    signOut,
    cancelSignIn,
    ...(COPILOT_LITE && auth?.acceptsPastedCode ? { submitCode } : {}),
  };
}
