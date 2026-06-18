# valhall

how to install
react with vite
```npm create vite@latest frontend -- --template react-ts```

tailwind css:
Follow this link:
https://tailwindcss.com/docs/installation/using-vite

For frontend design I use AI to generate code since it will be much faster.

For routing
```npm install react-router-dom```

We use NestJS in backend. To install

```sudo npm i -g @nestjs/cli```

and then in root of the project
```nest new services/valhall-api```

How to run the database locally
```sudo pacman -S postgresql```

```sudo -iu postgres initdb -D /var/lib/postgres/data```

```sudo systemctl start postgresql```

```sudo -iu postgres psql```

Prisma:
```npm install prisma --save-dev```

```npm install @prisma/client @prisma/adapter-pg pg```

```npx prisma init --output ../src/generated/prisma```

```npx prisma generate```

Migrate the database:
```npx prisma migrate dev --name [name]```