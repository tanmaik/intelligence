/// <reference types="bun-types" />

import { expect, test, mock } from "bun:test";
import { main } from "./edits.js";
import { PrismaClient } from "@prisma/client";
import { EventSource } from "eventsource";

// Create mock for Prisma create method
const createMock = mock((data?: any) => Promise.resolve(data));

// Mock PrismaClient
mock.module("@prisma/client", () => {
  return {
    PrismaClient: class MockPrismaClient {
      mediaWikiRecentChange = {
        create: createMock,
      };
    },
  };
});

test("processes valid Wikipedia edit", async () => {
  const mockEdit = {
    server_name: "en.wikipedia.org",
    type: "edit",
    title: "Test Article",
    title_url: "Test_Article",
    comment: "test edit",
    user: "TestUser",
    bot: false,
    notify_url: "http://example.com",
    minor: false,
    length: {
      old: 100,
      new: 150,
    },
    server_url: "https://en.wikipedia.org",
  };

  // Mock EventSource for this test
  mock.module("eventsource", () => ({
    EventSource: class MockEventSource {
      _onmessage: ((event: any) => void) | null = null;
      _onerror: ((event: any) => void) | null = null;

      constructor(url: string) {}

      set onmessage(handler: ((event: any) => void) | null) {
        this._onmessage = handler;
        // Simulate receiving a message after a short delay
        if (handler) {
          setTimeout(() => {
            handler({
              type: "message",
              data: JSON.stringify(mockEdit),
            });
          }, 100);
        }
      }

      set onerror(handler: ((event: any) => void) | null) {
        this._onerror = handler;
      }

      close() {}
    },
  }));

  // Reset mock before test
  createMock.mockReset();

  // Run main function and wait for it to process the message
  await Promise.race([
    main(),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]);

  // Verify that Prisma create was called with correct data
  expect(createMock.mock.calls.length).toBe(1);
  expect(createMock.mock.calls[0]?.[0]).toEqual({
    data: {
      title: mockEdit.title,
      titleUrl: mockEdit.title_url,
      comment: mockEdit.comment,
      user: mockEdit.user,
      bot: mockEdit.bot,
      notifyUrl: mockEdit.notify_url,
      minor: mockEdit.minor,
      lengthOld: mockEdit.length.old,
      lengthNew: mockEdit.length.new,
      serverUrl: mockEdit.server_url,
    },
  });
});

test("ignores non-Wikipedia edits", async () => {
  const mockEdit = {
    server_name: "wiktionary.org",
    type: "edit",
    title: "Test Article",
  };

  // Mock EventSource for this test
  mock.module("eventsource", () => ({
    EventSource: class MockEventSource {
      _onmessage: ((event: any) => void) | null = null;

      constructor(url: string) {}

      set onmessage(handler: ((event: any) => void) | null) {
        this._onmessage = handler;
        // Simulate receiving a message after a short delay
        if (handler) {
          setTimeout(() => {
            handler({
              type: "message",
              data: JSON.stringify(mockEdit),
            });
          }, 100);
        }
      }

      close() {}
    },
  }));

  // Reset mock before test
  createMock.mockReset();

  // Run main function and wait for it to process the message
  await Promise.race([
    main(),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]);

  // Verify that Prisma create was not called
  expect(createMock.mock.calls.length).toBe(0);
});

test("handles EventSource errors", async () => {
  // Mock EventSource for this test
  mock.module("eventsource", () => ({
    EventSource: class MockEventSource {
      _onerror: ((event: any) => void) | null = null;

      constructor(url: string) {}

      set onerror(handler: ((event: any) => void) | null) {
        this._onerror = handler;
        // Simulate an error after a short delay
        if (handler) {
          setTimeout(() => {
            handler({
              type: "error",
            });
          }, 100);
        }
      }

      close() {}
    },
  }));

  // Run main function and wait for error handling
  await Promise.race([
    main(),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]);

  // Test passes if we reach here without throwing
  expect(true).toBe(true);
});
