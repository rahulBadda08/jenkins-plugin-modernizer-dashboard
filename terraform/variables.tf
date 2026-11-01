variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (e.g. prod, staging)"
  type        = string
  default     = "production"
}

variable "bucket_name" {
  description = "Globally unique name for the S3 origin bucket"
  type        = string
  default     = "jenkins-plugin-modernizer-dashboard-prod"
}

