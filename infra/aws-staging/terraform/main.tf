# REVIEW-ONLY. Terraform plan/apply require explicit AWS operator authorization.
# No mainnet signer, WMC funds, public ingress, Redis service or faucet deployment.
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

data "aws_subnet" "approved" {
  id = var.private_subnet_id
}

resource "aws_security_group" "staging" {
  name_prefix = "${var.environment_name}-"
  description = "WINMAR CHAIN staging private instance: no inbound traffic"
  vpc_id      = var.vpc_id

  # Intentionally no ingress; prohibit SSH, Redis, HTTP and RPC inbound access.
  # Controlled 443 outbound supports SSM endpoints through approved routes.
  egress {
    description = "HTTPS to approved SSM and update endpoints; restrict at operator VPC boundary"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment_name}-sg"
  }
}

resource "aws_iam_role" "ssm" {
  name_prefix = "${var.environment_name}-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ssm.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ssm" {
  name_prefix = "${var.environment_name}-"
  role        = aws_iam_role.ssm.name
}

resource "aws_instance" "staging" {
  ami                         = data.aws_ssm_parameter.al2023.value
  instance_type               = var.instance_type
  subnet_id                   = var.private_subnet_id
  associate_public_ip_address = false
  vpc_security_group_ids      = [aws_security_group.staging.id]
  iam_instance_profile        = aws_iam_instance_profile.ssm.name
  monitoring                  = true

  # Never permit applying this stack to a subnet from another VPC.
  lifecycle {
    precondition {
      condition     = data.aws_subnet.approved.vpc_id == var.vpc_id
      error_message = "Provided subnet ID is not inside the approved VPC."
    }
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  root_block_device {
    encrypted   = true
    volume_size = var.root_volume_gb
    volume_type = "gp3"
  }

  tags = {
    Name            = var.environment_name
    NoMainnetClaims = "true"
  }
}
