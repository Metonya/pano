import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { ErrorState, LoadingState, Placeholder } from "@/components/States";
import { CreateProjectDialog } from "@/features/projects/CreateProjectDialog";
import { DeleteProjectDialog } from "@/features/projects/DeleteProjectDialog";
import { ProjectList } from "@/features/projects/ProjectList";
import { Waiting } from "@/features/waiting/Waiting";
import { Sidebar } from "@/layout/Sidebar";
import { Toolbar } from "@/layout/Toolbar";
import { type Project, queryKey, request, sorted } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useProjectEvents } from "@/lib/sse";
export function App() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [archive, setArchive] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [create, setCreate] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [actionError, setActionError] = useState(false);
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
  return (
    <div className="app">
      <Sidebar
        mobile={mobile}
        setMobile={setMobile}
        active={active}
        archived={archived}
        waiting={waiting}
        showArchive={showArchive}
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
              <Route
                path="/"
                element={
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
                }
              />
              <Route path="/waiting" element={<Waiting active={active} />} />
              <Route
                path="/projects/:key"
                element={<Placeholder text={t("boardSoon")} />}
              />
              <Route
                path="/settings"
                element={<Placeholder text={t("settingsSoon")} />}
              />
            </Routes>
          )}
        </div>
      </main>
      <CreateProjectDialog create={create} setCreate={setCreate} all={all} />
      <DeleteProjectDialog
        deleting={deleting}
        setDeleting={setDeleting}
        setActionError={setActionError}
      />
    </div>
  );
}
