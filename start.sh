concurrently \
  --names "web,server,engine" \
  "cd web && npm run dev" \
  "cd src && make" \
  "sleep 3 && cd engine && go run ./cmd"
