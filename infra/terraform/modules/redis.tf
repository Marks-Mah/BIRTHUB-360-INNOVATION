resource "google_redis_instance" "birthub" {
  name               = "${local.prefix}-redis"
  memory_size_gb     = 1
  tier               = "STANDARD_HA"
  region             = var.region
  authorized_network = "projects/${var.project_id}/global/networks/${var.network}"
  redis_version      = "REDIS_6_X"
}
