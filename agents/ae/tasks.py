from enum import Enum


class AETask(str, Enum):
    ANALYZE_DEAL = "analyze_deal"
    GENERATE_PROPOSAL = "generate_proposal"
    REVIEW_CONTRACT = "review_contract"
    SYNC_CRM = "sync_crm"
