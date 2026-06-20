"use client";

import { useEffect, useState } from "react";
import { Camera, Mail, ShieldCheck, UserRound } from "lucide-react";
import type { getDictionary } from "@/i18n/dictionaries";
import {
  changeAccountEmail,
  changeAccountPassword,
  getAccountProfile,
  uploadAccountAvatar,
  type AccountProfile
} from "@/services/account-client";
import { useAppState } from "@/state/AppStateProvider";

type Dictionary = ReturnType<typeof getDictionary>;

type Message = {
  kind: "error" | "success";
  text: string;
};

export function AccountSettingsView({ dictionary }: { dictionary: Dictionary }) {
  const { currentUser, authReady, logout } = useAppState();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    setLoadingProfile(true);
    void getAccountProfile()
      .then((nextProfile) => {
        if (!cancelled) {
          setProfile(nextProfile);
          setNewEmail(nextProfile.email);
          setConfirmEmail(nextProfile.email);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfile({
            avatarUrl: null,
            disabled: currentUser.disabled,
            displayName: currentUser.name,
            email: currentUser.email,
            id: currentUser.id,
            isAdmin: currentUser.isAdmin,
            level: currentUser.level,
            username: currentUser.email.split("@")[0] ?? currentUser.name
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  async function onChangePassword() {
    setMessage(null);

    try {
      const nextProfile = await changeAccountPassword({
        confirmPassword,
        newPassword,
        oldPassword
      });
      setProfile(nextProfile);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ kind: "success", text: dictionary.account.passwordUpdated });
    } catch (error) {
      setMessage({ kind: "error", text: errorMessage(error, dictionary.account.passwordFailed) });
    }
  }

  async function onChangeEmail() {
    setMessage(null);

    try {
      const nextProfile = await changeAccountEmail({
        confirmEmail,
        newEmail,
        oldPassword: emailPassword
      });
      setProfile(nextProfile);
      setNewEmail(nextProfile.email);
      setConfirmEmail(nextProfile.email);
      setEmailPassword("");
      setMessage({ kind: "success", text: dictionary.account.emailUpdated });
    } catch (error) {
      setMessage({ kind: "error", text: errorMessage(error, dictionary.account.emailFailed) });
    }
  }

  async function onUploadAvatar(file: File | undefined) {
    if (!file) {
      return;
    }

    setMessage(null);

    try {
      const nextProfile = await uploadAccountAvatar(file);
      setProfile(nextProfile);
      setMessage({ kind: "success", text: dictionary.account.avatarUpdated });
    } catch (error) {
      setMessage({ kind: "error", text: errorMessage(error, dictionary.account.avatarFailed) });
    }
  }

  if (!authReady) {
    return (
      <section className="locked-state">
        <div>
          <h2>{dictionary.account.restoring}</h2>
          <p className="muted">{dictionary.account.title}</p>
        </div>
      </section>
    );
  }

  if (!currentUser) {
    return (
      <section className="locked-state">
        <div>
          <h2>{dictionary.account.loginRequired}</h2>
          <p className="muted">{dictionary.auth.subtitle}</p>
        </div>
      </section>
    );
  }

  const visibleProfile = profile;

  return (
    <div className="account-grid">
      <section className="account-card account-profile-card">
        <div className="section-heading">
          <UserRound size={20} />
          <div>
            <h2>{dictionary.account.title}</h2>
            <p>{loadingProfile ? dictionary.account.loading : dictionary.account.subtitle}</p>
          </div>
        </div>

        <div className="account-profile-row">
          <div
            className="avatar-frame"
            role={visibleProfile?.avatarUrl ? undefined : "img"}
            aria-label={visibleProfile?.avatarUrl ? undefined : dictionary.account.avatarAlt}
          >
            {visibleProfile?.avatarUrl ? (
              <img src={visibleProfile.avatarUrl} alt={dictionary.account.avatarAlt} />
            ) : (
              <UserRound size={38} aria-hidden="true" />
            )}
          </div>
          <div>
            <strong>{visibleProfile?.displayName ?? currentUser.name}</strong>
            <span>{visibleProfile?.email ?? currentUser.email}</span>
            <span className={`tier-badge tier-${visibleProfile?.level ?? currentUser.level}`}>
              {dictionary.membership[visibleProfile?.level ?? currentUser.level]}
            </span>
          </div>
        </div>

        <label className="file-upload-label">
          <span>{dictionary.account.avatar}</span>
          <span className="file-upload-control">
            <Camera size={17} />
            <span>{dictionary.account.uploadAvatar}</span>
            <input
              aria-label={dictionary.account.uploadAvatar}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => {
                void onUploadAvatar(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </span>
        </label>
        <p className="muted">{dictionary.account.avatarHint}</p>
      </section>

      <section className="account-card">
        <div className="section-heading">
          <ShieldCheck size={20} />
          <div>
            <h2>{dictionary.account.passwordTitle}</h2>
            <p>{dictionary.account.passwordHint}</p>
          </div>
        </div>
        <div className="account-form">
          <label>
            <span>{dictionary.account.oldPassword}</span>
            <input
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>
          <label>
            <span>{dictionary.account.newPassword}</span>
            <input
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </label>
          <label>
            <span>{dictionary.account.confirmPassword}</span>
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </label>
          <div className="form-actions">
            <button type="button" onClick={onChangePassword}>
              {dictionary.account.savePassword}
            </button>
          </div>
        </div>
      </section>

      <section className="account-card">
        <div className="section-heading">
          <Mail size={20} />
          <div>
            <h2>{dictionary.account.emailTitle}</h2>
            <p>{dictionary.account.emailHint}</p>
          </div>
        </div>
        <div className="account-form">
          <label>
            <span>{dictionary.account.emailPassword}</span>
            <input
              value={emailPassword}
              onChange={(event) => setEmailPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>
          <label>
            <span>{dictionary.account.newEmail}</span>
            <input
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              type="email"
              autoComplete="email"
            />
          </label>
          <label>
            <span>{dictionary.account.confirmEmail}</span>
            <input
              value={confirmEmail}
              onChange={(event) => setConfirmEmail(event.target.value)}
              type="email"
              autoComplete="email"
            />
          </label>
          <div className="form-actions">
            <button type="button" onClick={onChangeEmail}>
              {dictionary.account.saveEmail}
            </button>
            <button type="button" className="secondary-button" onClick={() => void logout()}>
              {dictionary.auth.logout}
            </button>
          </div>
        </div>
      </section>

      {message ? <p className={`account-message account-message-${message.kind}`}>{message.text}</p> : null}
    </div>
  );
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}
