# @platformatic/pg-hooks

Implement web hooks inside your application easily.
Features:

1. delayed/scheduled invocation
2. automatic retries
3. leader/follower system (with election)
4. dead letter queue
5. cron

`@platformatic/pg-hooks` is also useful to create an outbox.

![Architecture](./architecture.png)

You can install `@platformatic/pg-hooks` via the [Platformatic Marketplace](https://marketplace.platformatic.dev/).

## Standalone Install & Setup

You can generate a standalone application with: 

```bash
npx --package @platformatic/pg-hooks -c create-platformatic-pg-hooks
cd pg-hooks-app
npm i
npx plt start
```

You can then edit your `.env` file and configure the `DB_URL` env variable
to select a PostgreSQL database.

Explore both the OpenAPI and GraphQL definitions that are now available at [http://127.0.0.1:3042](http://127.0.0.1:3042).

## API Tutorial

To verify everything is working correctly, we will do a short tutorial

### Create a target service

Run:

```bash
npx @platformatic/service create
```

This will create a [Platformatic Service](https://docs.platformatic.dev/docs/reference/service/introduction),
which is essentially a [Fastify](https://fastify.dev) template.

Now, create a `platformatic-service/routes/hook.js` file with the following content:

```js
/// <reference path="../global.d.ts" />
'use strict'
/** @param {import('fastify').FastifyInstance} fastify */
module.exports = async function (fastify, opts) {
  fastify.post('/receive-my-hook', async (request, reply) => {
    request.log.info({ body: request.body }, 'Received hook')
    return 'ok'
  })
}
```

Then, edit `platformatic-service/.env` and `platformatic-service/.env.sample` so that `PORT=3001`

Run `plt start` to start your app. To verify that your applications is working as expected, in another shell run:

```bash
curl -X POST -H 'Content-Type: application/json' -d '{ "hello": "world" }' http://127.0.0.1:3001/receive-my-hook
```

This will print `ok` and log the received body in the console.

### Create a Queue

Create a queue with

```bash
curl --request POST \
  --url http://127.0.0.1:3042/queues/ \
  --header 'Content-Type: application/json' \
  --data '{
  "name": "my test",
  "callbackUrl": "http://127.0.0.1:3001/receive-my-hook",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "maxRetries": 1
}'
```

or via OpenAPI or GraphQL web pages.

### Create a Message

```bash
curl --request POST \
  --url http://0.0.0.0:3042/messages/ \
  --header 'Content-Type: application/json' \
  --data '{
  "queueId": 1,
  "body": "{ \"hello\": \"world\" }"
}'
```

Watch the logs in both the service and the hooks app.

### Create a Cron (optional)

You can set up a cron job with:

```bash
curl --request POST \
  --url http://0.0.0.0:3042/cron/ \
  --header 'Content-Type: application/json' \
  --data '{
  "queueId": 2,
  "schedule": "* * * * *",
  "body": "{ \"hello\": \"world\" }"
}'
```

## Authorization

`@platformatic/pg-hooks` is built around [`@platformatic/db`](https://docs.platformatic.dev/docs/reference/db/introduction/#platformatic-db),
which means that authorization can be set up with its [strategies](https://docs.platformatic.dev/docs/reference/db/authorization/introduction).

The following will configure `@platformatic/pg-hooks` to only accept schedule requests by an admin that knowns the
`PLT_ADMIN_SECRET` env variable:

```json
{
 ...
 "authorization": {
    "adminSecret": "{PLT_ADMIN_SECRET}",
    "rules": [
      {
        "role": "anonymous",
        "entity": "queue",
        "find": false,
        "save": false,
        "delete": false
      },
      {
        "role": "anonymous",
        "entity": "cron",
        "find": false,
        "save": false,
        "delete": false
      },
      {
        "role": "anonymous",
        "entity": "message",
        "find": false,
        "save": false,
        "delete": false
      }
    ]
  },
  ...
}
```

For every http request, a `X-PLATFORMATIC-ADMIN-SECRET` header must be set with the same content of `PLT_ADMIN_SECRET`.

## Leader election

`@platformatic/pg-hooks` elects a Leader using a [PostgreSQL Advisory Locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS),
with a first-comes-win election: the first process that can grab the lock is the leader.

Currently, the leader is responsible for cron scheduling and message delivery, with all the peer responsible for
creating queues and storing messages in the database.

## License

Apache-2.0
