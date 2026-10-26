import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Code2,
  Cpu,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  LayoutDashboard,
  LoaderCircle,
  PanelLeftClose,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Upload,
  WifiOff,
  X,
} from "lucide-react";
import {
  api,
  get,
  message,
  type Analysis,
  type Health,
  type Ollama,
  type Project,
  type Result,
  type Run,
} from "./api";

export function useData<T>(url: string, interval = 0) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    setData(undefined);
    setLoading(true);
    setError("");
    const load = async () => {
      try {
        const value = await get<T>(url);
        if (live) {
          setData(value);
          setError("");
        }
      } catch (e) {
        if (live) setError(message(e));
      } finally {
        if (live) {
          setLoading(false);
          if (interval) timer = setTimeout(load, interval);
        }
      }
    };
    void load();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [url, interval, revision]);
  return {
    data,
    error,
    loading,
    reload: useCallback(() => setRevision((v) => v + 1), []),
  };
}
const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
const actionList = [
  {
    key: "analyze",
    title: "Analyze project",
    description: "Understand the code, from the inside out.",
    Icon: Search,
  },
  {
    key: "code-review",
    title: "Review code",
    description: "Find potential issues before they ship.",
    Icon: ShieldCheck,
  },
  {
    key: "readme",
    title: "Generate README",
    description: "Turn your project into a clear first impression.",
    Icon: FileText,
  },
  {
    key: "architecture",
    title: "Map architecture",
    description: "Connect the pieces of your codebase.",
    Icon: GitBranch,
  },
  {
    key: "documentation",
    title: "Write documentation",
    description: "Document what your source actually does.",
    Icon: BookOpen,
  },
  {
    key: "improvements",
    title: "Suggest improvements",
    description: "Find focused, evidence-backed next steps.",
    Icon: Sparkles,
  },
];
export function ErrorNotice({
  error,
  retry,
}: {
  error: string;
  retry?: () => void;
}) {
  return error ? (
    <div className="notice error" role="alert">
      <span>{error}</span>
      {retry && <button onClick={retry}>Retry</button>}
    </div>
  ) : null;
}
function Loading() {
  return (
    <div className="loading">
      <LoaderCircle className="spin" size={18} /> Loading local data…
    </div>
  );
}
function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
function StatusDot({ ready }: { ready?: boolean }) {
  return <span className={`status-dot ${ready ? "ready" : "waiting"}`} />;
}

export function App() {
  const health = useData<Health>("/health", 10000);
  const ollama = useData<Ollama>("/ollama/status", 15000);
  const [menu, setMenu] = useState(false);
  const ready = health.data?.database && ollama.data?.modelReady;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Link className="brand" to="/">
          <span className="brand-mark">
            <Terminal size={22} />
          </span>
          <span>
            devpilot<span className="brand-ai">AI</span>
          </span>
        </Link>
        <div className="workspace-label">
          <span className="workspace-icon">L</span>
          <div>
            Local workspace<small>Personal environment</small>
          </div>
          <ChevronRight size={14} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav onClick={() => setMenu(false)}>
          <NavLink end to="/">
            <LayoutDashboard size={18} /> Overview
          </NavLink>
          <NavLink to="/projects">
            <FolderOpen size={18} /> Projects
          </NavLink>
          <NavLink to="/activity">
            <Activity size={18} /> Analysis history
          </NavLink>
          <NavLink to="/system">
            <Settings2 size={18} /> System status
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <span className="tiny-icon">
            <WifiOff size={16} />
          </span>
          <strong>Your code stays yours.</strong>
          <p>
            Local inference. No cloud AI.
            <br />
            Built for your own machine.
          </p>
          <span className="local-tag">
            <span /> OFFLINE FIRST
          </span>
        </div>
        <div className="sidebar-bottom">
          <div className="avatar">DP</div>
          <div>
            Developer workspace<small>DevPilot v0.1.0</small>
          </div>
          <ShieldCheck size={17} />
        </div>
      </aside>
      {menu && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-button menu-button"
              aria-label="Toggle navigation"
              onClick={() => setMenu(!menu)}
            >
              <PanelLeftClose size={19} />
            </button>
            <span className="breadcrumb">
              Workspace <ChevronRight size={13} /> <span>DevPilot AI</span>
            </span>
          </div>
          <div className="topbar-right">
            <span className="runtime-status">
              <StatusDot ready={ready} />
              {ready ? "Local runtime ready" : "Runtime needs setup"}
            </span>
            <span className="keycap">LOCAL</span>
          </div>
        </header>
        <main className="page">
          <Routes>
            <Route
              path="/"
              element={<Dashboard health={health.data} ollama={ollama.data} />}
            />
            <Route path="/projects" element={<Projects />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/projects/:id" element={<ProjectPage />} />
            <Route path="/runs/:id" element={<RunPage />} />
            <Route path="/activity" element={<History />} />
            <Route
              path="/system"
              element={
                <System
                  health={health.data}
                  ollama={ollama.data}
                  error={health.error || ollama.error}
                />
              }
            />
            <Route
              path="*"
              element={
                <div className="empty">
                  <h2>Page not found</h2>
                  <Link to="/">Return to overview</Link>
                </div>
              }
            />
          </Routes>
          <footer className="page-footer">
            <span>
              <ShieldCheck size={13} /> Private by design. Powered locally.
            </span>
            <span>
              DEVPILOT AI <span className="footer-dot">·</span> LOCAL
              DEVELOPMENT ASSISTANT
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function Dashboard({ health, ollama }: { health?: Health; ollama?: Ollama }) {
  const projects = useData<Project[]>("/projects");
  const analyses = useData<Analysis[]>("/analyses");
  return (
    <>
      <PageTitle
        eyebrow="YOUR DEVELOPMENT COMPANION"
        title="A little clarity. A lot of possibility."
        description="Understand your projects, improve your code, and keep it all local."
      >
        <Link className="button primary" to="/upload">
          <Plus size={17} /> Import project
        </Link>
      </PageTitle>
      <section className="hero">
        <div className="hero-copy">
          <span className="pill">
            <Sparkles size={13} /> INTELLIGENCE, ON YOUR TERMS
          </span>
          <h2>
            Your codebase.
            <br />A fresh perspective.
          </h2>
          <p>
            Give your project a second pair of eyes. DevPilot plans,
            <br className="desktop-break" /> inspects, and connects the dots —
            right on your machine.
          </p>
          <Link className="button hero-button" to="/upload">
            Explore a project <ArrowRight size={16} />
          </Link>
          <div className="hero-assurances">
            <span>
              <Check size={12} /> No cloud AI
            </span>
            <span>
              <Check size={12} /> Evidence-backed insights
            </span>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <span className="floating-symbol symbol-a">
            <FileCode2 size={23} />
          </span>
          <span className="floating-symbol symbol-b">
            <GitBranch size={22} />
          </span>
          <span className="floating-symbol symbol-c">
            <ShieldCheck size={22} />
          </span>
          <div className="core">
            <Terminal size={49} />
          </div>
          <div className="visual-caption">
            <span /> LOCAL REASONING ENGINE
          </div>
        </div>
      </section>
      <div className="stats-grid">
        <Stat
          icon={<Folder size={19} />}
          value={projects.data ? String(projects.data.length) : "—"}
          label="Imported projects"
          detail="Your local codebases"
        />
        <Stat
          icon={<CheckCircle2 size={19} />}
          value={analyses.data ? String(analyses.data.length) : "—"}
          label="Recent analyses"
          detail="Evidence, not guesswork"
        />
        <Stat
          icon={<Cpu size={19} />}
          value={ollama?.modelReady ? "Ready" : "Not ready"}
          label="Local AI engine"
          detail={ollama?.model || "llama3.2:1b"}
        />
        <Stat
          icon={<ShieldCheck size={19} />}
          value="Local"
          label="Inference boundary"
          detail="No external AI providers"
        />
      </div>
      <div className="section-heading">
        <h2>What would you like to do?</h2>
        <span>START WITH A PROJECT</span>
      </div>
      <div className="action-grid">
        {actionList.slice(0, 4).map(({ key, title, description, Icon }) => (
          <Link
            key={key}
            to={`/projects?action=${key}`}
            className="action-card"
          >
            <div className={`action-icon ${key}`}>
              <Icon size={20} />
            </div>
            <ArrowUpRight size={15} className="action-arrow" />
            <h3>{title}</h3>
            <p>{description}</p>
          </Link>
        ))}
      </div>
      <div className="dashboard-bottom">
        <section className="panel">
          <div className="panel-heading">
            <h2>
              Recent projects{" "}
              <span className="count">{projects.data?.length || 0}</span>
            </h2>
            <Link to="/projects">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <ErrorNotice error={projects.error} retry={projects.reload} />
          {projects.loading ? (
            <Loading />
          ) : projects.data?.length ? (
            <ProjectList projects={projects.data.slice(0, 4)} />
          ) : (
            !projects.error && <EmptyProjects />
          )}
        </section>
        <section className="panel runtime-panel">
          <div className="panel-heading">
            <h2>
              <Cpu size={17} /> Your local engine
            </h2>
            <span className="subtle-badge">OLLAMA</span>
          </div>
          <div className="model-row">
            <span className="model-icon">
              <Box size={24} />
            </span>
            <div>
              <strong>{ollama?.model || "llama3.2:1b"}</strong>
              <small>On-device language model</small>
            </div>
          </div>
          <div className="service-row">
            <span>Model availability</span>
            <span>
              <StatusDot ready={ollama?.modelReady} />
              {ollama?.modelReady ? "Installed" : "Not available"}
            </span>
          </div>
          <div className="service-row">
            <span>Project database</span>
            <span>
              <StatusDot ready={health?.database} />
              {health?.database ? "Connected" : "Not connected"}
            </span>
          </div>
          <Link className="runtime-link" to="/system">
            View setup & system status <ArrowUpRight size={14} />
          </Link>
        </section>
      </div>
    </>
  );
}
function Stat({
  icon,
  value,
  label,
  detail,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  detail: string;
}) {
  return (
    <div className="stat">
      <div className="stat-top">
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
function EmptyProjects() {
  return (
    <div className="empty">
      <span className="empty-icon">
        <FolderOpen size={25} />
      </span>
      <h3>A new home for your code</h3>
      <p>Import your first ZIP project to start exploring.</p>
      <Link className="text-link" to="/upload">
        Import a project <ArrowRight size={14} />
      </Link>
    </div>
  );
}
function ProjectList({ projects }: { projects: Project[] }) {
  return (
    <div className="project-list">
      {projects.map((project) => (
        <Link
          to={`/projects/${project._id}`}
          key={project._id}
          className="project-row"
        >
          <span className="project-icon">
            <Folder size={19} />
          </span>
          <div className="project-info">
            <strong>{project.name}</strong>
            <small>
              {project.fileCount} files <span>·</span>{" "}
              {project.languages.slice(0, 3).join(", ")}
            </small>
          </div>
          <span className="project-date">{formatDate(project.createdAt)}</span>
          <ChevronRight size={16} />
        </Link>
      ))}
    </div>
  );
}
function Projects() {
  const { data, error, loading, reload } = useData<Project[]>("/projects");
  const [query, setQuery] = useState("");
  const filtered =
    data?.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())) ||
    [];
  return (
    <>
      <PageTitle
        eyebrow="LOCAL WORKSPACE"
        title="Your projects"
        description="A closer look at the code you’re building."
      >
        <Link className="button primary" to="/upload">
          <Plus size={16} /> Import project
        </Link>
      </PageTitle>
      <div className="search-field">
        <Search size={17} />
        <input
          aria-label="Search projects"
          placeholder="Find a project…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <ErrorNotice error={error} retry={reload} />
      <section className="panel">
        {loading ? (
          <Loading />
        ) : !data?.length && !error ? (
          <EmptyProjects />
        ) : filtered.length ? (
          <ProjectList projects={filtered} />
        ) : (
          <div className="empty">No matching projects.</div>
        )}
      </section>
    </>
  );
}
export function UploadPage() {
  const [name, setName] = useState(""),
    [file, setFile] = useState<File>(),
    [progress, setProgress] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [dragging, setDragging] = useState(false);
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const select = (value?: File) => {
    setError("");
    if (!value) return;
    if (!value.name.toLowerCase().endsWith(".zip")) {
      setError("Choose a ZIP archive.");
      return;
    }
    if (value.size > 10485760) {
      setError("Choose a ZIP smaller than 10 MiB.");
      return;
    }
    setFile(value);
    if (!name) setName(value.name.replace(/\.zip$/i, ""));
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError("");
    const form = new FormData();
    form.append("name", name);
    form.append("file", file);
    try {
      const response = await api.post("/projects/upload", form, {
        timeout: 120000,
        onUploadProgress: (event) =>
          setProgress(
            Math.round((event.loaded / (event.total || file.size)) * 100),
          ),
      });
      navigate(`/projects/${response.data.data._id}`);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="BRING YOUR CODE"
        title="One project. A new perspective."
        description="Import a source ZIP to build a private, local workspace."
      />
      <div className="upload-layout">
        <form className="panel upload-form" onSubmit={submit}>
          <h2>Import a project</h2>
          <label htmlFor="project-name">Project name</label>
          <input
            id="project-name"
            maxLength={100}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. my-next-great-idea"
            disabled={busy}
          />
          <label>Project archive</label>
          <input
            ref={input}
            aria-label="Project ZIP"
            type="file"
            accept=".zip"
            hidden
            disabled={busy}
            onChange={(e) => select(e.target.files?.[0])}
          />
          <button
            type="button"
            className={`dropzone ${dragging ? "dragging" : ""}`}
            disabled={busy}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!busy) select(e.dataTransfer.files[0]);
            }}
          >
            <span className="upload-icon">
              <Upload size={27} />
            </span>
            <strong>{file ? file.name : "Drop your project here"}</strong>
            <span>
              {file
                ? `${(file.size / 1024).toFixed(0)} KB · Click to change`
                : "or click to choose a ZIP archive"}
            </span>
            <small>ZIP ONLY · UP TO 10 MiB</small>
          </button>
          <ErrorNotice error={error} />
          {busy && (
            <div className="upload-progress" role="status">
              <progress max={100} value={progress} />
              <span>
                {progress < 100
                  ? `Uploading ${progress}%`
                  : "Validating and indexing your source…"}
              </span>
            </div>
          )}
          <button
            className="button primary full"
            disabled={!file || !name.trim() || busy}
          >
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Plus size={16} />
            )}{" "}
            {busy ? "Importing project" : "Create local workspace"}
          </button>
        </form>
        <aside className="upload-explainer">
          <span className="eyebrow">WHAT HAPPENS NEXT</span>
          {[
            [
              "01",
              "A safe place to land",
              "Your ZIP is validated and extracted into an isolated local workspace.",
            ],
            [
              "02",
              "Meet your codebase",
              "DevPilot indexes supported source files and identifies languages and framework hints.",
            ],
            [
              "03",
              "Choose a direction",
              "Explore the source, review code, or let the agent map the architecture.",
            ],
          ].map(([number, title, text]) => (
            <div className="explain-step" key={number}>
              <span>{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
          <div className="privacy-note">
            <ShieldCheck size={19} />
            <p>
              Source stays on this machine. Imported code is never executed.
              Secret files and dependency folders are excluded.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

function ProjectPage() {
  const { id } = useParams();
  const project = useData<Project>(`/projects/${id}`);
  const navigate = useNavigate();
  const [selected, setSelected] = useState(""),
    [source, setSource] = useState(""),
    [sourceError, setSourceError] = useState(""),
    [sourceBusy, setSourceBusy] = useState(false),
    [request, setRequest] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setSource("");
    setSourceError("");
    setSourceBusy(true);
    api
      .get(`/projects/${id}/file`, {
        params: { path: selected },
        signal: controller.signal,
      })
      .then((res) => setSource(res.data.data.content))
      .catch((e) => {
        if (!controller.signal.aborted) setSourceError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setSourceBusy(false);
      });
    return () => controller.abort();
  }, [selected, id]);
  async function run(action?: string) {
    setBusy(true);
    setError("");
    try {
      const response = action
        ? await api.post(`/projects/${id}/${action}`)
        : await api.post("/agent/run", { projectId: id, userRequest: request });
      navigate(`/runs/${response.data.data._id}`);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/projects/${id}`);
      navigate("/projects");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  if (project.loading) return <Loading />;
  if (!project.data)
    return <ErrorNotice error={project.error} retry={project.reload} />;
  const p = project.data;
  return (
    <>
      <PageTitle
        eyebrow="PROJECT WORKSPACE"
        title={p.name}
        description={`${p.fileCount} files · ${p.languages.join(", ")} · Indexed in ${p.indexMs} ms`}
      >
        <button
          className="button secondary"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 size={15} /> Delete project
        </button>
      </PageTitle>
      {confirmDelete && (
        <div className="notice error">
          <span>
            Delete this project, its imported files and analysis history?
          </span>
          <button disabled={busy} onClick={remove}>
            Delete permanently
          </button>
          <button onClick={() => setConfirmDelete(false)}>Keep project</button>
        </div>
      )}
      <ErrorNotice error={error || project.error} />
      {p.skippedCount > 0 && (
        <div className="notice">
          {p.skippedCount} unsupported or excluded entries were skipped during
          import.
        </div>
      )}
      <div className="explorer-layout">
        <section className="panel file-tree">
          <div className="panel-heading">
            <h2>
              <FolderOpen size={16} /> Source explorer
            </h2>
            <span className="count">{p.fileCount}</span>
          </div>
          <div className="file-list">
            {p.files?.map((f) => (
              <button
                key={f.path}
                className={selected === f.path ? "selected" : ""}
                onClick={() => setSelected(f.path)}
                title={f.path}
              >
                <FileCode2 size={14} />
                <span>{f.path}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="panel source-panel">
          <div className="panel-heading">
            <h2>
              <Code2 size={16} />
              {selected || "Project source"}
            </h2>
            <span className="subtle-badge">READ ONLY</span>
          </div>
          <ErrorNotice error={sourceError} />
          {sourceBusy ? (
            <Loading />
          ) : selected ? (
            <pre className="source">
              <code>
                {source.split("\n").map((line, i) => (
                  <span className="code-line" key={i}>
                    <span className="line-number">{i + 1}</span>
                    {line || " "}
                  </span>
                ))}
              </code>
            </pre>
          ) : (
            <div className="empty source-empty">
              <FileCode2 size={34} />
              <h3>Get familiar with the details</h3>
              <p>Select a file to inspect its source.</p>
            </div>
          )}
        </section>
      </div>
      <div className="section-heading">
        <h2>Put your local agent to work</h2>
        <span>PLAN → INSPECT → EVALUATE</span>
      </div>
      <div className="action-grid six">
        {actionList.map(({ key, title, description, Icon }) => (
          <button
            className="action-card"
            key={key}
            disabled={busy}
            onClick={() => run(key)}
          >
            <div className="action-icon">
              <Icon size={20} />
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
          </button>
        ))}
      </div>
      <form
        className="custom-task panel"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <label htmlFor="task">
          <Sparkles size={18} /> Or ask something specific
        </label>
        <textarea
          id="task"
          minLength={5}
          maxLength={2000}
          required
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="Inspect the API layer and suggest improvements to error handling…"
        />
        <button
          className="button primary"
          disabled={busy || request.trim().length < 5}
        >
          {busy ? (
            <LoaderCircle size={15} className="spin" />
          ) : (
            <ArrowRight size={16} />
          )}{" "}
          Start agent
        </button>
      </form>
    </>
  );
}

function RunPage() {
  const { id } = useParams();
  const run = useData<Run>(`/agent/runs/${id}`, 2000);
  const [error, setError] = useState("");
  const done = ["completed", "failed", "cancelled"].includes(
    run.data?.status || "",
  );
  async function cancel() {
    try {
      await api.post(`/agent/runs/${id}/cancel`);
      run.reload();
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="AGENT CONSOLE"
        title={
          run.data?.status === "completed"
            ? "A clearer picture of your project."
            : "Following the evidence."
        }
        description="A transparent view of tool execution. Your source stays local."
      >
        {!done && (
          <button className="button secondary" onClick={cancel}>
            <X size={15} /> Cancel run
          </button>
        )}
      </PageTitle>
      <ErrorNotice error={error || run.error} retry={run.reload} />
      {run.loading && <Loading />}
      {run.data && (
        <>
          <section className="panel run-panel">
            <div className="panel-heading">
              <h2>
                <Terminal size={17} /> Execution log
              </h2>
              <span className={`run-status ${run.data.status}`}>
                {!done && <LoaderCircle size={13} className="spin" />}
                {run.data.status}
              </span>
            </div>
            <p className="task-request">{run.data.userRequest}</p>
            <div className="execution-steps">
              {run.data.executionSteps.map((event, i) => (
                <div className={`execution-step ${event.stage}`} key={i}>
                  <span className="event-marker">
                    {event.stage === "completed" ? (
                      <Check size={13} />
                    ) : (
                      <Circle size={8} />
                    )}
                  </span>
                  <span className="event-time">
                    {new Date(event.at).toLocaleTimeString()}
                  </span>
                  <div>
                    <strong>{event.tool || event.stage}</strong>
                    <p>{event.message}</p>
                  </div>
                </div>
              ))}
              {!done && (
                <div className="waiting-model">
                  <LoaderCircle size={14} className="spin" /> Waiting for the
                  local runtime… small models may take time.
                </div>
              )}
            </div>
            {run.data.error && (
              <div className="notice error" role="alert">
                {run.data.error}
              </div>
            )}
          </section>
          {run.data.result && <Results result={run.data.result} />}
          <Link
            className="text-link back-link"
            to={`/projects/${run.data.projectId}`}
          >
            Back to project <ArrowRight size={14} />
          </Link>
        </>
      )}
    </>
  );
}
export function Results({ result }: { result: Result }) {
  const [severity, setSeverity] = useState("all");
  const findings = result.findings.filter(
    (f) => severity === "all" || f.severity === severity,
  );
  const download = () => {
    const blob = new Blob([result.markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "devpilot-documentation.md";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="results">
      <section className="panel result-summary">
        <div className="panel-heading">
          <h2>
            <Sparkles size={18} /> Analysis summary
          </h2>
          <span className="subtle-badge">LOCAL INFERENCE</span>
        </div>
        <p>{result.summary}</p>
        <div className="coverage">
          <span>
            {result.metadata.inspectedFiles.length} /{" "}
            {result.metadata.totalFiles} files inspected
          </span>
          <span>{(result.metadata.durationMs / 1000).toFixed(1)}s total</span>
          <span>{(result.metadata.modelMs / 1000).toFixed(1)}s model time</span>
          <span>
            {Math.round(result.metadata.rssBytes / 1048576)} MiB API memory
          </span>
        </div>
        <small>{result.metadata.note}</small>
        {result.metadata.contextTruncated && (
          <div className="notice">
            Some tool observations were truncated to fit the model context.
          </div>
        )}
        {result.metadata.toolErrors.map((e, i) => (
          <div className="notice error" key={i}>
            {e.tool}: {e.message}
          </div>
        ))}
      </section>
      <section className="panel findings">
        <div className="panel-heading">
          <h2>
            Findings <span className="count">{result.findings.length}</span>
          </h2>
          <select
            aria-label="Filter severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            <option value="all">All severities</option>
            {["critical", "high", "medium", "low", "info"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {findings.length ? (
          findings.map((finding, i) => (
            <article className="finding" key={i}>
              <div className="finding-title">
                <span className={`severity ${finding.severity}`}>
                  {finding.severity}
                </span>
                <h3>{finding.title}</h3>
                <span className="confidence">
                  {finding.confidence} confidence
                </span>
              </div>
              <code>
                {finding.file}
                {finding.line ? `:${finding.line}` : ""}
              </code>
              <p>{finding.description}</p>
              <div className="recommendation">
                <ArrowRight size={14} />
                {finding.recommendation}
              </div>
            </article>
          ))
        ) : (
          <div className="empty">
            <ShieldCheck size={26} />
            <h3>No matching findings</h3>
            <p>This does not establish that the project is free of issues.</p>
          </div>
        )}
      </section>
      {result.architecture && (
        <section className="panel architecture">
          <div className="panel-heading">
            <h2>
              <GitBranch size={18} /> Architecture
            </h2>
          </div>
          <div className="architecture-nodes">
            {result.architecture.components.map((c, i) => (
              <article key={i}>
                <Box size={19} />
                <h3>{c.name}</h3>
                <p>{c.description}</p>
                <small>{c.files.join(", ")}</small>
              </article>
            ))}
          </div>
          {result.architecture.limitations?.map((limit, i) => (
            <div className="notice" key={i}>
              {limit}
            </div>
          ))}
          <div className="connections">
            {result.architecture.connections.map((c, i) => (
              <p key={i}>
                <strong>{c.from}</strong>
                <ArrowRight size={14} />
                <strong>{c.to}</strong>
                <span>{c.description}</span>
              </p>
            ))}
          </div>
          <ol>
            {result.architecture.dataFlow.map((flow, i) => (
              <li key={i}>{flow}</li>
            ))}
          </ol>
          <div className="tech-tags">
            {result.architecture.technologies.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </section>
      )}
      {result.markdown && (
        <section className="panel markdown-result">
          <div className="panel-heading">
            <h2>
              <FileText size={18} /> Generated document
            </h2>
            <button className="button secondary" onClick={download}>
              <ArrowDownToLine size={15} /> Download Markdown
            </button>
          </div>
          <pre>{result.markdown}</pre>
        </section>
      )}
    </div>
  );
}
function History() {
  const analyses = useData<Analysis[]>("/analyses");
  return (
    <>
      <PageTitle
        eyebrow="WORKSPACE ACTIVITY"
        title="A trail of useful discoveries."
        description="Revisit the analyses completed on this machine."
      />
      <ErrorNotice error={analyses.error} retry={analyses.reload} />
      <section className="panel">
        {analyses.loading ? (
          <Loading />
        ) : analyses.data?.length ? (
          analyses.data.map((a) => (
            <Link className="history-row" to={`/runs/${a.runId}`} key={a._id}>
              <span className="project-icon">
                <Activity size={18} />
              </span>
              <div>
                <strong>{a.type.replaceAll("-", " ")}</strong>
                <p>{a.summary.slice(0, 180)}</p>
              </div>
              <small>{formatDate(a.createdAt)}</small>
              <ArrowUpRight size={16} />
            </Link>
          ))
        ) : (
          !analyses.error && (
            <div className="empty">
              <Activity size={30} />
              <h3>Your discoveries will live here</h3>
              <p>Open a project and start your first analysis.</p>
              <Link className="text-link" to="/projects">
                Explore projects <ArrowRight size={14} />
              </Link>
            </div>
          )
        )}
      </section>
    </>
  );
}
function System({
  health,
  ollama,
  error,
}: {
  health?: Health;
  ollama?: Ollama;
  error: string;
}) {
  return (
    <>
      <PageTitle
        eyebrow="ON YOUR MACHINE"
        title="Local runtime, real status."
        description="Everything DevPilot needs to work without a cloud AI service."
      />
      <ErrorNotice error={error} />
      <div className="system-grid">
        {[
          [
            "Express API",
            Boolean(health),
            health
              ? `Running · ${Math.round(health.rssBytes / 1048576)} MiB RSS`
              : "Start the backend with npm run dev",
          ],
          [
            "MongoDB",
            health?.database,
            "Local project metadata and analysis history",
          ],
          ["Ollama daemon", ollama?.connected, "Local language model runtime"],
          [
            ollama?.model || "llama3.2:1b",
            ollama?.modelReady,
            "The exact configured model must be installed",
          ],
        ].map(([title, ready, description]) => (
          <section className="panel system-card" key={String(title)}>
            <div>
              <Cpu size={21} />
              <StatusDot ready={Boolean(ready)} />
            </div>
            <h2>{title}</h2>
            <p>{description}</p>
            <span className={`status-label ${ready ? "good" : ""}`}>
              {ready ? "Available" : "Not ready"}
            </span>
          </section>
        ))}
      </div>
      <section className="panel setup-guide">
        <h2>Prepare your local environment</h2>
        <p>
          Install dependencies and download the model once while online. Then
          keep MongoDB and Ollama running locally.
        </p>
        <ol>
          <li>Install MongoDB and Ollama for your operating system.</li>
          <li>
            Copy <code>backend/.env.example</code> to <code>backend/.env</code>.
          </li>
          <li>
            Start MongoDB, then install the model:
            <pre>ollama pull llama3.2:1b</pre>
          </li>
          <li>
            From the DevPilot folder, start both application servers:
            <pre>npm run dev</pre>
          </li>
          <li>
            Confirm all four services above are available, then import a small
            source project.
          </li>
        </ol>
        <div className="notice">
          DevPilot is a trusted single-user local app. Keep the default loopback
          address; remote access and multi-user authentication are outside this
          MVP.
        </div>
        {health?.activeRun && (
          <Link className="text-link" to={`/runs/${health.activeRun}`}>
            View active analysis <ArrowRight size={14} />
          </Link>
        )}
      </section>
    </>
  );
}
