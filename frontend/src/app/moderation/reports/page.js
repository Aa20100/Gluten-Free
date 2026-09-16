"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getMe, listReports } from "@/lib/api";

function formatDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

/** Best-effort link to the reported target. Comments show the parent post
 *  if we knew it — we don't from this list — so just deep-link the id
 *  into a plain query the moderator can inspect. */
function targetHref(report) {
  if (report.targetType === "post") return `/forum/${report.targetId}`;
  // Comments live inside a post; we don't know which one from the report,
  // so just annotate.
  return null;
}

export default function ReportsPage() {
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { isLoaded: authLoaded, getToken } = useAuth();

  const [role, setRole] = useState({ status: "loading", isMod: false, error: null });
  const [reports, setReports] = useState({ status: "idle", data: [], error: null });

  // Step 1: confirm moderator role. Middleware already ensures the user is
  // signed in (redirects otherwise), so we only handle the role check here.
  useEffect(() => {
    if (!authLoaded || !userLoaded) return;
    if (!isSignedIn) return;
    let cancelled = false;
    getMe(getToken)
      .then((me) => {
        if (cancelled) return;
        setRole({
          status: "success",
          isMod: me?.role === "moderator",
          error: null,
        });
      })
      .catch((error) => !cancelled && setRole({ status: "error", isMod: false, error }));
    return () => { cancelled = true; };
  }, [authLoaded, userLoaded, isSignedIn, getToken]);

  // Step 2: once confirmed moderator, load the reports.
  useEffect(() => {
    if (role.status !== "success" || !role.isMod) return;
    let cancelled = false;
    listReports(getToken)
      .then((data) => !cancelled && setReports({ status: "success", data, error: null }))
      .catch((error) => !cancelled && setReports({ status: "error", data: [], error }));
    return () => { cancelled = true; };
  }, [role, getToken]);

  return (
    <div className="flex flex-1 flex-col bg-amber-50">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Reports
          </h1>
          <p className="mt-2 text-stone-600">
            User-submitted reports for moderator review.
          </p>

          {role.status === "loading" && (
            <p className="mt-8 text-stone-500">Checking your access…</p>
          )}

          {role.status === "success" && !role.isMod && (
            <div className="mt-8 rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-8 text-center">
              <p className="text-5xl" aria-hidden="true">🛡</p>
              <h2 className="mt-4 text-xl font-bold text-stone-900">
                Moderators only
              </h2>
              <p className="mt-2 text-stone-600">
                Your account doesn&apos;t have moderator access.
              </p>
              <Link
                href="/"
                className="mt-6 inline-block rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Back to home
              </Link>
            </div>
          )}

          {role.status === "success" && role.isMod && (
            <div className="mt-8">
              {reports.status === "idle" || reports.status === "loading" ? (
                <p className="text-stone-500">Loading reports…</p>
              ) : reports.status === "error" ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                  <p className="font-semibold text-red-800">
                    Couldn&apos;t load reports.
                  </p>
                  <p className="mt-1 text-sm text-red-700">
                    {reports.error?.message || "Unknown error"}
                  </p>
                </div>
              ) : reports.data.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-10 text-center">
                  <p className="text-lg font-semibold text-stone-800">
                    No reports right now
                  </p>
                  <p className="mt-2 text-sm text-stone-600">
                    Enjoy the quiet.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-orange-100 rounded-2xl border border-orange-100 bg-white shadow-sm">
                  {reports.data.map((r) => (
                    <ReportRow key={r._id} report={r} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ReportRow({ report }) {
  const href = targetHref(report);
  return (
    <li className="p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-amber-900">
              {report.targetType}
            </span>
            <span className="text-xs text-stone-500">
              {formatDateTime(report.createdAt)}
            </span>
          </div>
          <p className="mt-2 text-stone-800">{report.reason}</p>
          <p className="mt-1 text-xs text-stone-500">
            reported by{" "}
            <span className="font-medium text-stone-700">
              {report.reporter?.name || "unknown"}
            </span>
          </p>
        </div>
        <div className="shrink-0 text-sm">
          {href ? (
            <Link
              href={href}
              className="font-semibold text-orange-700 hover:text-orange-800"
            >
              View target →
            </Link>
          ) : (
            <span className="text-xs text-stone-400">
              comment id: <code className="rounded bg-stone-100 px-1">{report.targetId}</code>
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
