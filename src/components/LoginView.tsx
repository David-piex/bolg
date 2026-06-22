"use client";

import { useState } from "react";
import { KeyRound, LogIn, UserPlus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import type { getDictionary } from "@/i18n/dictionaries";
import { normalizeLocale } from "@/i18n/routing";
import { useAppAuthState } from "@/state/AppStateProvider";

type Dictionary = ReturnType<typeof getDictionary>;

export function LoginView({ dictionary }: { dictionary: Dictionary }) {
  const params = useParams<{ locale?: string }>();
  const router = useRouter();
  const { currentUser, loginWithPassword, logout, registerWithPassword } = useAppAuthState();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function onRegister() {
    const result = await registerWithPassword({ name, email, inviteCode, password });
    if (result.ok) {
      setMessage(dictionary.auth.registered);
      setMode("login");
      setName("");
      setEmail("");
      setPassword("");
      setInviteCode("");
      return;
    }

    setMessage(result.message || dictionary.auth.authFailed);
  }

  async function onLogin() {
    const result = await loginWithPassword({ email, password });
    if (result.ok) {
      setMessage(dictionary.auth.loggedIn);
      setPassword("");
      router.replace(`/${normalizeLocale(params.locale)}`);
      return;
    }

    setMessage(result.message || dictionary.auth.authFailed);
  }

  return (
    <div className="page">
      <section className="hero auth-hero">
        <span className="eyebrow">{dictionary.auth.login}</span>
        <h1>{dictionary.auth.title}</h1>
        <p>{dictionary.auth.subtitle}</p>
      </section>

      <section className="auth-panel">
        <div className="auth-tabs" role="tablist" aria-label={dictionary.auth.title}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            <LogIn size={17} />
            <span>{dictionary.auth.loginTab}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            <UserPlus size={17} />
            <span>{dictionary.auth.registerTab}</span>
          </button>
        </div>

        <div className="auth-card">
          <div className="section-heading">
            {mode === "login" ? <LogIn size={20} /> : <KeyRound size={20} />}
            <div>
              <h2>{mode === "login" ? dictionary.auth.loginTitle : dictionary.auth.registerTitle}</h2>
              <p>{mode === "login" ? dictionary.auth.loginHint : dictionary.auth.registerHint}</p>
            </div>
          </div>

          <div className="auth-form">
            {mode === "register" ? (
              <>
                <label>
                  <span>{dictionary.auth.inviteCode}</span>
                  <input
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    placeholder="GOLD-9M4Q"
                    autoComplete="one-time-code"
                  />
                </label>
                <label>
                  <span>{dictionary.auth.name}</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="例如：林然"
                    autoComplete="nickname"
                  />
                </label>
              </>
            ) : null}

            <label>
              <span>{dictionary.auth.email}</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                type="email"
                autoComplete="email"
              />
            </label>
            <label>
              <span>{dictionary.auth.password}</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 8 位密码"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </label>

            <div className="form-actions auth-actions">
              <button type="button" onClick={mode === "login" ? onLogin : onRegister}>
                {mode === "login" ? dictionary.auth.login : dictionary.auth.register}
              </button>
              {currentUser ? (
                <button type="button" className="secondary-button" onClick={() => void logout()}>
                  {dictionary.auth.logout}
                </button>
              ) : null}
            </div>
          </div>

          <p className="muted">
            {dictionary.auth.currentUser}
            {dictionary.common.colon}
            {currentUser ? currentUser.name : dictionary.membership.visitor}
          </p>
          {message ? <p className="muted">{message}</p> : null}
        </div>
      </section>
    </div>
  );
}
