resource "google_sql_database_instance" "birthub" {
  name             = "${local.prefix}-postgres"
  database_version = "POSTGRES_16"
  region           = var.region
  settings {
    tier              = "db-custom-2-7680"
    availability_type = "REGIONAL"
    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }
    ip_configuration {
      ipv4_enabled    = false
      private_network = "projects/${var.project_id}/global/networks/${var.network}"
    }
  }
}
