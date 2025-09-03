# my mini gpt

A simple local mini gpt

## overview

```
web <-> api <-> mcp server
            <-> llm 
```

## how to start

### start db and llm

```
docker compose up -d
```

### download model

```
docker exec -it llm bash
ollama pull llama3.2:3b
```

### build mcp server

```
cd mcp-server
npm run build
```

### start api

```
cd api
npm run dev
```

### start web

```
cd web
npm run dev
```