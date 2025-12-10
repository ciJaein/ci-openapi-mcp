import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export const configSchema = z.object({
  baseUrl: z
    .string()
    .default("https://demo-api.cyber-i.com")
    .describe("API base URL (예: https://demo-api.cyber-i.com)"),
  authKey: z
    .string()
    .default("19295064DEBE4954B259E16A49D2F15711540431")
    .describe("요청 헤더 AUTH_KEY 값 (필요 없으면 비워도 됨)"),
  timeoutMs: z.number().default(5000).describe("HTTP timeout (ms)"),
});

export default function createStatelessServer({
  config,
}: {
  config: z.infer<typeof configSchema>;
}) {
  const server = new McpServer({
    name: "cyber-mcp-demo",
    version: "1.0.0",
  });

  // 공통 GET 호출 유틸
  async function makeCyberGetRequest(
    endpoint: string,
    params?: Record<string, string>
  ) {
    const url = new URL(`${config.baseUrl}${endpoint}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.append(key, value);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      config.timeoutMs ?? 5000
    );

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(config.authKey ? { AUTH_KEY: config.authKey } : {}),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch ${endpoint}: ${response.status} ${response.statusText}`
        );
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // 1) getUserInfo(clientId)
  server.tool(
    "getUserInfo",
    "clientId로 사용자 정보를 조회합니다.",
    {
      clientId: z.string().describe("조회할 clientId (예: test26)"),
    },
    async ({ clientId }) => {
      try {
        const data = await makeCyberGetRequest("/svc/mcp/getUserInfo", {
          clientId,
        });
        const list = data?.OutBlock_1 ?? [];

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ users: list }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching user info: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 2) getClient()
  server.tool(
    "getClient",
    "등록된 클라이언트 목록을 조회합니다. [BUILD-TEST-001]",
    {},
    async () => {
      try {
        const data = await makeCyberGetRequest("/svc/mcp/getClient");
        const list = data?.OutBlock_1 ?? [];

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ clients: list }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching clients: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 3) getApiPath()
  server.tool(
    "getApiPath",
    "API Path(메뉴/경로) 목록을 조회합니다.",
    {},
    async () => {
      try {
        const data = await makeCyberGetRequest("/svc/mcp/apipath");
        const list = data?.OutBlock_1 ?? [];

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ paths: list }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching api paths: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server.server;
}
