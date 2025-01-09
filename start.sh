concurrently \
  --names "web,server,engine,prisma" \
  "cd web && npm run dev" \
  "cd src && make" \
  "cd src && npx prisma studio --browser none" \
  "sleep 3 && cd engine && go run ./cmd"
