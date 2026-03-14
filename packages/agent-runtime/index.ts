export type RuntimeEvent =
  | { type: "goal.started"; payload: Record<string, unknown> }
  | { type: "step.planned"; payload: Record<string, unknown> }
  | { type: "step.executed"; payload: Record<string, unknown> }
  | { type: "step.evaluated"; payload: Record<string, unknown> }
  | { type: "goal.completed"; payload: Record<string, unknown> }
  | { type: "goal.failed"; payload: Record<string, unknown> };

export type RuntimeStep = {
  id: string;
  description: string;
  dependsOn: string[];
};

export class RuntimeGraph {
  private readonly steps = new Map<string, RuntimeStep>();

  addStep(step: RuntimeStep): void {
    this.steps.set(step.id, step);
  }

  topologicalOrder(): RuntimeStep[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const output: RuntimeStep[] = [];

    const dfs = (id: string) => {
      if (visiting.has(id)) throw new Error("cycle_detected");
      if (visited.has(id)) return;
      const step = this.steps.get(id);
      if (!step) throw new Error(`missing_step:${id}`);
      visiting.add(id);
      for (const dep of step.dependsOn) dfs(dep);
      visiting.delete(id);
      visited.add(id);
      output.push(step);
    };

    for (const id of this.steps.keys()) dfs(id);
    return output;
  }
}
