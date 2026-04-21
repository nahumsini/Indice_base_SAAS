# Troubleshooting

## Port in use

If `8082` is occupied:

```bash
ss -ltnp | rg 8082
```

Then stop the conflicting process or change `server.port`.

## MySQL connection failure

Check:

```bash
docker exec indice-mysql mysql -u indice_user -pindice_pass -e "SELECT 1" indice_db
```

## Frontend talking to wrong backend

Check:

- `Frontend_Indice/.env.local`
- `Frontend_Indice/vite.config.ts`

## Login returns 401

Check:

- backend is running
- credentials are correct
- browser/Postman is preserving the session cookie

