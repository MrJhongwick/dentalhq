import { useEffect, useState, type FormEvent } from "react";
import {
  identitySchema,
  clinicListSchema,
  clinicSchema,
  auditListSchema,
  supportGrantSchema,
  type Identity,
  type Clinic,
  type Audit,
} from "@dentalhq/contracts";
import { api, ApiError } from "./api";
import "./style.css";

export default function App() {
  if (window.location.pathname !== "/")
    return (
      <main>
        <h1>Page not found</h1>
        <a href="/">Return to console</a>
      </main>
    );
  return <Console />;
}
function Console() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [support, setSupport] = useState<{
    clinic: Clinic;
    events: Audit[];
    expiresAt: string;
  } | null>(null);
  useEffect(() => {
    if (!support) return;
    const timer = window.setTimeout(
      () => {
        setSupport(null);
        setNotice("Support access expired. Start a new session if needed.");
      },
      Math.max(0, Date.parse(support.expiresAt) - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [support]);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const me = identitySchema.parse(await api("/me"));
      setIdentity(me);
      if (me.operator)
        setClinics(clinicListSchema.parse(await api("/operator/clinics")));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setIdentity(null);
      else setError(e instanceof Error ? e.message : "Unable to load console.");
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
    operation: (form: FormData) => Promise<void>,
  ) {
    e.preventDefault();
    const form = e.currentTarget;
    void action(async () => {
      await operation(new FormData(form));
      form.reset();
    });
  }
  return (
    <main>
      <header>
        <a href="/" className="brand">
          DentalHQ <span>Console</span>
        </a>
        {identity ? (
          <button
            disabled={busy || loading}
            onClick={() =>
              void action(async () => {
                await api("/auth/sign-out", "POST", {});
                setIdentity(null);
                setSupport(null);
              })
            }
          >
            Sign out
          </button>
        ) : null}
      </header>
      <p className="eyebrow">CLINIC OPERATIONS</p>
      <h1>A clear start for every clinic.</h1>
      <p className="intro">
        Provision your team, set up a clinic, and support it with an accountable
        access trail.
      </p>
      {error ? (
        <div role="alert" className="error">
          {error} <button onClick={() => void load()}>Retry</button>
        </div>
      ) : null}
      {notice ? (
        <p role="status" className="notice">
          {notice}
        </p>
      ) : null}
      {loading ? (
        <p role="status">Loading console…</p>
      ) : !identity ? (
        <section className="card narrow">
          <h2>Operator sign in</h2>
          <p>Use your provisioned DentalHQ account.</p>
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
      ) : !identity.operator ? (
        <section className="card">
          <h2>Operator access required</h2>
          <p>
            Your account can use the clinic dashboard but cannot administer
            DentalHQ.
          </p>
          <a href="http://localhost:3001/">Open clinic dashboard</a>
        </section>
      ) : (
        <>
          <div className="grid">
            <section className="card">
              <h2>1. Provision an account</h2>
              <p>
                Create a clinic owner's or team member's credentials. Share them
                securely outside this console.
              </p>
              <form
                onSubmit={(e) =>
                  submit(e, async (f) => {
                    await api("/operator/users", "POST", {
                      name: f.get("name"),
                      email: f.get("email"),
                      password: f.get("password"),
                    });
                    setNotice(
                      "Account created. You can now assign it to a clinic.",
                    );
                  })
                }
              >
                <label>
                  Full name
                  <input name="name" required minLength={2} maxLength={100} />
                </label>
                <label>
                  Account email
                  <input name="email" type="email" required />
                </label>
                <label>
                  Initial password
                  <input
                    name="password"
                    type="password"
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <button disabled={busy}>Create account</button>
              </form>
            </section>
            <section className="card">
              <h2>2. Onboard a clinic</h2>
              <p>
                The selected owner receives clinic access. Booking remains
                disabled during setup.
              </p>
              <form
                onSubmit={(e) =>
                  submit(e, async (f) => {
                    await api("/operator/clinics", "POST", {
                      name: f.get("name"),
                      slug: f.get("slug"),
                      ownerEmail: f.get("ownerEmail"),
                    });
                    setClinics(
                      clinicListSchema.parse(await api("/operator/clinics")),
                    );
                    setNotice(
                      "Clinic created with its owner and audit record.",
                    );
                  })
                }
              >
                <label>
                  Clinic name
                  <input name="name" minLength={2} maxLength={100} required />
                </label>
                <label>
                  Clinic URL slug
                  <input
                    name="slug"
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    minLength={2}
                    maxLength={60}
                    placeholder="sample-dental"
                    required
                  />
                </label>
                <label>
                  Existing owner's email
                  <input name="ownerEmail" type="email" required />
                </label>
                <button disabled={busy}>Create clinic</button>
              </form>
            </section>
          </div>
          <section className="card">
            <h2>Clinics</h2>
            {clinics.length === 0 ? (
              <p>
                No clinics yet. Provision an owner and create your first clinic
                above.
              </p>
            ) : (
              <ul className="clinics">
                {clinics.map((clinic) => (
                  <li key={clinic.id}>
                    <h3>{clinic.name}</h3>
                    <p>
                      {clinic.slug} · {clinic.timezone}
                    </p>
                    <form
                      onSubmit={(e) =>
                        submit(e, async (f) => {
                          const grant = supportGrantSchema.parse(
                            await api(
                              `/operator/clinics/${clinic.id}/support`,
                              "POST",
                              { reason: f.get("reason") },
                            ),
                          );
                          const [detail, events] = await Promise.all([
                            api(`/clinics/${clinic.id}`),
                            api(`/clinics/${clinic.id}/audit`),
                          ]);
                          setSupport({
                            clinic: clinicSchema.parse(detail),
                            events: auditListSchema.parse(events),
                            expiresAt: grant.expiresAt,
                          });
                          setNotice(
                            "Read-only support access started for 15 minutes. Every read is audited.",
                          );
                        })
                      }
                    >
                      <label>
                        Reason for support access
                        <input
                          name="reason"
                          minLength={10}
                          maxLength={300}
                          required
                        />
                      </label>
                      <button disabled={busy}>Start read-only support</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {support ? (
            <section className="card">
              <h2>Support: {support.clinic.name}</h2>
              <p>
                Read-only snapshot. Access expires on the server after 15
                minutes.
              </p>
              <button
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await api(
                      `/operator/clinics/${support.clinic.id}/support`,
                      "DELETE",
                    );
                    setSupport(null);
                    setNotice("Support access ended.");
                  })
                }
              >
                End support access
              </button>
              <h3>Audit history</h3>
              <ul>
                {support.events.map((event) => (
                  <li key={event.id}>
                    {event.action} ·{" "}
                    {new Date(event.createdAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
      <footer>
        Foundation release · Use synthetic data during development.
      </footer>
    </main>
  );
}
