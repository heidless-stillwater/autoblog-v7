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

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

// Initialize admin app if not already initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}

export const checkScheduledArticles = onSchedule("every 1 minutes", async (event) => {
    logger.info("Running scheduled article check...");
    const now = Date.now();
    const db = admin.firestore();

    try {
        // Query for articles that are scheduled and due
        // Note: Collection Group queries require an index, ensuring we catch articles across all users if needed
        // For now assuming a single tenancy or simple collection structure.
        // If 'articles' are subcollections of users, collectionGroup is correct.
        const snapshot = await db.collectionGroup('articles')
            .where('status', '==', 'scheduled')
            .where('scheduleDate', '<=', now)
            .get();

        if (snapshot.empty) {
            logger.info("No scheduled articles found due for publication.");
            return;
        }

        logger.info(`Found ${snapshot.size} articles to publish.`);

        const batch = db.batch();
        let count = 0;

        snapshot.docs.forEach(doc => {
            const articleRef = doc.ref;
            batch.update(articleRef, {
                status: 'published',
                publishedAt: now,
                updatedAt: now
            });
            count++;
        });

        await batch.commit();
        logger.info(`Successfully published ${count} articles.`);

    } catch (error) {
        logger.error("Error executing scheduled publish:", error);
    }
});
