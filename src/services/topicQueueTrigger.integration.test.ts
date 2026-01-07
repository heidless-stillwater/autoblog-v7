import { describe, it, expect } from 'vitest';
import { topicQueueService } from './firestoreService';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

describe('Topic Queue Trigger Integration', () => {
    // Isolated user ID for this test run
    const userId = 'test-user-trigger-' + Date.now();

    it('processes a pending snapshot when genDate is in the past', async () => {
        console.log('--- Testing Topic Queue Trigger Job ---');

        // 1. Create a snapshot due now (set genDate to 5 seconds ago)
        const pastGenDate = Date.now() - 5000;
        const snapshotId = await topicQueueService.saveSnapshot(userId, ['Topic A', 'Topic B'], 'integration-test', pastGenDate);

        console.log(`[Test] Created snapshot ${snapshotId} with genDate: ${new Date(pastGenDate).toISOString()}`);

        // 2. Trigger the processing manually via HTTPS
        // This is much faster and more reliable than waiting for the emulator schedule
        console.log('[Test] Triggering forceProcessQueue...');
        try {
            const triggerUrl = 'http://127.0.0.1:5001/heidless-firebase/us-central1/forceProcessQueue';
            const triggerResponse = await fetch(triggerUrl, { method: 'POST' });
            const triggerResult = await triggerResponse.json();
            console.log('[Test] Trigger result:', triggerResult);
        } catch (error) {
            console.error('[Test] Failed to trigger forceProcessQueue:', error);
        }

        // 3. Poll for the status change
        let processed = false;
        const pollInterval = 2000; // 2 seconds is enough now that we forced it
        const maxAttempts = 5;

        console.log('[Test] Verifying status update in Firestore...');

        for (let i = 0; i < maxAttempts; i++) {
            console.log(`[Test] Poll attempt ${i + 1}/${maxAttempts}...`);

            // Wait first to give the job time to run
            await new Promise(resolve => setTimeout(resolve, pollInterval));

            const docRef = doc(db, 'users', userId, 'topicQueueSnapshots', snapshotId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log(`[Test] Current status: ${data.status}`);

                if (data.status === 'completed') {
                    processed = true;
                    console.log('[Test] Trigger job SUCCESS: Snapshot marked as completed!');
                    break;
                }
            } else {
                console.log('[Test] Document not found yet...');
            }
        }

        expect(processed, 'The background job did not process the snapshot within the timeout period.').toBe(true);
    }, 120000); // 120s timeout for the entire test
});
