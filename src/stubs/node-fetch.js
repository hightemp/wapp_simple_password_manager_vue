// Stub for node-fetch — browsers use native globalThis.fetch
// @octokit/request imports node-fetch as a fallback but prefers globalThis.fetch
export default globalThis.fetch.bind(globalThis)
export const Headers = globalThis.Headers
export const Request = globalThis.Request
export const Response = globalThis.Response
