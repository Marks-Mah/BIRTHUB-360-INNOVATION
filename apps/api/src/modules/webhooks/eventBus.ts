import { EventEmitter } from "node:events";

import type { ApiConfig } from "@birthub/config";
import { prisma, WorkflowStatus, WorkflowTriggerType } from "@birthub/database";

import { runWorkflowNow } from "../workflows/service.js";

const eventBus = new EventEmitter();
const INTERNAL_TOPIC = "workflow-internal-event";

interface WorkflowInternalEvent {
  payload: Record<string, unknown>;
  tenantId: string;
  topic: string;
}

let isBridgeInitialized = false;

export function initializeWorkflowInternalEventBridge(config: ApiConfig): void {
  if (isBridgeInitialized) {
    return;
  }

  isBridgeInitialized = true;
  eventBus.on(INTERNAL_TOPIC, (event: WorkflowInternalEvent) => {
    void (async () => {
      const workflows = await prisma.workflow.findMany({
        where: {
          eventTopic: event.topic,
          status: WorkflowStatus.PUBLISHED,
          tenantId: event.tenantId,
          triggerType: WorkflowTriggerType.EVENT
        }
      });

      for (const workflow of workflows) {
        await runWorkflowNow(
          config,
          workflow.id,
          workflow.organizationId,
          {
            async: true,
            payload: event.payload
          },
          WorkflowTriggerType.EVENT
        );
      }
    })();
  });
}

export function emitWorkflowInternalEvent(event: WorkflowInternalEvent): void {
  eventBus.emit(INTERNAL_TOPIC, event);
}

