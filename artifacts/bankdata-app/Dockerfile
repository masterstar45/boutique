FROM node:22

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY artifacts/bankdata-app/package.json artifacts/bankdata-app/package.json
COPY lib/api-client-react/package.json lib/api-client-react/package.json
COPY lib/object-storage-web/package.json lib/object-storage-web/package.json

RUN pnpm install --no-frozen-lockfile

COPY artifacts/bankdata-app artifacts/bankdata-app
COPY lib lib

RUN pnpm --filter @workspace/bankdata-app build

ENV BASE_PATH=/

CMD ["pnpm", "--filter", "@workspace/bankdata-app", "serve"]
