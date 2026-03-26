FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY lib/db/package.json lib/db/package.json
COPY lib/api-zod/package.json lib/api-zod/package.json

RUN pnpm install --frozen-lockfile

COPY artifacts/api-server artifacts/api-server
COPY lib lib

RUN pnpm --filter @workspace/api-server build

ENV NODE_ENV=production

CMD ["pnpm", "--filter", "@workspace/api-server", "start"]
