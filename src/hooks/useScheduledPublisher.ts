import { useEffect, useRef } from 'react';
import { useStore } from '../store';

/**
 * A hook that polls for scheduled articles and publishes them if they are due.
 * This acts as a client-side backup/alternative to the Cloud Function,
 * ensuring articles go live while an admin is using the dashboard.
 */
export const useScheduledPublisher = (intervalMs: number = 30000) => {
    const { articles, updateArticle } = useStore();
    const articlesRef = useRef(articles);

    // Keep ref updated to avoid stale closures in interval
    useEffect(() => {
        articlesRef.current = articles;
    }, [articles]);

    useEffect(() => {
        const checkSchedule = async () => {
            const now = Date.now();
            const pendingArticles = articlesRef.current.filter(
                a => a.status === 'scheduled' && a.scheduleDate && a.scheduleDate <= now
            );

            if (pendingArticles.length > 0) {
                console.log(`[ScheduledPublisher] Found ${pendingArticles.length} due articles. Publishing...`);

                for (const article of pendingArticles) {
                    try {
                        await updateArticle(article.id, {
                            status: 'published',
                            // We don't verify publishedAt in types yet, but good to have in DB
                            // @ts-ignore
                            publishedAt: now,
                            updatedAt: now
                        });
                        console.log(`[ScheduledPublisher] Published article: ${article.topic}`);
                    } catch (error) {
                        console.error(`[ScheduledPublisher] Failed to publish ${article.id}:`, error);
                    }
                }
            }
        };

        const timer = setInterval(checkSchedule, intervalMs);

        // Run immediately on mount to catch up
        checkSchedule();

        return () => clearInterval(timer);
    }, [intervalMs, updateArticle]);
};
