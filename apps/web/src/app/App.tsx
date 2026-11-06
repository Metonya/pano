import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext, useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { LanguageContext } from "@/app/Providers";
import { ErrorState, LoadingState } from "@/components/States";
import { TokenLogin } from "@/components/TokenLogin";
import { Board } from "@/features/board/Board";
import { CreateProjectDialog } from "@/features/projects/CreateProjectDialog";
import { DeleteProjectDialog } from "@/features/projects/DeleteProjectDialog";
import { ProjectList } from "@/features/projects/ProjectList";
import { SettingsDialog } from "@/features/settings/Settings";
import { Waiting } from "@/features/waiting/Waiting";
import { Sidebar } from "@/layout/Sidebar";
import { Toolbar } from "@/layout/Toolbar";
import { type Project, queryKey, request, sorted } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useProjectEvents } from "@/lib/sse";
export function App() {
  // The context value changes with the language, so every t() below re-runs
  // without remounting the app (an open settings window stays open).
  useContext(LanguageContext);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRoute = pathname === "/settings";
  const [archive, setArchive] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [create, setCreate] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [actionError, setActionError] = useState(false);
  const [login, setLogin] = useState(false);
  useEffect(() => {
    const onUnauthorized = () => setLogin(true);
    window.addEventListener("pano:unauthorized", onUnauthorized);
    return () =>
      window.removeEventListener("pano:unauthorized", onUnauthorized);
  }, []);
  const connection = useProjectEvents();
  const projects = useQuery<Project[]>({
    queryKey,
    queryFn: () => request("/projects?includeArchived=true"),
  });
  const mutation = useMutation({
    mutationFn: ({
      project,
      action,
      value,
    }: {
      project: Project;
      action: "star" | "archive";
      value: boolean;
    }) =>
      request(`/projects/${project.key}/${action}`, {
        [action === "star" ? "starred" : "archived"]: value,
      }),
    onMutate: async ({ project, action, value }) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<Project[]>(queryKey);
      if (action === "star")
        qc.setQueryData<Project[]>(queryKey, (old) =>
          old?.map((p) =>
            p.id === project.id ? { ...p, starred: Number(value) } : p,
          ),
        );
      return { previous };
    },
    onError: (_e, _v, context) => {
      qc.setQueryData(queryKey, context?.previous);
      setActionError(true);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey });
    },
  });
  const all = sorted(projects.data ?? []);
  const active = all.filter((p) => !p.archived_at);
  const archived = all.filter((p) => p.archived_at);
  const waiting = active.reduce((sum, p) => sum + p.waiting.length, 0);
  const showArchive = (value: boolean) => {
    setArchive(value);
    navigate("/");
    setMobile(false);
  };
  const changeSettings = (open: boolean) => {
    setSettingsOpen(open);
    if (open) setMobile(false);
    else if (settingsRoute) navigate("/", { replace: true });
  };
  if (login)
    return (
      <TokenLogin
        onSuccess={() => {
          setLogin(false);
          void qc.invalidateQueries();
          window.dispatchEvent(new Event("pano:retry-connection"));
        }}
      />
    );
  const home = (
    <ProjectList
      active={active}
      archived={archived}
      archive={archive}
      act={(project, action, value) =>
        mutation.mutate({ project, action, value })
      }
      onDelete={setDeleting}
      onCreate={() => setCreate(true)}
    />
  );
  return (
    <div className="app">
      <Sidebar
        mobile={mobile}
        setMobile={setMobile}
        active={active}
        archived={archived}
        waiting={waiting}
        showArchive={showArchive}
        onStar={(project) =>
          mutation.mutate({
            project,
            action: "star",
            value: !project.starred,
          })
        }
        openSettings={() => changeSettings(true)}
      />
      <main>
        <Toolbar
          all={all}
          archive={archive}
          setMobile={setMobile}
          setCreate={setCreate}
        />
        {(!connection || actionError) && projects.data && (
          <div className="notice" role="status">
            {actionError ? t("failed") : t("offline")}{" "}
            <button
              type="button"
              onClick={() => {
                setActionError(false);
                window.dispatchEvent(new Event("pano:retry-connection"));
                void projects.refetch();
              }}
            >
              {t("retry")}
            </button>
          </div>
        )}
        <div className="content">
          {projects.isPending ? (
            <LoadingState />
          ) : projects.isError && !projects.data ? (
            <ErrorState retry={() => void projects.refetch()} />
          ) : (
            <Routes>
              <Route path="/" element={home} />
              <Route path="/waiting" element={<Waiting active={active} />} />
              <Route path="/projects/:key" element={<Board projects={all} />} />
              <Route path="/settings" element={home} />
            </Routes>
          )}
        </div>
      </main>
      <SettingsDialog
        open={settingsOpen || settingsRoute}
        onOpenChange={changeSettings}
      />
      <CreateProjectDialog create={create} setCreate={setCreate} all={all} />
      <DeleteProjectDialog
        deleting={deleting}
        setDeleting={setDeleting}
        setActionError={setActionError}
      />
    </div>
  );
}
