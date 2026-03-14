resource "google_service_account" "api_gateway" {
  account_id   = "birthub-api-gateway"
  display_name = "BirtHub API Gateway"
}

resource "google_service_account" "agents" {
  account_id   = "birthub-agents"
  display_name = "BirtHub Agents"
}

resource "google_service_account" "workers" {
  account_id   = "birthub-workers"
  display_name = "BirtHub Workers"
}

resource "google_project_iam_member" "api_gateway_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.api_gateway.email}"
}

resource "google_project_iam_member" "agents_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.agents.email}"
}

resource "google_project_iam_member" "workers_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.workers.email}"
}

resource "google_project_iam_member" "workers_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.workers.email}"
}
