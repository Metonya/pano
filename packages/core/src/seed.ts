import { createCore } from "./index";

const core = createCore();
try {
  for (const [key, name] of [
    ["DEMO", "Demo"],
    ["SAMPLE", "Sample project"],
  ] as const) {
    core.projects.create({ key, name, description: "Sample project" }, "seed");
    for (let i = 1; i <= 4; i++) {
      core.items.create(
        key,
        {
          title: `Sample item ${i}`,
          body_md: "Sample description",
          criteria: ["Acceptance criterion"],
        },
        "seed",
      );
    }
  }
} finally {
  core.close();
}
