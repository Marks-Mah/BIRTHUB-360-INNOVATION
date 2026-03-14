from enum import Enum


class SDRTask(str, Enum):
    QUALIFY_LEAD = "qualify_lead"
    SYNC_CRM = "sync_crm"
    BUILD_CADENCE = "build_cadence"
    HANDLE_REPLY = "handle_reply"
