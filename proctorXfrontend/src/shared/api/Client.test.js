import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatApiError, getCookie } from "../utils/apiUtils.js";

describe("Client API Utilities & Error Handling", () => {
  it("should return friendly offline error message on network failure", () => {
    const error = { code: "ERR_NETWORK" };
    const formatted = formatApiError(error);
    assert.match(formatted, /unreachable/i);
  });

  it("should return custom backend string message if provided", () => {
    const error = {
      response: {
        status: 403,
        data: "Account is awaiting coordinator verification."
      }
    };
    const formatted = formatApiError(error);
    assert.strictEqual(formatted, "Account is awaiting coordinator verification.");
  });

  it("should return message property from backend error json object", () => {
    const error = {
      response: {
        status: 400,
        data: { message: "Invalid email format" }
      }
    };
    const formatted = formatApiError(error);
    assert.strictEqual(formatted, "Invalid email format");
  });

  it("should extract cookie properly from cookie string", () => {
    // In Node test environment, mock document if undefined
    globalThis.document = { cookie: "XSRF-TOKEN=test-csrf-value-123; user_session=abc" };
    const token = getCookie("XSRF-TOKEN");
    assert.strictEqual(token, "test-csrf-value-123");
  });
});
