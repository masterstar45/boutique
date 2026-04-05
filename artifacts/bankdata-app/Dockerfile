FROM node:22

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/bankdata-app/package.json artifacts/bankdata-app/package.json
COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY lib/db/package.json lib/db/package.json
COPY lib/api-zod/package.json lib/api-zod/package.json
COPY lib/api-client-react/package.json lib/api-client-react/package.json
COPY lib/object-storage-web/package.json lib/object-storage-web/package.json

RUN pnpm install --no-frozen-lockfile

COPY artifacts/bankdata-app artifacts/bankdata-app

RUN pnpm --filter bankdata-app build

ENV BASE_PATH=/

CMD ["pnpm", "--filter", "bankdata-app", "preview", "--host", "0.0.0.0", "--port", "8080"]
