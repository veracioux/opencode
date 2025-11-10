import { ensureXdgDirs } from "./fixture/fixture"

// Make tests more deterministic
process.env.USER = "test-user"
process.env.TZ = "Etc/UTC"

// Protect the user's real home
await ensureXdgDirs()
