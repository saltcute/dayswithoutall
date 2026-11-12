import type { SceneDef } from "../engine/stage";

// Every src/scenes/dayNN.ts file is picked up automatically and code-split.
const modules = import.meta.glob<{ default: SceneDef }>("./day*.ts");

const loaders = new Map<number, () => Promise<{ default: SceneDef }>>();
for (const [path, load] of Object.entries(modules)) {
  const m = path.match(/day(\d+)\.ts$/);
  if (m) loaders.set(Number(m[1]), load);
}

export async function loadScene(day: number): Promise<SceneDef> {
  const l = loaders.get(day) ?? (() => import("./generic"));
  return (await l()).default;
}

export function hasScene(day: number) {
  return loaders.has(day);
}
