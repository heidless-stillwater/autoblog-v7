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
            const queryString = req.url.split('?')[1] || "";
            targetUrl = `https://generativelanguage.googleapis.com${pathRemaining}${queryString ? `?${queryString}` : ""}`;
        } else if (req.path.startsWith("/api/claude")) {
            pathRemaining = req.path.replace("/api/claude", "");
            targetUrl = `https://api.anthropic.com${pathRemaining}`;
        } else if (req.path.startsWith("/api/openai")) {
            pathRemaining = req.path.replace("/api/openai", "");
            targetUrl = `https://api.openai.com${pathRemaining}`;
        } else if (req.path.startsWith("/api/brave")) {
            pathRemaining = req.path.replace("/api/brave", "");
            targetUrl = `https://api.search.brave.com${pathRemaining}`;
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
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Initialize admin app if not already initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}

export const checkScheduledArticles = onSchedule("every 1 minutes", async (event) => {
    logger.info("Running scheduled article check...");
    const now = Date.now();
    const db = getFirestore('autoblog-db-0');

    try {
        // Query for articles that are scheduled and due
        // Note: Collection Group queries require an index, ensuring we catch articles across all users if needed
        // For now assuming a single tenancy or simple collection structure.
        // If 'articles' are subcollections of users, collectionGroup is correct.
        const snapshot = await db.collectionGroup('articles')
            .where('status', '==', 'scheduled')
            .where('scheduleDate', '<=', Timestamp.fromMillis(now))
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

/**
 * Topic Queue Processing Job
 * Checks for topicQueueSnapshots where genDate <= now AND status == 'pending'
 */
export const processQueue = onSchedule("every 1 minutes", async (event) => {
    logger.info("Running Topic Queue processing check...");
    const now = Date.now();
    const db = getFirestore('autoblog-db-0');

    try {
        const snapshot = await db.collectionGroup('topicQueueSnapshots')
            .where('status', '==', 'pending')
            .where('genDate', '<=', Timestamp.fromMillis(now))
            .get();

        if (snapshot.empty) {
            logger.info("No pending queues due for processing.");
            return;
        }

        logger.info(`Found ${snapshot.size} queues to process.`);

        for (const snapDoc of snapshot.docs) {
            const data = snapDoc.data();
            const queue = data.queue as string[] || [];
            const userId = snapDoc.ref.path.split('/')[1]; // Get userId from path: users/{userId}/topicQueueSnapshots/{id}

            logger.info(`Processing queue for user ${userId}: ${snapDoc.id}`);

            // Update status to processing
            await snapDoc.ref.update({
                status: 'processing',
                updatedAt: Timestamp.now()
            });

            // Process each topic
            for (const topic of queue) {
                const logRef = db.collection('users').doc(userId).collection('queueLogs').doc();
                await logRef.set({
                    topic,
                    timestamp: Timestamp.now(),
                    status: 'processing',
                    snapshotId: snapDoc.id,
                    type: 'background'
                });

                // Simulate processing time
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Mark topic as completed in logs
                await logRef.update({
                    status: 'completed',
                    completedAt: Timestamp.now()
                });
            }

            // Mark snapshot as completed
            await snapDoc.ref.update({
                status: 'completed',
                processedAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
        }

        logger.info(`Successfully processed ${snapshot.size} topic queues.`);

    } catch (error) {
        logger.error("Error executing processQueue job:", error);
    }
});

/**
 * Manual Trigger for Topic Queue Processing (for testing)
 */
export const forceProcessQueue = onRequest({ cors: true }, async (req, res) => {
    logger.info("Manually triggering Topic Queue processing...");
    const now = Date.now();
    const db = getFirestore('autoblog-db-0');

    try {
        const snapshot = await db.collectionGroup('topicQueueSnapshots')
            .where('status', '==', 'pending')
            .where('genDate', '<=', Timestamp.fromMillis(now))
            .get();

        if (snapshot.empty) {
            res.json({ success: true, message: "No pending queues due for processing.", count: 0 });
            return;
        }

        // Use individual updates instead of batch to support log writes
        for (const snapDoc of snapshot.docs) {
            const data = snapDoc.data();
            const queue = data.queue as string[] || [];
            const userId = snapDoc.ref.path.split('/')[1];

            await snapDoc.ref.update({
                status: 'processing',
                updatedAt: Timestamp.now()
            });

            for (const topic of queue) {
                const logRef = db.collection('users').doc(userId).collection('queueLogs').doc();
                await logRef.set({
                    topic,
                    timestamp: Timestamp.now(),
                    status: 'processing',
                    snapshotId: snapDoc.id,
                    type: 'manual_force'
                });

                await new Promise(resolve => setTimeout(resolve, 1000));

                await logRef.update({ status: 'completed' });
            }

            await snapDoc.ref.update({
                status: 'completed',
                processedAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
        }

        res.json({ success: true, message: `Successfully processed ${snapshot.size} topic queues.`, count: snapshot.size });

    } catch (error) {
        logger.error("Error in forceProcessQueue:", error);
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
