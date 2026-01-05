import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { router } from "@/router";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";

const handler = new OpenAPIHandler(router, {
    interceptors: [
        onError((error) => {
            console.error(error);
        }),
    ],
    plugins: [
        new OpenAPIReferencePlugin({
            schemaConverters: [new ZodToJsonSchemaConverter()],
            specGenerateOptions: {
                info: {
                    title: "Next.js Starter Kit",
                    version: "1.0.0",
                },
            },
        }),
    ],
});

async function handleRequest(request: Request) {
    const { response } = await handler.handle(request, {
        prefix: "/api",
        context: {
            headers: request.headers,
        },
    });

    return response ?? new Response("Not found", { status: 404 });
}

export const HEAD = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;

