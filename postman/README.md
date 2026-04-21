# Postman Collection

This Postman setup now targets the standalone Spring REST API only.

Files:

- `indice-erp-api.postman_collection.json`
- `indice-erp-api.local.postman_environment.json`

Run order:

1. `POST Login`
2. `GET Me`
3. `GET Current User`
4. `PUT Current User` when you want to verify profile saves
5. any other request

Current-user profile payload notes:

- `telefono` remains the full stored phone value
- `country` is now a separate profile field
- `new_password` and `confirm_new_password` are optional

Base URL:

- `http://127.0.0.1:8082`
