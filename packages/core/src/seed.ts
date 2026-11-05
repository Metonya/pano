import { createCore } from "./index";

const core = createCore();
try {
  for (const [key, name] of [
    ["DEMO", "Demo"],
    ["SAMPLE", "Örnek proje"],
  ] as const) {
    core.projects.create({ key, name, description: "Örnek proje" }, "seed");
    for (let i = 1; i <= 4; i++) {
      core.items.create(
        key,
        {
          title: `Örnek iş ${i}`,
          body_md: "Örnek açıklama",
          criteria: ["Kabul kriteri"],
        },
        "seed",
      );
    }
  }
} finally {
  core.close();
}
