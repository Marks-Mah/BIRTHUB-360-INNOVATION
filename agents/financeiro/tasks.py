from enum import Enum


class FinanceiroTask(str, Enum):
    VALIDATE_INPUT = "validate_input"
    PROCESS_DOMAIN = "process_domain"
    FINALIZE = "finalize"
