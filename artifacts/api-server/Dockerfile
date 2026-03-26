FROM node:22 AS base

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY artifacts/bankdata-app/package.json artifacts/bankdata-app/package.json
COPY lib/db/package.json lib/db/package.json
COPY lib/api-zod/package.json lib/api-zod/package.json
COPY lib/api-client-react/package.json lib/api-client-react/package.json
COPY lib/object-storage-web/package.json lib/object-storage-web/package.json

RUN pnpm install --no-frozen-lockfile

COPY artifacts/api-server artifacts/api-server
COPY artifacts/bankdata-app artifacts/bankdata-app
COPY lib lib
COPY attached_assets attached_assets

RUN pnpm --filter @workspace/bankdata-app build

RUN pnpm --filter @workspace/api-server build

RUN cp -r artifacts/bankdata-app/dist/public artifacts/api-server/dist/public

CMD ["pnpm", "--filter", "@workspace/api-server", "start"]
