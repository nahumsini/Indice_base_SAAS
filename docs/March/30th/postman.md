# Postman Guide

Files:

- [`postman/indice-erp-api.postman_collection.json`](../postman/indice-erp-api.postman_collection.json)
- [`postman/indice-erp-api.local.postman_environment.json`](../postman/indice-erp-api.local.postman_environment.json)

## Import

1. Import the collection
2. Import the environment
3. Select the local environment

## Base URL

- `http://127.0.0.1:8082`

## Main flow

1. `POST /api/v1/auth/login`
2. `GET /api/v1/auth/me`
3. `GET /api/v1/config-center/current-user`
4. `PUT /api/v1/config-center/current-user` when validating profile edits
5. run any other route

## Current user profile payload

- `telefono` remains the stored full phone value
- `country` is now sent separately for the profile country
- `new_password` and `confirm_new_password` are optional and only needed when changing the password
