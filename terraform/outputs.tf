output "s3_bucket_name" {
  description = "Name of the S3 static hosting bucket"
  value       = aws_s3_bucket.dashboard_bucket.id
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront CDN distribution"
  value       = aws_cloudfront_distribution.dashboard_distribution.id
}

output "cloudfront_domain_name" {
  description = "Public domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.dashboard_distribution.domain_name
}

