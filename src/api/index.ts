import { Hono } from "hono";
import { db } from "ponder:api";
import schema from "ponder:schema";
import { graphql } from "ponder";

const app = new Hono();

// Register GraphQL middleware
app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

// Example custom endpoint
app.get("/hello", (c) => {
  return c.text("Hello, Vault Monitor!");
});

export default app; 