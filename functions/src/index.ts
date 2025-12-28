import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// Define the proxy function
export const apiProxy = onRequest({ cors: true }, async (req, res) => {
    // Log the incoming path for debugging
    logger.info("Proxy Request:", { path: req.path, method: req.method });

    try {
        let targetUrl = "";
        let pathRemaining = req.path;

        // Determine target based on path prefix
        // The rewrite in firebase.json will send /api/... here
        // But the function might see the full path or stripped path depending on configuration.
        // Assuming rewrite: source: "/api/**", function: "apiProxy"
        // The req.path usually preserves the full path.

        if (req.path.startsWith("/api/perplexity")) {
            pathRemaining = req.path.replace("/api/perplexity", "");
            targetUrl = `https://api.perplexity.ai${pathRemaining}`;
        } else if (req.path.startsWith("/api/gemini")) {
            pathRemaining = req.path.replace("/api/gemini", "");
            // Handle Gemini query params (API key)
            const queryString = req.url.split('?')[1] || "";
            targetUrl = `https://generativelanguage.googleapis.com${pathRemaining}${queryString ? `?${queryString}` : ""}`;
        } else {
            res.status(404).json({ error: "Unknown proxy target" });
            return;
        }

        logger.info("Forwarding to:", targetUrl);

        // Prepare fetch options
        const fetchOptions: RequestInit = {
            method: req.method,
            headers: {
                "Content-Type": "application/json",
                // Forward Authorization header if present
                ...(req.headers.authorization ? { "Authorization": req.headers.authorization } : {})
            },
            // Forward body for POST/PUT
            ...(req.method !== "GET" && req.method !== "HEAD" ? { body: JSON.stringify(req.body) } : {})
        };

        const response = await fetch(targetUrl, fetchOptions);

        // Handle response
        if (!response.ok) {
            const errorText = await response.text();
            logger.error("Upstream API Error:", { status: response.status, body: errorText });
            res.status(response.status).send(errorText);
            return;
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        logger.error("Proxy Internal Error:", error);
        res.status(500).json({ error: "Internal Proxy Error", details: error instanceof Error ? error.message : String(error) });
    }
});
