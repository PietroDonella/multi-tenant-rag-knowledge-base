"use client";

import { useActionState } from "react";
import { signIn, signUp, type ActionState } from "@/actions/documents";

const initial: ActionState = {};

function Fields() {
  return (
    <>
      <label className="block text-sm font-medium">
        E-mail
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
        />
      </label>
      <label className="block text-sm font-medium">
        Senha
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
        />
      </label>
    </>
  );
}

export function AuthForm({ nextPath }: { nextPath: string }) {
  const [signInState, signInAction, signingIn] = useActionState(signIn, initial);
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, initial);

  return (
    <div className="mt-8 space-y-8">
      <form action={signInAction} className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <input type="hidden" name="next" value={nextPath} />
        <Fields />
        {signInState.error ? <p className="text-sm text-[var(--warn)]">{signInState.error}</p> : null}
        <button
          type="submit"
          disabled={signingIn}
          className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 font-medium text-white disabled:opacity-60"
        >
          {signingIn ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <form action={signUpAction} className="space-y-3 rounded-2xl border border-dashed border-[var(--line)] p-5">
        <p className="text-sm font-medium">Criar conta</p>
        <Fields />
        {signUpState.error ? <p className="text-sm text-[var(--warn)]">{signUpState.error}</p> : null}
        {signUpState.ok ? <p className="text-sm text-[var(--accent)]">{signUpState.ok}</p> : null}
        <button type="submit" disabled={signingUp} className="text-sm font-semibold underline">
          {signingUp ? "Criando…" : "Cadastrar"}
        </button>
      </form>
    </div>
  );
}
