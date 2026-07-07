import { describe, expect, it } from "vitest";
import { pushWirdUnterstuetzt, urlBase64ToUint8Array } from "./webpush";

describe("urlBase64ToUint8Array", () => {
  it("dekodiert einen Base64URL-String (mit -/_ und fehlendem Padding)", () => {
    // "hi" -> Base64 "aGk=" ; Base64URL ohne Padding: "aGk"
    const arr = urlBase64ToUint8Array("aGk");
    expect(Array.from(arr)).toEqual([104, 105]); // 'h','i'
  });

  it("behandelt -/_ als +/ (Base64URL-Alphabet)", () => {
    // Bytes [255, 224] -> Standard-Base64 "/+A=", Base64URL "_-A"
    const arr = urlBase64ToUint8Array("_-A");
    expect(Array.from(arr)).toEqual([255, 224]);
  });
});

describe("pushWirdUnterstuetzt", () => {
  it("liefert false ohne Secure Context / PushManager (jsdom)", () => {
    // jsdom stellt keinen PushManager/Secure Context bereit → Option ausgeblendet.
    expect(pushWirdUnterstuetzt()).toBe(false);
  });
});
