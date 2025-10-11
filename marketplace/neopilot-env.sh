# Neopilot GKE Deployment Environment Variables
# Customized for your GCP setup

# This is the GCP project for creating GKE cluster and OAuth client
export GCP_PROJECT="neoai-473902"

# This is the GCP project where Cloud DNS service is configured
export DNS_PROJECT="neoai-473902"

# This is the GCP project where your GCR (Google Container Registry) is located
export GCR_PROJECT="neoai-473902"

# GCP zone for your cluster (example: us-central1-a, europe-west1-b)
export COMPUTE_ZONE="us-central1-a"

# Name for your GKE cluster (example: neopilot-prod-cluster)
export CLUSTER_NAME="neopilot-cluster"

# Kubernetes version (use the default from README)
export NODE_VERSION="1.27.8-gke.1067004"

# Display current settings
echo "=== Neopilot Deployment Configuration ==="
echo "GCP_PROJECT: $GCP_PROJECT"
echo "DNS_PROJECT: $DNS_PROJECT"
echo "GCR_PROJECT: $GCR_PROJECT"
echo "COMPUTE_ZONE: $COMPUTE_ZONE"
echo "CLUSTER_NAME: $CLUSTER_NAME"
echo "NODE_VERSION: $NODE_VERSION"
echo "========================================"
