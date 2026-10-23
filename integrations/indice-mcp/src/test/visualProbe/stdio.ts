import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createVisualProbeServer } from "./tools.js";

// Optional private tunnel/Inspector entry point. Only fixed synthetic fixtures are exposed.
await createVisualProbeServer().connect(new StdioServerTransport());
