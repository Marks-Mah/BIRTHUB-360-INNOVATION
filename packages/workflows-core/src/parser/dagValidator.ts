import { CyclicDependencyError, InvalidGraphError } from "../errors.js";
import type {
  DagEdge,
  DagNode,
  DagValidationInput,
  DagValidationOptions,
  DagValidationResult
} from "../types.js";

function getCyclePath(
  adjacency: Map<string, string[]>,
  nodeId: string,
  visiting: Set<string>,
  visited: Set<string>,
  stack: string[]
): string[] | null {
  if (visiting.has(nodeId)) {
    const cycleStart = stack.indexOf(nodeId);
    return cycleStart >= 0 ? [...stack.slice(cycleStart), nodeId] : [nodeId, nodeId];
  }

  if (visited.has(nodeId)) {
    return null;
  }

  visiting.add(nodeId);
  stack.push(nodeId);

  for (const target of adjacency.get(nodeId) ?? []) {
    const cycle = getCyclePath(adjacency, target, visiting, visited, stack);
    if (cycle) {
      return cycle;
    }
  }

  stack.pop();
  visiting.delete(nodeId);
  visited.add(nodeId);
  return null;
}

function assertEdgeEndpoints(nodesById: Map<string, DagNode>, edge: DagEdge): void {
  if (!nodesById.has(edge.source)) {
    throw new InvalidGraphError(`Transition source '${edge.source}' does not exist.`);
  }

  if (!nodesById.has(edge.target)) {
    throw new InvalidGraphError(`Transition target '${edge.target}' does not exist.`);
  }
}

function assertNoIsolatedNodes(nodes: DagNode[], edges: DagEdge[]): void {
  if (nodes.length <= 1) {
    return;
  }

  const connectedNodeIds = new Set<string>();
  for (const edge of edges) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }

  const isolated = nodes.filter((node) => !connectedNodeIds.has(node.id)).map((node) => node.id);
  if (isolated.length > 0) {
    throw new InvalidGraphError("Workflow graph contains isolated nodes.", { isolated });
  }
}

function assertConnectedFromRoot(rootNodeId: string, adjacency: Map<string, string[]>, nodes: DagNode[]): void {
  const reachable = new Set<string>();
  const stack = [rootNodeId];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || reachable.has(current)) {
      continue;
    }

    reachable.add(current);
    for (const next of adjacency.get(current) ?? []) {
      if (!reachable.has(next)) {
        stack.push(next);
      }
    }
  }

  if (reachable.size !== nodes.length) {
    const unreachable = nodes.filter((node) => !reachable.has(node.id)).map((node) => node.id);
    throw new InvalidGraphError("Workflow graph has unreachable nodes from trigger root.", {
      rootNodeId,
      unreachable
    });
  }
}

function topologicalSort(nodes: DagNode[], adjacency: Map<string, string[]>, indegreeByNode: Map<string, number>): string[] {
  const queue: string[] = [];
  for (const node of nodes) {
    if ((indegreeByNode.get(node.id) ?? 0) === 0) {
      queue.push(node.id);
    }
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    order.push(nodeId);

    for (const target of adjacency.get(nodeId) ?? []) {
      const nextValue = (indegreeByNode.get(target) ?? 0) - 1;
      indegreeByNode.set(target, nextValue);
      if (nextValue === 0) {
        queue.push(target);
      }
    }
  }

  if (order.length !== nodes.length) {
    throw new InvalidGraphError("Graph is not a valid DAG for topological sorting.");
  }

  return order;
}

export function validateDag(
  input: DagValidationInput,
  options: DagValidationOptions = {}
): DagValidationResult {
  const requireSingleTrigger = options.requireSingleTrigger ?? true;
  const requireConnected = options.requireConnected ?? true;

  if (input.nodes.length === 0) {
    throw new InvalidGraphError("Workflow graph must contain at least one node.");
  }

  const nodesById = new Map<string, DagNode>();
  for (const node of input.nodes) {
    if (!node.id?.trim()) {
      throw new InvalidGraphError("Node id cannot be empty.");
    }
    if (nodesById.has(node.id)) {
      throw new InvalidGraphError(`Duplicate node id '${node.id}' found.`);
    }
    nodesById.set(node.id, node);
  }

  const adjacency = new Map<string, string[]>();
  const indegreeByNode = new Map<string, number>();
  for (const node of input.nodes) {
    adjacency.set(node.id, []);
    indegreeByNode.set(node.id, 0);
  }

  for (const edge of input.edges) {
    assertEdgeEndpoints(nodesById, edge);
    if (edge.source === edge.target) {
      throw new CyclicDependencyError([edge.source, edge.target]);
    }

    adjacency.get(edge.source)!.push(edge.target);
    indegreeByNode.set(edge.target, (indegreeByNode.get(edge.target) ?? 0) + 1);
  }

  assertNoIsolatedNodes(input.nodes, input.edges);

  const visiting = new Set<string>();
  const visited = new Set<string>();
  for (const node of input.nodes) {
    const cycle = getCyclePath(adjacency, node.id, visiting, visited, []);
    if (cycle) {
      throw new CyclicDependencyError(cycle);
    }
  }

  const rootNodeIds = input.nodes
    .filter((node) => (indegreeByNode.get(node.id) ?? 0) === 0)
    .map((node) => node.id);

  if (rootNodeIds.length === 0) {
    throw new InvalidGraphError("Workflow graph has no trigger/root node.");
  }

  if (requireSingleTrigger && rootNodeIds.length !== 1) {
    throw new InvalidGraphError("Workflow graph must contain exactly one trigger/root node.", {
      rootNodeIds
    });
  }

  if (requireConnected) {
    assertConnectedFromRoot(rootNodeIds[0]!, adjacency, input.nodes);
  }

  const order = topologicalSort(input.nodes, adjacency, indegreeByNode);
  return {
    rootNodeIds,
    topologicalOrder: order
  };
}
