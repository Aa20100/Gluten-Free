"use client";

import { useEffect, useState } from "react";
import { SignInButton, useAuth, useUser } from "@clerk/nextjs";

import { reportContent } from "@/lib/api";

/**
 * Small "Report" button + confirm modal. Used by both post and comment
 * views. Requires sign-in — otherwise opens Clerk's sign-in modal.
 *
 * Props:
 *   targetType  "post" | "comment"
 *   targetId    string
 *   compact     when true, renders as a small text link instead of a chip
 */
export default function ReportButton({ targetType, targetId, compact }) {
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);

  const btnClass = compact
    ? "text-xs font-medium text-stone-500 hover:text-red-700"
    : "inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-600 shadow-sm hover:border-red-200 hover:text-red-700";

  const trigger = (
    <button
      type="button"
      onClick={() => isSignedIn && setOpen(true)}
      className={btnClass}
      title="Report this to moderators"
    >
      <span aria-hidden="true">⚑</span> Report
    </button>
  );

  return (
    <>
      {isSignedIn ? trigger : <SignInButton mode="modal">{trigger}</SignInButton>}
      {open && (
        <ReportModal
          targetType={targetType}
          targetId={targetId}
          getToken={getToken}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ReportModal({ targetType, targetId, getToken, onClose }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  // Escape closes.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSubmit = reason.trim().length > 0 && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await reportContent(
        { targetType, targetId, reason: reason.trim() },
        getToken
      );
      setDone(true);
      // Auto-close after a moment so the user sees the confirmation.
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-heading"
        className="relative w-full max-w-md rounded-2xl border border-orange-100 bg-white p-6 shadow-xl"
      >
        <h2 id="report-heading" className="text-lg font-bold text-stone-900">
          Report this {targetType}
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Let moderators know what&apos;s wrong. We&apos;ll take a look.
        </p>

        {done ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Thanks — your report has been sent.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-stone-800">
                Reason
              </span>
              <textarea
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="e.g. spam, harassment, unsafe medical advice"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </label>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {error.message || "Something went wrong."}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Reporting…" : "Send report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
