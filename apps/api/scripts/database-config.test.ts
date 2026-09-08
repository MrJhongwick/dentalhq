import assert from "node:assert/strict";
import test from "node:test";
import { databaseConnection } from "./database-config";

const pooled =
  "postgresql://user:secret@ep-test-pooler.us-east-2.aws.neon.tech/dev?sslmode=require";
const direct = pooled.replace("-pooler", "");

test("accepts configured pooled and direct TLS connections", () => {
  assert.equal(databaseConnection(pooled, true), pooled);
  assert.equal(databaseConnection(direct, false), direct);
});

test("rejects missing, placeholder, insecure, wrong-provider and wrong-pooling configuration without leaking values", () => {
  for (const value of [
    undefined,
    "secret",
    pooled.replace("user", "<role>"),
    pooled.replace("sslmode=require", "sslmode=disable"),
    pooled.replace(".neon.tech", ".example.com"),
    direct,
  ]) {
    assert.throws(
      () => databaseConnection(value, true),
      (error: Error) => {
        assert.equal(error.message.includes("secret"), false);
        assert.equal(error.message.includes("postgresql://"), false);
        return true;
      },
    );
  }
  assert.throws(() => databaseConnection(pooled, false));
});
