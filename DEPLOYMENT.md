# Cloud Run Deployment Guide

This guide will help you deploy the iMessage API server to Google Cloud Run.

## Prerequisites

1. Google Cloud Project with billing enabled
2. Cloud Run API enabled
3. Container Registry API enabled
4. gcloud CLI installed and configured

## Environment Variables

Set these environment variables in Cloud Run:

### Required for API functionality:
- `SERIES_API_BASE_URL` - Your Series API base URL
- `SERIES_API_KEY` - Your Series API key

### Required for Kafka:
- `KAFKA_BOOTSTRAP_SERVERS` - Kafka bootstrap servers
- `KAFKA_TOPIC_NAME` - Kafka topic name
- `KAFKA_CONSUMER_GROUP` - Kafka consumer group
- `KAFKA_CLIENT_ID` - Kafka client ID
- `KAFKA_SASL_USERNAME` - Kafka SASL username
- `KAFKA_SASL_PASSWORD` - Kafka SASL password
- `KAFKA_SASL_MECHANISM` - Usually "PLAIN"
- `KAFKA_TLS_ENABLED` - "true" or "false"

### Optional:
- `PORT` - Server port (default: 8080, Cloud Run sets this automatically)
- `NODE_ENV` - Set to "production" for production deployments

## Deployment Methods

### Method 1: Using Cloud Build (Recommended)

1. **Push code to GitHub** (already done)

2. **Connect Cloud Build to your repository:**
   ```bash
   gcloud builds triggers create github \
     --repo-name=series \
     --repo-owner=Rojan-upreti \
     --branch-pattern="^main$" \
     --build-config=cloudbuild.yaml
   ```

3. **Set environment variables in Cloud Run:**
   ```bash
   gcloud run services update series \
     --region=us-east1 \
     --set-env-vars="SERIES_API_BASE_URL=your-url,SERIES_API_KEY=your-key,KAFKA_BOOTSTRAP_SERVERS=your-servers"
   ```

### Method 2: Manual Deployment with gcloud

1. **Build and push the container:**
   ```bash
   # Set your project ID
   export PROJECT_ID=your-project-id
   
   # Build the image
   docker build -t gcr.io/$PROJECT_ID/series .
   
   # Push to Container Registry
   docker push gcr.io/$PROJECT_ID/series
   ```

2. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy series \
     --image gcr.io/$PROJECT_ID/series \
     --region us-east1 \
     --platform managed \
     --allow-unauthenticated \
     --port 8080 \
     --memory 512Mi \
     --timeout 300 \
     --max-instances 10 \
     --set-env-vars="SERIES_API_BASE_URL=your-url,SERIES_API_KEY=your-key"
   ```

3. **Set additional environment variables:**
   ```bash
   gcloud run services update series \
     --region us-east1 \
     --update-env-vars="KAFKA_BOOTSTRAP_SERVERS=your-servers,KAFKA_TOPIC_NAME=your-topic"
   ```

### Method 3: Using Cloud Console

1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Click "Create Service"
3. Select "Deploy one revision from an existing container image"
4. Enter image URL: `gcr.io/YOUR_PROJECT_ID/series`
5. Configure:
   - Service name: `series`
   - Region: `us-east1`
   - Allow unauthenticated invocations: Yes
   - Port: `8080`
   - Memory: `512Mi`
   - Timeout: `300 seconds`
6. Add environment variables in the "Variables & Secrets" tab
7. Click "Create"

## Setting Environment Variables

### Via gcloud CLI:
```bash
gcloud run services update series \
  --region us-east1 \
  --update-env-vars="KEY1=value1,KEY2=value2"
```

### Via Cloud Console:
1. Go to Cloud Run → Your Service → Edit & Deploy New Revision
2. Click "Variables & Secrets" tab
3. Add environment variables
4. Click "Deploy"

## Health Check

The server includes a health check endpoint at `/api/health`:

```bash
curl https://your-service-url.run.app/api/health
```

## Troubleshooting

### Container fails to start

1. **Check logs:**
   ```bash
   gcloud run services logs read series --region us-east1
   ```

2. **Verify PORT is set:**
   - Cloud Run automatically sets `PORT=8080`
   - The server binds to `0.0.0.0:PORT`

3. **Check environment variables:**
   - Ensure all required variables are set
   - API client will warn if not configured but won't crash

### Connection issues

1. **Kafka connection:**
   - Verify Kafka credentials are correct
   - Check network connectivity from Cloud Run
   - Kafka consumer only starts when `/api/listener/start` is called

2. **API connection:**
   - Verify API base URL and key are correct
   - Check if API is accessible from Cloud Run

### Timeout issues

- Increase timeout: `--timeout 300` (5 minutes)
- Check if Kafka consumer is taking too long to connect

## Testing Deployment

1. **Health check:**
   ```bash
   curl https://your-service-url.run.app/api/health
   ```

2. **Start listener:**
   ```bash
   curl -X POST https://your-service-url.run.app/api/listener/start
   ```

3. **Check status:**
   ```bash
   curl https://your-service-url.run.app/api/listener/status
   ```

4. **Send a reply:**
   ```bash
   curl -X POST https://your-service-url.run.app/api/reply \
     -H "Content-Type: application/json" \
     -d '{"chatId": "12345", "message": "Hello!"}'
   ```

## WebSocket Support

Cloud Run supports WebSocket connections. Connect to:
```
wss://your-service-url.run.app
```

## Monitoring

- View logs: `gcloud run services logs read series --region us-east1`
- View metrics: Cloud Run → Your Service → Metrics tab
- Set up alerts: Cloud Run → Your Service → Alerts tab

## Scaling

- **Min instances:** 0 (default, scales to zero when idle)
- **Max instances:** 10 (adjust based on traffic)
- **Concurrency:** 80 (default, adjust if needed)
- **Memory:** 512Mi (increase if needed)

## Security

- Use Secret Manager for sensitive credentials:
  ```bash
  # Create secret
  echo -n "your-secret" | gcloud secrets create kafka-password --data-file=-
  
  # Use in Cloud Run
  gcloud run services update series \
    --update-secrets="KAFKA_SASL_PASSWORD=kafka-password:latest"
  ```

## Cost Optimization

- Set min instances to 0 to scale to zero when idle
- Use appropriate memory allocation (512Mi is usually sufficient)
- Monitor usage in Cloud Console

