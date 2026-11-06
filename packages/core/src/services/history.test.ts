import { expect, test } from "bun:test";
import { createCore } from "../index";

test("cancellation requires a reason and restore recovers every previous status", () => {
  const core = createCore(":memory:");
  try {
    core.projects.create({ key: "HISTORY", name: "Geçmiş" }, "mert");
    for (const status of ["backlog", "in_progress", "test", "done"] as const) {
      const created = core.items.create("HISTORY", { title: status }, "codex");
      const key = String(created.key);
      core.items.move(key, status, "mert");
      const previous = core.items.get(key);
      expect(() =>
        core.items.move(key, "cancelled", "mert", undefined, "   "),
      ).toThrow();
      core.items.move(key, "cancelled", "mert", undefined, "Kapsam değişti");
      const cancellation = core.activity.list(key)[0];
      expect(cancellation).toMatchObject({
        kind: "cancelled",
        actor: "mert",
        message: "Kapsam değişti",
      });
      expect(JSON.parse(String(cancellation.before_json)).status).toBe(status);
      core.items.update(key, { title: "İptal sonrası düzenleme" }, "mert");
      expect(core.items.restore(key, "mert")).toMatchObject({
        status,
        done_at: previous.done_at,
      });
      expect(core.activity.list(key)[0]).toMatchObject({
        kind: "restored",
        actor: "mert",
      });
      expect(() => core.items.restore(key, "mert")).toThrow();
      core.items.move(key, "cancelled", "mert", undefined, "Tekrar");
      expect(core.items.restore(key, "mert").status).toBe(status);
    }
  } finally {
    core.db.close();
  }
});

test("205 records paginate without gaps and filters apply before pagination", () => {
  const core = createCore(":memory:");
  try {
    core.projects.create({ key: "HISTORY", name: "Geçmiş" }, "mert");
    core.items.create("HISTORY", { title: "Sayfalama" }, "codex");
    for (let index = 0; index < 205; index++)
      core.records.add(
        "HISTORY-1",
        { kind: index % 2 ? "decision" : "check", message: `Kayıt ${index}` },
        "codex",
      );
    const all = core.activity.list("HISTORY-1");
    const pages = [0, 50, 100, 150, 200].flatMap((offset) =>
      core.activity.list("HISTORY-1", { limit: 50, offset }),
    );
    expect(pages.map((entry) => entry.id)).toEqual(
      all.map((entry) => entry.id),
    );
    expect(pages[0].message).toBe("Kayıt 204");
    for (const kind of ["check", "decision"] as const) {
      expect(
        core.activity.list("HISTORY-1", { kind, limit: 50, offset: 50 }),
      ).toEqual(all.filter((entry) => entry.kind === kind).slice(50, 100));
    }
    expect(() => core.activity.list("HISTORY-1", { offset: -1 })).toThrow();
  } finally {
    core.db.close();
  }
});

test("removed and edited children keep their text in the history", () => {
  const core = createCore(":memory:");
  try {
    core.projects.create({ key: "HISTORY", name: "Geçmiş" }, "mert");
    core.items.create("HISTORY", { title: "İçerik" }, "codex");
    const key = "HISTORY-1";
    const latest = () => {
      const entry = core.activity.list(key)[0];
      return {
        kind: entry.kind,
        before: JSON.parse(String(entry.before_json)),
        after: JSON.parse(String(entry.after_json)),
      };
    };
    const scenario = core.scenarios.add(
      key,
      { steps_md: "Aç", expected_md: "Açılır", author: "codex" },
      "codex",
    );
    const id = String(scenario.id);

    core.scenarios.update(key, id, { result: "failed" }, "mert");
    expect(latest()).toEqual({
      kind: "scenario_edited",
      before: { id, steps_md: "Aç", result: "pending" },
      after: { id, steps_md: "Aç", result: "failed" },
    });

    core.scenarios.update(key, id, { expected_md: "Hızlı açılır" }, "mert");
    expect(latest()).toEqual({
      kind: "scenario_edited",
      before: { id, steps_md: "Aç", expected_md: "Açılır" },
      after: { id, steps_md: "Aç", expected_md: "Hızlı açılır" },
    });

    core.scenarios.update(key, id, { steps_md: "Kapat" }, "mert");
    expect(latest().before.steps_md).toBe("Aç");
    expect(latest().after.steps_md).toBe("Kapat");

    core.scenarios.remove(key, id, "mert");
    const removed = latest();
    expect(removed.kind).toBe("scenario_removed");
    expect(removed.before).toMatchObject({
      id,
      steps_md: "Kapat",
      expected_md: "Hızlı açılır",
      removed_at: null,
    });
    expect(removed.after.id).toBe(id);
    expect(typeof removed.after.removed_at).toBe("string");
    expect(removed.after.steps_md).toBeUndefined();

    const criterion = core.criteria.add(key, "Eski kriter", "codex");
    const criterionId = String(criterion.id);
    core.criteria.update(key, criterionId, "Yeni kriter", "mert");
    expect(latest()).toEqual({
      kind: "criterion_updated",
      before: { id: criterionId, text: "Eski kriter" },
      after: { id: criterionId, text: "Yeni kriter" },
    });
    core.criteria.remove(key, criterionId, "mert");
    expect(latest().kind).toBe("criterion_removed");
    expect(latest().before.text).toBe("Yeni kriter");
    expect(core.items.get(key).scenarios).toHaveLength(0);
    expect(core.items.get(key).criteria).toHaveLength(0);
  } finally {
    core.db.close();
  }
});
