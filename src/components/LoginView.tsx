"use client";

import { useState } from "react";
import { MembershipBadge } from "@/components/MembershipBadge";
import type { getDictionary } from "@/i18n/dictionaries";
import { useAppState } from "@/state/AppStateProvider";

type Dictionary = ReturnType<typeof getDictionary>;

export function LoginView({ dictionary }: { dictionary: Dictionary }) {
  const { currentUser, users, loginAs, loginWithPassword, registerWithPassword } = useAppState();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function onRegister() {
    const result = await registerWithPassword({ name, email, inviteCode, password });
    if (result.ok) {
      setMessage(dictionary.auth.registered);
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
      return;
    }

    setMessage(result.message || dictionary.auth.authFailed);
  }

  return (
    <div className="page">
      <section className="hero">
        <span className="eyebrow">{dictionary.auth.login}</span>
        <h1>{dictionary.auth.title}</h1>
        <p>{dictionary.auth.subtitle}</p>
      </section>

      <section className="admin-section admin-section-wide">
        <div className="admin-form-grid">
          <label>
            <span>{dictionary.auth.name}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Lin" />
          </label>
          <label>
            <span>{dictionary.auth.email}</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
            />
          </label>
          <label>
            <span>{dictionary.auth.password}</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              type="password"
            />
          </label>
          <label>
            <span>{dictionary.auth.inviteCode}</span>
            <input
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              placeholder="GOLD-9M4Q"
            />
          </label>
          <div className="form-actions">
            <button type="button" onClick={onRegister}>
              {dictionary.auth.register}
            </button>
            <button type="button" onClick={onLogin}>
              {dictionary.auth.login}
            </button>
            <button type="button" onClick={() => loginAs(null)}>
              {dictionary.auth.logout}
            </button>
          </div>
        </div>
        {message ? <p className="muted">{message}</p> : null}
      </section>

      <section className="admin-section admin-section-wide">
        <div className="section-heading">
          <div>
            <h2>{dictionary.auth.demoLogin}</h2>
            <p>
              {dictionary.auth.currentUser}
              {dictionary.common.colon}
              {currentUser ? currentUser.name : dictionary.membership.visitor}
            </p>
          </div>
        </div>
        <div className="user-list">
          {users.map((user) => (
            <button key={user.id} className="user-row button-row" type="button" onClick={() => loginAs(user.id)}>
              <span>{user.name}</span>
              <MembershipBadge level={user.level} dictionary={dictionary} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
