import { useEffect, useState, type FormEvent } from "react";
import {
  identitySchema,
  clinicSchema,
  auditListSchema,
  type Identity,
  type Clinic,
  type Audit,
} from "@dentalhq/contracts";
import { api, ApiError } from "./api";
import "./style.css";

export default function App() {
  if (window.location.pathname === "/booking")
    return <main>This is booking</main>;
  if (window.location.pathname !== "/")
    return (
      <main>
        <h1>Page not found</h1>
        <a href="/">Return to dashboard</a>
      </main>
    );
  return <Dashboard />;
}
function Dashboard() {
  const [identity, setIdentity] = useState<Identity | null>(null),
    [clinic, setClinic] = useState<Clinic | null>(null);
  const [events, setEvents] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function selectClinic(id: string) {
    setClinic(null);
    setEvents([]);
    const [detail, audit] = await Promise.all([
      api(`/clinics/${id}`),
      api(`/clinics/${id}/audit`),
    ]);
    setClinic(clinicSchema.parse(detail));
    setEvents(auditListSchema.parse(audit));
  }
  async function load() {
    setLoading(true);
    setError("");
    try {
      const me = identitySchema.parse(await api("/me"));
      setIdentity(me);
      if (me.clinics[0]) await selectClinic(me.clinics[0].id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setIdentity(null);
        setClinic(null);
      } else
        setError(e instanceof Error ? e.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function action(operation: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await operation();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  function submit(
    e: FormEvent<HTMLFormElement>,
    operation: (f: FormData) => Promise<void>,
  ) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void action(() => operation(f));
  }
  const role = identity?.clinics.find((c) => c.id === clinic?.id)?.role;
  return (
    <main>
      <header>
        <a className="brand" href="/">
          DentalHQ <span>Clinic dashboard</span>
        </a>
        {identity ? (
          <button
            disabled={busy}
            onClick={() =>
              void action(async () => {
                await api("/auth/sign-out", "POST", {});
                setIdentity(null);
                setClinic(null);
              })
            }
          >
            Sign out
          </button>
        ) : null}
      </header>
      <p className="eyebrow">YOUR CLINIC WORKSPACE</p>
      <h1>Ready for a better clinic day.</h1>
      <p className="intro">
        A secure home for your clinic team. Appointment workflows are coming
        next.
      </p>
      {error ? (
        <div className="error" role="alert">
          {error} <button onClick={() => void load()}>Retry</button>
        </div>
      ) : null}
      {notice ? (
        <p role="status" className="notice">
          {notice}
        </p>
      ) : null}
      {loading ? (
        <p role="status">Loading your workspace…</p>
      ) : !identity ? (
        <section className="card narrow">
          <h2>Clinic sign in</h2>
          <p>Use the account provisioned for your team.</p>
          <form
            onSubmit={(e) =>
              submit(e, async (f) => {
                await api("/auth/sign-in/email", "POST", {
                  email: f.get("email"),
                  password: f.get("password"),
                });
                await load();
              })
            }
          >
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          </form>
        </section>
      ) : identity.clinics.length === 0 ? (
        <section className="card">
          <h2>No clinic access yet</h2>
          <p>
            Ask your clinic owner or DentalHQ operator to assign your account.
            Operator status alone does not grant clinic access.
          </p>
        </section>
      ) : (
        <>
          <label className="selector">
            Clinic
            <select
              disabled={busy}
              value={clinic?.id ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                void action(() => selectClinic(id));
              }}
            >
              <option value="" disabled>
                Select clinic
              </option>
              {identity.clinics.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name} · {c.role}
                </option>
              ))}
            </select>
          </label>
          {!clinic ? (
            <p role="status">
              {busy
                ? "Loading clinic…"
                : "Select a clinic or retry loading your workspace."}
            </p>
          ) : (
            <>
              <div className="grid">
                <section className="card">
                  <h2>{clinic.name}</h2>
                  <p>
                    Your role: <strong>{role}</strong>
                  </p>
                  <p>
                    No appointment tasks yet. Booking and patient-readiness
                    flows belong to later phases.
                  </p>
                </section>
                <section className="card" key={clinic.id}>
                  <h2>Clinic configuration</h2>
                  {role === "staff" ? (
                    <p>Only owners and managers can change clinic settings.</p>
                  ) : (
                    <form
                      onSubmit={(e) =>
                        submit(e, async (f) => {
                          setClinic(
                            clinicSchema.parse(
                              await api(`/clinics/${clinic.id}`, "PATCH", {
                                timezone: f.get("timezone"),
                                bookingEnabled:
                                  f.get("bookingEnabled") === "on",
                              }),
                            ),
                          );
                          setEvents(
                            auditListSchema.parse(
                              await api(`/clinics/${clinic.id}/audit`),
                            ),
                          );
                          setNotice("Settings saved and audited.");
                        })
                      }
                    >
                      <label>
                        Timezone
                        <input
                          name="timezone"
                          defaultValue={clinic.timezone}
                          required
                        />
                      </label>
                      <label className="checkbox">
                        <input
                          name="bookingEnabled"
                          type="checkbox"
                          defaultChecked={clinic.bookingEnabled}
                        />
                        Booking configuration flag
                      </label>
                      <p>
                        This flag does not activate a patient booking workflow
                        in Phase 1.
                      </p>
                      <button disabled={busy}>Save settings</button>
                    </form>
                  )}
                </section>
              </div>
              {role === "owner" ? (
                <section className="card">
                  <h2>Team access</h2>
                  <p>
                    Assign a provisioned account to this clinic or change its
                    manager/staff role.
                  </p>
                  <form
                    onSubmit={(e) =>
                      submit(e, async (f) => {
                        await api(`/clinics/${clinic.id}/members`, "PUT", {
                          email: f.get("email"),
                          role: f.get("role"),
                        });
                        setNotice("Team access updated and audited.");
                        setEvents(
                          auditListSchema.parse(
                            await api(`/clinics/${clinic.id}/audit`),
                          ),
                        );
                      })
                    }
                  >
                    <label>
                      Account email
                      <input name="email" type="email" required />
                    </label>
                    <label>
                      Role
                      <select name="role">
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                      </select>
                    </label>
                    <button disabled={busy}>Save team access</button>
                  </form>
                  <h3>Revoke team access</h3>
                  <p>
                    Remove a manager or staff member from this clinic. Other
                    clinic memberships are unaffected.
                  </p>
                  <form
                    onSubmit={(e) =>
                      submit(e, async (f) => {
                        await api(`/clinics/${clinic.id}/members`, "DELETE", {
                          email: f.get("email"),
                        });
                        setNotice("Team access revoked and audited.");
                        setEvents(
                          auditListSchema.parse(
                            await api(`/clinics/${clinic.id}/audit`),
                          ),
                        );
                      })
                    }
                  >
                    <label>
                      Member email to remove
                      <input name="email" type="email" required />
                    </label>
                    <button disabled={busy}>Revoke clinic access</button>
                  </form>
                </section>
              ) : null}
              <section className="card">
                <h2>Audit history</h2>
                {events.length === 0 ? (
                  <p>No recorded changes yet.</p>
                ) : (
                  <ul>
                    {events.map((event) => (
                      <li key={event.id}>
                        {event.action} ·{" "}
                        {new Date(event.createdAt).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </>
      )}
      <footer>
        Foundation release · Use synthetic data during development.
      </footer>
    </main>
  );
}
