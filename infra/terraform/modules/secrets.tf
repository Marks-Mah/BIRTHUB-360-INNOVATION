variable "secret_environments" {
  type        = set(string)
  description = "Ambientes com segredos isolados."
  default     = ["dev", "staging", "prod"]
}

locals {
  secret_vars = toset([
    "NODE_ENV",
    "PORT",
    "DATABASE_URL",
    "REDIS_URL",
    "ELASTICSEARCH_URL",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_JWT_ISSUER",
    "SUPABASE_JWT_AUDIENCE",
    "JWT_SECRET",
    "INTERNAL_SERVICE_TOKEN",
    "GEMINI_API_KEY",
    "RESEND_API_KEY",
    "SVIX_APP_ID",
    "SVIX_API_KEY",
    "SVIX_WEBHOOK_SECRET",
    "META_WABA_TOKEN",
    "STRIPE_SECRET_KEY",
    "PAGARME_API_KEY",
    "ASAAS_API_KEY",
    "CLICKSIGN_API_KEY",
    "DOCUSIGN_INTEGRATION_KEY",
    "FOCUS_NFE_TOKEN",
    "GOOGLE_CALENDAR_CREDENTIALS_JSON",
    "GOOGLE_CALENDAR_ACCESS_TOKEN",
    "HUBSPOT_ACCESS_TOKEN",
    "PIPEDRIVE_API_TOKEN",
    "GOOGLE_DRIVE_CREDENTIALS_JSON",
    "GCS_BUCKET",
    "GCS_REGION",
    "GOOGLE_CLOUD_PROJECT",
    "GOOGLE_APPLICATION_CREDENTIALS_JSON",
    "GRAFANA_URL",
    "PROMETHEUS_URL"
  ])

  env_secret_pairs = {
    for pair in setproduct(local.secret_vars, var.secret_environments) :
    "${pair[1]}-${lower(replace(pair[0], "_", "-"))}" => {
      env        = pair[1]
      secret_var = pair[0]
      secret_id  = "${pair[1]}-${lower(replace(pair[0], "_", "-"))}"
    }
  }
}

resource "google_secret_manager_secret" "env" {
  for_each  = local.env_secret_pairs
  secret_id = each.value.secret_id

  labels = {
    environment = each.value.env
    managed_by  = "terraform"
  }

  replication {
    auto {}
  }
}
