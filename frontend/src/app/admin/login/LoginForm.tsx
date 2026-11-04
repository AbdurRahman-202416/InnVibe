'use client';

import { useActionState, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { loginAction, type LoginState } from './actions';

/** Staff accounts offered as one-click shortcuts under the form (same as the API's default accounts). */
const QUICK_ACCOUNTS = [
  { role: 'Hotel Manager', username: 'admin', password: 'InnVibe@2026' },
  { role: 'Front Desk', username: 'frontdesk', password: 'Welcome@2026' },
];

/** Submit button that disables itself while the server action runs. */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 w-full cursor-pointer bg-navy px-6 text-base font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-navy-hover disabled:cursor-wait disabled:opacity-60 rounded-md"
    >
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

/** Login form. useActionState gives us the server action's result (error message) without any fetch code. */
export default function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<LoginState | undefined, FormData>(loginAction, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  /** Fill both fields (they are uncontrolled inputs, so we set the DOM values directly). */
  function fillAccount(username: string, password: string) {
    if (usernameRef.current) usernameRef.current.value = username;
    if (passwordRef.current) passwordRef.current.value = password;
    passwordRef.current?.focus();
  }

  const labelClasses = 'flex flex-col gap-1.5 text-sm font-semibold text-ink';
  const inputClasses =
    'min-h-11 w-full border border-line bg-surface px-3.5 text-base font-normal text-ink outline-none transition-colors duration-200 focus:border-gold focus:ring-2 focus:ring-gold/25 rounded-md';

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />

      <label className={labelClasses}>
        Username
        <input
          ref={usernameRef}
          required
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={state?.username ?? ''}
          className={inputClasses}
        />
      </label>

      <label className={labelClasses}>
        Password
        <div className="relative">
          <input
            ref={passwordRef}
            required
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            className={`${inputClasses} pr-20`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 min-w-16 cursor-pointer px-3 text-sm font-semibold text-gold-ink hover:text-ink"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </label>

      {state?.error && (
        <p role="alert" className="border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger rounded-md">
          {state.error}
        </p>
      )}

      <SubmitButton />

      <div className="border-t border-line pt-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Quick access</p>
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {QUICK_ACCOUNTS.map((account) => (
            <li key={account.username}>
              <button
                type="button"
                onClick={() => fillAccount(account.username, account.password)}
                className="flex min-h-14 w-full cursor-pointer flex-col items-start justify-center rounded-md border border-line bg-surface px-3.5 py-2 text-left transition-colors duration-200 hover:border-gold hover:bg-gold-soft"
              >
                <span className="text-sm font-semibold text-ink">{account.role}</span>
                <span className="text-xs tabular-nums text-muted">
                  {account.username} · {account.password}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">Click an account to fill in the sign-in details.</p>
      </div>
    </form>
  );
}
