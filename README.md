# swagger-filter

Filter and override fields in existing swagger file from url.


## Environment variables

 * PORT - specify listening port, default: 80
 * FILTER - JSON object with configuration (see Filter Usage)


## Filter Usage

Example:

    {
        "external": {
            "url": "http://api.local/v1/api-docs",
            "override": {
                "host": "api.external.com",
                "basePath": "/api/v1",
                "securityDefinitions": {
                    "Authorization": {
                        "type": "apiKey",
                        "name": "Authorization",
                        "in": "header"
                    }
                }
            },
            "pathOverride": {
                "security": [
                    {"Authorization": []}
                ],
                "tags": [
                    "default"
                ]
            },
            "includes": {
                "getUser": {},
                "setUser": {}
            }
        }
    }

 * `external` - is a name of endpoint for outputed swagger, example: http://localhost:5000/external
 * `url` - where to fetch original swagger file
 * `override` - override swagger file
 * `pathOverride` - override in each endpoint
 * `includes` - includes only this endponts (key is operationId) - object which is passed as value specifies overrides per endpoint
