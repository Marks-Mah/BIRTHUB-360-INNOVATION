terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" { type = string }
variable "region" { type = string default = "us-central1" }
variable "network" { type = string default = "default" }
variable "env" { type = string default = "prod" }

locals {
  project = var.project_id
  region  = var.region
  env     = var.env
  prefix  = "birthub-360-${local.env}"
}
