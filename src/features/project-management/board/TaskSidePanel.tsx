import { useEffect, useMemo, useState } from "react";
import { Button, Input } from "antd";
import { LucideIcon } from "@/components/common/lucide-icon";
import {
  addTaskUpdate,
  listTaskActivity,
  listTaskFiles,
  listTaskUpdates,
  taskFileUrl,
  uploadTaskFile,
  type PmTaskFile,
  type PmTaskUpdate,
  type TaskActivity,
} from "@/features/project-management/board/boardService";
import { OwnerAvatar, personName, relativeUpdated } from "@/features/project-management/board/boardUi";
import type { PmBoardTask } from "@/features/project-management/board/boardRules";
import type { Profile } from "@/types";

type PanelTab = "updates" | "files" | "activity";

export function TaskSidePanel({
  task,
  profiles,
  canEdit,
  userEmail,
  onClose,
  onPrevious,
  onNext,
}: {
  task: PmBoardTask;
  profiles: Profile[];
  canEdit: boolean;
  userEmail: string;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const [tab, setTab] = useState<PanelTab>("updates");
  const [updates, setUpdates] = useState<PmTaskUpdate[]>([]);
  const [files, setFiles] = useState<PmTaskFile[]>([]);
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [fileQuery, setFileQuery] = useState("");
  const [fileLayout, setFileLayout] = useState<"grid" | "list">("grid");
  const [activityKind, setActivityKind] = useState<"other" | "automation">("other");
  const [activityQuery, setActivityQuery] = useState("");
  const [person, setPerson] = useState("all");
  const mention = mentionQuery(draft);
  const people = profiles.filter((profile) => personName(profiles, profile.id).toLowerCase().includes(mention.toLowerCase()));

  const reload = async () => {
    const [nextUpdates, nextFiles, nextActivity] = await Promise.all([
      listTaskUpdates(task.id),
      listTaskFiles(task.id),
      listTaskActivity(task.id),
    ]);
    setUpdates(nextUpdates);
    setFiles(nextFiles);
    setActivity(nextActivity);
  };

  useEffect(() => {
    let cancel = false;
    setError("");
    void reload().catch((err: unknown) => {
      if (!cancel) setError(err instanceof Error ? err.message : "Could not open this task.");
    });
    return () => {
      cancel = true;
    };
  }, [task.id]);

  const shownFiles = files.filter((file) => file.fileName.toLowerCase().includes(fileQuery.trim().toLowerCase()));
  const shownActivity = useMemo(() => activity.filter((entry) => {
    if (activityKind === "automation") return false;
    if (person !== "all" && entry.userEmail !== person) return false;
    return `${entry.remarks} ${entry.action} ${entry.userEmail}`.toLowerCase().includes(activityQuery.trim().toLowerCase());
  }), [activity, activityKind, activityQuery, person]);

  const post = async () => {
    await addTaskUpdate(task, draft, userEmail);
    setDraft("");
    await reload();
  };

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    for (const file of list) await uploadTaskFile(task, file, userEmail);
    await reload();
  };

  return (
    <aside className="pmb-side" aria-label="Task updates">
      <header>
        <h2>{task.title}</h2>
        <div>
          <button type="button" aria-label="Previous task" disabled={!onPrevious} onClick={onPrevious}>‹</button>
          <button type="button" aria-label="Next task" disabled={!onNext} onClick={onNext}>›</button>
          <button type="button" aria-label="Close" onClick={onClose}>×</button>
        </div>
      </header>
      <p className="pmb-side-person">
        <OwnerAvatar name={personName(profiles, task.ownerId)} />
        {personName(profiles, task.ownerId)}
      </p>
      <div className="pmb-side-tabs" role="tablist">
        {(["updates", "files", "activity"] as const).map((item) => (
          <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>
            {item === "updates" ? "Updates" : item === "files" ? "Files" : "Activity Log"}
          </button>
        ))}
      </div>
      {error ? <p className="pmb-dep-error">{error}</p> : null}
      {tab === "updates" ? (
        <div className="pmb-side-body">
          <label className="pmb-composer">
            Write an update
            <textarea
              aria-label="Write an update and mention others with @"
              placeholder="Write an update and mention others with @"
              value={draft}
              disabled={!canEdit}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          {mention && canEdit ? (
            <div className="pmb-mentions">
              {people.slice(0, 6).map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setDraft((current) => current.replace(/@[\w .'-]*$/, `@${personName(profiles, profile.id)} `))}
                >
                  {personName(profiles, profile.id)}
                </button>
              ))}
            </div>
          ) : null}
          <Button type="primary" disabled={!canEdit || !draft.trim()} onClick={() => void post().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not post the update."))}>
            Update
          </Button>
          {updates.length === 0 ? (
            <div className="pmb-empty-note">
              <strong>No updates yet</strong>
              <p>Share progress, mention a teammate, or upload a file.</p>
            </div>
          ) : updates.map((update) => (
            <article key={update.id} className="pmb-update">
              <OwnerAvatar name={personName(profiles, update.authorId)} />
              <div>
                <strong>{personName(profiles, update.authorId)}</strong>
                <time>{relativeUpdated(update.createdAt)}</time>
                <p>{update.body}</p>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {tab === "files" ? (
        <div className="pmb-side-body">
          <div className="pmb-file-tools">
            <label className="pmb-add-file">
              + Add file
              <input type="file" multiple disabled={!canEdit} onChange={(event) => void addFiles(event.target.files).catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not add the file."))} />
            </label>
            <Input allowClear prefix={<LucideIcon name="search" size={14} />} placeholder="Search for files" aria-label="Search for files" value={fileQuery} onChange={(event) => setFileQuery(event.target.value)} />
            <button type="button" aria-label="Grid" className={fileLayout === "grid" ? "is-active" : ""} onClick={() => setFileLayout("grid")}><LucideIcon name="layout-grid" size={14} /></button>
            <button type="button" aria-label="List" className={fileLayout === "list" ? "is-active" : ""} onClick={() => setFileLayout("list")}><LucideIcon name="columns" size={14} /></button>
          </div>
          {shownFiles.length === 0 ? (
            <label
              className="pmb-drop"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (canEdit) void addFiles(event.dataTransfer.files).catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not add the file."));
              }}
            >
              Drag & drop or add files here
              <span className="pmb-add-file">+ Add file</span>
              <input type="file" multiple disabled={!canEdit} onChange={(event) => void addFiles(event.target.files)} />
            </label>
          ) : (
            <div className={fileLayout === "grid" ? "pmb-file-grid" : "pmb-file-list"}>
              {shownFiles.map((file) => (
                <button key={file.id} type="button" onClick={() => void taskFileUrl(file.storagePath).then((url) => window.open(url, "_blank", "noopener"))}>
                  <LucideIcon name="download" size={14} />
                  {file.fileName}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
      {tab === "activity" ? (
        <div className="pmb-side-body">
          <div className="pmb-side-tabs">
            <button type="button" className={activityKind === "other" ? "is-active" : ""} onClick={() => setActivityKind("other")}>Other activities</button>
            <button type="button" className={activityKind === "automation" ? "is-active" : ""} onClick={() => setActivityKind("automation")}>Automation activity</button>
          </div>
          <div className="pmb-file-tools">
            <Input allowClear placeholder="Filter log" aria-label="Filter log" value={activityQuery} onChange={(event) => setActivityQuery(event.target.value)} />
            <select aria-label="Person" value={person} onChange={(event) => setPerson(event.target.value)}>
              <option value="all">Person</option>
              {[...new Set(activity.map((entry) => entry.userEmail).filter(Boolean))].map((email) => (
                <option key={email} value={email}>{email}</option>
              ))}
            </select>
            <button type="button" aria-label="Refresh activity" onClick={() => void reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not refresh."))}>Refresh</button>
            <button
              type="button"
              aria-label="Export activity"
              onClick={() => {
                const lines = ["when,who,action,remarks", ...shownActivity.map((entry) => (
                  [entry.timestamp, entry.userEmail, entry.action, entry.remarks].map((value) => `"${value.replaceAll("\"", "\"\"")}"`).join(",")
                ))];
                const blob = new Blob([lines.join("\n")], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `${task.title}-activity.csv`;
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export
            </button>
          </div>
          {activityKind === "automation" ? <p className="pmb-empty-note">No automation has changed this task.</p> : null}
          {activityKind === "other" && shownActivity.length === 0 ? <p className="pmb-empty-note">No activity yet.</p> : null}
          {activityKind === "other" ? shownActivity.map((entry) => (
            <article key={entry.id} className="pmb-update">
              <OwnerAvatar name={entry.userEmail} />
              <div>
                <strong>{entry.remarks || entry.action}</strong>
                <time>{relativeUpdated(entry.timestamp)}</time>
              </div>
            </article>
          )) : null}
        </div>
      ) : null}
    </aside>
  );
}

function mentionQuery(value: string) {
  const match = value.match(/@([\w .'-]*)$/);
  return match ? match[1] : "";
}
