import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    query,
    where,
    orderBy,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { PerplexityPrompt } from '../types';

// Helper to convert Firestore timestamp to number
const timestampToNumber = (timestamp: any): number => {
    if (timestamp?.toMillis) {
        return timestamp.toMillis();
    }
    return timestamp || Date.now();
};

// Perplexity Research Service
export const perplexityService = {
    /**
     * Find existing research for a given topic
     */
    async findExistingResearch(userId: string, topic: string): Promise<PerplexityPrompt[]> {
        const researchRef = collection(db, 'users', userId, 'perplexityPrompts');
        const q = query(
            researchRef,
            where('topic', '==', topic),
            orderBy('revisionId', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            createdAt: timestampToNumber(doc.data().createdAt),
        } as PerplexityPrompt));
    },

    /**
     * Get all research revisions for a topic
     */
    async getResearchRevisions(userId: string, topic: string): Promise<PerplexityPrompt[]> {
        return this.findExistingResearch(userId, topic);
    },

    /**
     * Create new research entry
     */
    async createResearch(
        userId: string,
        prompt: string,
        response: string,
        topic: string
    ): Promise<string> {
        const researchRef = collection(db, 'users', userId, 'perplexityPrompts');

        // Find existing research to determine next revision ID
        const existing = await this.findExistingResearch(userId, topic);
        const nextRevisionId = existing.length > 0
            ? Math.max(...existing.map(r => r.revisionId)) + 1
            : 1;

        const docRef = await addDoc(researchRef, {
            prompt,
            response,
            topic,
            revisionId: nextRevisionId,
            createdAt: Timestamp.fromMillis(Date.now()),
        });

        return docRef.id;
    },

    /**
     * Get specific research by ID
     */
    async getResearchById(userId: string, researchId: string): Promise<PerplexityPrompt | null> {
        const researchRef = doc(db, 'users', userId, 'perplexityPrompts', researchId);
        const snapshot = await getDoc(researchRef);

        if (!snapshot.exists()) return null;

        return {
            ...snapshot.data(),
            id: snapshot.id,
            createdAt: timestampToNumber(snapshot.data().createdAt),
        } as PerplexityPrompt;
    },

    /**
     * Get all research for a user
     */
    async getAllResearch(userId: string): Promise<PerplexityPrompt[]> {
        const researchRef = collection(db, 'users', userId, 'perplexityPrompts');
        const q = query(researchRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            createdAt: timestampToNumber(doc.data().createdAt),
        } as PerplexityPrompt));
    },
};
