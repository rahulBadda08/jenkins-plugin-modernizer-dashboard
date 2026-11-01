# Terraform Infrastructure as Code (IaC)

This directory contains production Terraform configurations for hosting the **Jenkins Plugin Modernizer Dashboard** on AWS with Amazon S3 and Amazon CloudFront CDN.

## Architecture

- **Amazon S3**: Private origin bucket with all public access strictly blocked (`aws_s3_bucket_public_access_block`).
- **Origin Access Control (OAC)**: SigV4 authenticated access between CloudFront and S3.
- **Amazon CloudFront**: Global CDN distribution with TLS 1.3, Brotli/Gzip compression, and response security headers.
- **SPA Fallback**: Custom error responses mapping HTTP 403/404 to `/index.html` with HTTP 200 for client-side single-page routing.

## Usage

```bash
# Initialize Terraform
terraform init

# Review execution plan
terraform plan

# Deploy infrastructure
terraform apply
```

To synchronize built assets from `dist/`:
```bash
aws s3 sync ../dist/ s3://$(terraform output -raw s3_bucket_name)/ --delete
aws cloudfront create-invalidation --distribution-id $(terraform output -raw cloudfront_distribution_id) --paths "/*"
```

