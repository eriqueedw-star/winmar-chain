output "staging_instance_id" {
  value       = aws_instance.staging.id
  description = "SSM Session Manager target after explicit provisioning approval."
}

output "staging_private_ip" {
  value       = aws_instance.staging.private_ip
  description = "Internal address only; do not add public ingress."
}

output "staging_security_group_id" {
  value = aws_security_group.staging.id
}
