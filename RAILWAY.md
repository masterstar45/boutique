# Déploiement sur Railway

Ce workspace se déploie en **2 services** Railway :
- `api-server` (Node/Express)
- `bankdata-app` (Vite preview)

## 1) Service API

Crée un service Railway depuis ce repo avec :
- **Root Directory**: `artifacts/api-server`
- **Build Command**: `pnpm --filter @workspace/api-server build`
- **Start Command**: `pnpm --filter @workspace/api-server start`

Variables minimales :
- `DATABASE_URL` (Postgres Railway)
- `JWT_SECRET`

Variables recommandées :
- `NODE_ENV=production`
- `PUBLIC_API_BASE_URL=https://<api-domain>.up.railway.app`
- `PUBLIC_MINI_APP_URL=https://<front-domain>.up.railway.app`
- `LOG_LEVEL=info`

Variables optionnelles selon tes features :
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_CHAT_ID`
- `OXAPAY_API_KEY`
- `PUBLIC_OBJECT_SEARCH_PATHS`
- `PRIVATE_OBJECT_DIR`
- `GCP_PROJECT_ID`
- `GCP_SERVICE_ACCOUNT_JSON` (JSON du service account, en une seule ligne)

## 2) Service Frontend

Crée un second service Railway depuis le même repo avec :
- **Root Directory**: `artifacts/bankdata-app`
- **Build Command**: `pnpm --filter @workspace/bankdata-app build`
- **Start Command**: `pnpm --filter @workspace/bankdata-app serve`

Variables :
- `BASE_PATH=/`
- `VITE_API_BASE_URL=https://<api-domain>.up.railway.app`

## 3) Connexion API ↔ Front

- Vérifie que `VITE_API_BASE_URL` pointe vers ton domaine API Railway.
- Vérifie que `PUBLIC_MINI_APP_URL` pointe vers ton domaine Front Railway.
- Si Telegram est activé, le webhook sera configuré sur :
  - `https://<api-domain>/api/telegram-webhook`

## 4) Vérifications rapides

- API healthcheck : `https://<api-domain>/api/healthz`
- Frontend : ouvre le domaine du service `bankdata-app`
- CORS est déjà activé côté API (`origin: true`).
