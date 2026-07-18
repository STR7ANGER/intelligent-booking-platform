# Day-one demo

1. Start PostgreSQL and Redis with `docker compose up -d`, apply migrations, and run the seed.
2. Start the API and web app independently. Confirm `/health` reports the UTC/IANA policy without secrets.
3. Open `/admin`, show rejection with a wrong key, then load the seeded organization and create a location using `Asia/Kolkata`. Try an invalid zone and observe the bounded error.
4. Run `npm run slots:test`. The suite demonstrates normal UTC conversion, a skipped spring-forward gap, fall-back ambiguity rejection, explicit offset selection, and invalid-rule rejection.
5. Review `docs/booking-concurrency.md` for the Redis hold and serializable booking contract that begins Task 11.
