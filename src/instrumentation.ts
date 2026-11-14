// Runs once when the Next.js server starts, before it handles any request (doc 02, E13).
// This file is also compiled for the Edge runtime, so the Node.js-only check lives in
// instrumentation-node.ts and is loaded only on Node.js.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node')
  }
}
