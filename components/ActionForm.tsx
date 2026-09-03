"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { ActionResult } from "@/lib/actions/helpers";
import { Notice } from "@/components/ui";

type Action = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

/** Form com server action; invalida as queries do TanStack informadas em `invalidate` após sucesso. */
export function ActionForm({
  action,
  children,
  submitLabel,
  className = "",
  resetOnSuccess = true,
  confirmText,
  invalidate,
  onSuccess,
}: {
  action: Action;
  children: ReactNode;
  submitLabel: string;
  className?: string;
  resetOnSuccess?: boolean;
  confirmText?: string;
  invalidate?: QueryKey[];
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const queryClient = useQueryClient();
  const lastHandled = useRef<ActionResult | null>(null);

  useEffect(() => {
    if (state && state.ok && state !== lastHandled.current) {
      lastHandled.current = state;
      invalidate?.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      onSuccess?.();
    }
  }, [state, invalidate, onSuccess, queryClient]);

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirmText && !confirm(confirmText)) e.preventDefault();
      }}
      ref={(el) => {
        if (el && state?.ok && resetOnSuccess) el.reset();
      }}
    >
      {children}
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </button>
        {state && !state.ok && <Notice kind="bad">{state.error}</Notice>}
        {state && state.ok && state.message && <Notice kind="ok">{state.message}</Notice>}
      </div>
    </form>
  );
}

export function InlineAction({
  action,
  label,
  confirmText,
  hidden,
  danger,
  invalidate,
}: {
  action: Action;
  label: string;
  confirmText?: string;
  hidden?: Record<string, string>;
  danger?: boolean;
  invalidate?: QueryKey[];
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const queryClient = useQueryClient();
  const lastHandled = useRef<ActionResult | null>(null);

  useEffect(() => {
    if (state && state.ok && state !== lastHandled.current) {
      lastHandled.current = state;
      invalidate?.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    }
  }, [state, invalidate, queryClient]);

  return (
    <form
      action={formAction}
      className="inline-flex items-center gap-2"
      onSubmit={(e) => {
        if (confirmText && !confirm(confirmText)) e.preventDefault();
      }}
    >
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" className={`btn ${danger ? "danger" : ""} !py-1 !px-2 !text-[12px]`} disabled={pending}>
        {pending ? "…" : label}
      </button>
      {state && !state.ok && <span className="text-red text-[11px]">{state.error}</span>}
    </form>
  );
}
