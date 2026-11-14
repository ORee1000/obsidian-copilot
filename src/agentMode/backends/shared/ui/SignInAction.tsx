import type { BackendAuthStatus } from "@/agentMode/session/types";
import { Button } from "@/components/ui/button";
import { openLinkInSystemBrowser } from "@/utils/electronShell";
import React from "react";

export interface SignInActionProps {
  status: BackendAuthStatus | null;
  onSignIn: () => void;
  signingIn: boolean;
  url: string | null;
  onCancel?: () => void;
  failed?: boolean;
  signInLabel?: string;
  onSubmitCode?: (code: string) => void;
  deviceCode?: string | null;
}

const DeviceCode: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(
      () => setCopied(true),
      () => setCopied(false)
    );
  };
  return (
    <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-text-sm">
      <span className="tw-text-muted">Enter this one-time code on the sign-in page:</span>
      <code className="tw-text-base tw-font-semibold">{code}</code>
      <Button variant="secondary" size="sm" onClick={copy}>
        {copied ? "Copied" : "Copy code"}
      </Button>
    </div>
  );
};

const PastedCodeForm: React.FC<{ onSubmit: (code: string) => void }> = ({ onSubmit }) => {
  const [code, setCode] = React.useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    onSubmit(code);
    setCode("");
  };
  return (
    <form className="tw-flex tw-w-full tw-flex-col tw-gap-1" onSubmit={submit}>
      <label className="tw-text-sm tw-text-muted" htmlFor="copilot-sign-in-code">
        If the sign-in page shows a code, paste it here.
      </label>
      <div className="tw-flex tw-w-full tw-items-center tw-gap-2">
        <input
          id="copilot-sign-in-code"
          type="text"
          autoComplete="off"
          spellCheck={false}
          className="tw-min-w-0 tw-flex-1"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Authentication code"
        />
        <Button type="submit" variant="default" size="sm" disabled={!code.trim()}>
          Submit code
        </Button>
      </div>
    </form>
  );
};

export const SignInAction: React.FC<SignInActionProps> = (auth) => (
  <div className="tw-flex tw-flex-col tw-items-start tw-gap-2" aria-live="polite">
    {auth.status?.signedIn ? (
      <span>Signed in{auth.status.label ? ` as ${auth.status.label}` : ""}.</span>
    ) : (
      <>
        {auth.signingIn && (
          <p className="tw-my-0 tw-text-sm tw-text-muted">Finish signing in in your browser.</p>
        )}
        {auth.failed && (
          <p className="tw-my-0 tw-text-sm tw-text-muted">Sign-in didn't complete. Try again.</p>
        )}
        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
          {auth.signingIn && auth.url ? (
            <Button asChild variant="default" size="sm">
              <a
                href={auth.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={openLinkInSystemBrowser}
              >
                Open sign-in page
              </a>
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={auth.onSignIn}
              disabled={auth.signingIn || auth.status === null}
            >
              {auth.signingIn
                ? "Signing in…"
                : auth.failed
                  ? "Try again"
                  : auth.status === null
                    ? "Checking sign-in…"
                    : (auth.signInLabel ?? "Sign in")}
            </Button>
          )}
          {auth.signingIn && auth.onCancel && (
            <Button variant="ghost" size="sm" onClick={auth.onCancel}>
              Cancel sign-in
            </Button>
          )}
        </div>
        {auth.signingIn && auth.deviceCode && <DeviceCode code={auth.deviceCode} />}
        {auth.signingIn && auth.url && auth.onSubmitCode && (
          <PastedCodeForm onSubmit={auth.onSubmitCode} />
        )}
      </>
    )}
  </div>
);
