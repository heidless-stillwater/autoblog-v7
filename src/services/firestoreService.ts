import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    setDoc,
    limit,
    onSnapshot,
    QuerySnapshot,
    writeBatch,
    type DocumentData
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Post, MediaItem, Settings, Article, TopicSet, ImagePrompt, TopicQueueSnapshot, GenHistory } from '../types';

// Helper to convert Firestore timestamp to number
const timestampToNumber = (timestamp: any): number => {
    if (timestamp?.toMillis) {
        return timestamp.toMillis();
    }
    return timestamp || Date.now();
};

// Posts Service
export const postsService = {
    async getAll(userId: string): Promise<Post[]> {
        const postsRef = collection(db, 'users', userId, 'posts');
        const q = query(postsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            createdAt: timestampToNumber(doc.data().createdAt),
            updatedAt: timestampToNumber(doc.data().updatedAt)
        } as Post));
    },

    async getById(userId: string, postId: string): Promise<Post | null> {
        const postRef = doc(db, 'users', userId, 'posts', postId);
        const snapshot = await getDoc(postRef);
        if (!snapshot.exists()) return null;
        return {
            ...snapshot.data(),
            id: snapshot.id,
            createdAt: timestampToNumber(snapshot.data().createdAt),
            updatedAt: timestampToNumber(snapshot.data().updatedAt)
        } as Post;
    },

    async create(userId: string, post: Omit<Post, 'id'>): Promise<string> {
        const postsRef = collection(db, 'users', userId, 'posts');
        const docRef = await addDoc(postsRef, {
            ...post,
            createdAt: Timestamp.fromMillis(post.createdAt),
            updatedAt: Timestamp.fromMillis(post.updatedAt)
        });
        return docRef.id;
    },

    async update(userId: string, postId: string, updates: Partial<Post>): Promise<void> {
        const postRef = doc(db, 'users', userId, 'posts', postId);
        const updateData: any = { ...updates };
        if (updateData.createdAt) {
            updateData.createdAt = Timestamp.fromMillis(updateData.createdAt);
        }
        if (updateData.updatedAt) {
            updateData.updatedAt = Timestamp.fromMillis(updateData.updatedAt);
        }
        await updateDoc(postRef, updateData);
    },

    async delete(userId: string, postId: string): Promise<void> {
        const postRef = doc(db, 'users', userId, 'posts', postId);
        await deleteDoc(postRef);
    }
};

// Media Service
export const mediaService = {
    async getAll(userId: string): Promise<MediaItem[]> {
        const mediaRef = collection(db, 'users', userId, 'media');
        const q = query(mediaRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            createdAt: timestampToNumber(doc.data().createdAt)
        } as MediaItem));
    },

    async create(userId: string, item: Omit<MediaItem, 'id'>): Promise<string> {
        const mediaRef = collection(db, 'users', userId, 'media');
        const docRef = await addDoc(mediaRef, {
            ...item,
            createdAt: Timestamp.fromMillis(item.createdAt)
        });
        return docRef.id;
    },

    async update(userId: string, itemId: string, updates: Partial<MediaItem>): Promise<void> {
        const itemRef = doc(db, 'users', userId, 'media', itemId);
        const updateData: any = { ...updates };
        if (updateData.createdAt) {
            updateData.createdAt = Timestamp.fromMillis(updateData.createdAt);
        }
        await updateDoc(itemRef, updateData);
    },

    async delete(userId: string, itemId: string): Promise<void> {
        const itemRef = doc(db, 'users', userId, 'media', itemId);
        await deleteDoc(itemRef);
    }
};

// Settings Service
export const settingsService = {
    async get(userId: string): Promise<Settings | null> {
        const settingsRef = doc(db, 'users', userId, 'settings', 'userSettings');
        const snapshot = await getDoc(settingsRef);
        if (!snapshot.exists()) return null;
        return snapshot.data() as Settings;
    },

    async update(userId: string, settings: Settings): Promise<void> {
        const settingsRef = doc(db, 'users', userId, 'settings', 'userSettings');
        await setDoc(settingsRef, settings, { merge: true });
    }
};

// Articles Service
export const articlesService = {
    async getAll(userId: string): Promise<Article[]> {
        const articlesRef = collection(db, 'users', userId, 'articles');
        const q = query(articlesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            createdAt: timestampToNumber(doc.data().createdAt),
            updatedAt: timestampToNumber(doc.data().updatedAt),
            scheduleDate: doc.data().scheduleDate ? timestampToNumber(doc.data().scheduleDate) : undefined
        } as Article));
    },

    async create(userId: string, article: Omit<Article, 'id'>): Promise<string> {
        const articlesRef = collection(db, 'users', userId, 'articles');
        const docRef = await addDoc(articlesRef, {
            ...article,
            createdAt: Timestamp.fromMillis(article.createdAt),
            updatedAt: Timestamp.fromMillis(article.updatedAt),
            scheduleDate: article.scheduleDate ? Timestamp.fromMillis(article.scheduleDate) : null
        });
        return docRef.id;
    },

    async update(userId: string, articleId: string, updates: Partial<Article>): Promise<void> {
        const articleRef = doc(db, 'users', userId, 'articles', articleId);
        const updateData: any = { ...updates };
        if (updateData.createdAt) {
            updateData.createdAt = Timestamp.fromMillis(updateData.createdAt);
        }
        if (updateData.updatedAt) {
            updateData.updatedAt = Timestamp.fromMillis(updateData.updatedAt);
        }
        if (updateData.scheduleDate) {
            updateData.scheduleDate = Timestamp.fromMillis(updateData.scheduleDate);
        }
        await updateDoc(articleRef, updateData);
    },

    async delete(userId: string, articleId: string): Promise<void> {
        const articleRef = doc(db, 'users', userId, 'articles', articleId);
        await deleteDoc(articleRef);
    }
};

// Topic Sets Service
export const topicSetsService = {
    async getAll(userId: string): Promise<TopicSet[]> {
        const topicsRef = collection(db, 'users', userId, 'topicSets');
        const q = query(topicsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            createdAt: timestampToNumber(doc.data().createdAt)
        } as TopicSet));
    },

    async create(userId: string, topicSet: Omit<TopicSet, 'id'>): Promise<string> {
        const topicsRef = collection(db, 'users', userId, 'topicSets');
        const docRef = await addDoc(topicsRef, {
            ...topicSet,
            createdAt: Timestamp.fromMillis(topicSet.createdAt)
        });
        return docRef.id;
    },

    async update(userId: string, id: string, updates: Partial<TopicSet>): Promise<void> {
        const docRef = doc(db, 'users', userId, 'topicSets', id);
        const updateData: any = { ...updates };
        if (updateData.createdAt) {
            updateData.createdAt = Timestamp.fromMillis(updateData.createdAt);
        }
        await updateDoc(docRef, updateData);
    },

    delete(userId: string, id: string): Promise<void> {
        const docRef = doc(db, 'users', userId, 'topicSets', id);
        return deleteDoc(docRef);
    }
};

// Image Prompts Service
export const imagePromptsService = {
    async getAll(userId: string): Promise<ImagePrompt[]> {
        const promptsRef = collection(db, 'users', userId, 'imagePrompts');
        const q = query(promptsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            createdAt: timestampToNumber(doc.data().createdAt),
            updatedAt: timestampToNumber(doc.data().updatedAt)
        } as ImagePrompt));
    },

    async getByArticle(userId: string, articleId: string): Promise<ImagePrompt[]> {
        const promptsRef = collection(db, 'users', userId, 'imagePrompts');
        const q = query(promptsRef, where('articleId', '==', articleId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            createdAt: timestampToNumber(doc.data().createdAt),
            updatedAt: timestampToNumber(doc.data().updatedAt)
        } as ImagePrompt));
    },

    async create(userId: string, prompt: Omit<ImagePrompt, 'id'>): Promise<string> {
        const promptsRef = collection(db, 'users', userId, 'imagePrompts');
        const docRef = await addDoc(promptsRef, {
            ...prompt,
            createdAt: Timestamp.fromMillis(prompt.createdAt),
            updatedAt: Timestamp.fromMillis(prompt.updatedAt)
        });
        return docRef.id;
    },

    async update(userId: string, id: string, updates: Partial<ImagePrompt>): Promise<void> {
        const docRef = doc(db, 'users', userId, 'imagePrompts', id);
        const updateData: any = { ...updates };
        if (updateData.updatedAt) {
            updateData.updatedAt = Timestamp.fromMillis(updateData.updatedAt);
        }
        await updateDoc(docRef, updateData);
    },

    async delete(userId: string, id: string): Promise<void> {
        const docRef = doc(db, 'users', userId, 'imagePrompts', id);
        await deleteDoc(docRef);
    }
};

// Topic Queue Snapshots Service
export const topicQueueService = {
    async saveSnapshot(userId: string, queue: string[], customId: string = 'backup', genDate?: number): Promise<string> {
        const timestamp = Date.now();
        // Default genDate to 1 year from now if not provided
        const finalGenDate = genDate || (timestamp + (365 * 24 * 60 * 60 * 1000));

        // Sanitize customId to be safe for document IDs (alphanumeric and dashes/underscores)
        const safeId = customId.replace(/[^a-zA-Z0-9-_]/g, '-');
        const docId = `topicQueue-${safeId}-${timestamp}`;
        const docRef = doc(db, 'users', userId, 'topicQueueSnapshots', docId);

        await setDoc(docRef, {
            queue,
            createdAt: Timestamp.fromMillis(timestamp),
            genDate: Timestamp.fromMillis(finalGenDate),
            originalId: safeId,
            status: 'pending'
        });

        return docId;
    },

    async getAllSnapshots(userId: string): Promise<TopicQueueSnapshot[]> {
        const snapshotsRef = collection(db, 'users', userId, 'topicQueueSnapshots');
        const q = query(snapshotsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                queue: data.queue || [],
                createdAt: timestampToNumber(data.createdAt),
                genDate: timestampToNumber(data.genDate),
                status: data.status,
                processedAt: data.processedAt ? timestampToNumber(data.processedAt) : undefined
            };
        });
    },

    async updateSnapshot(userId: string, snapshotId: string, queue: string[], genDate?: number): Promise<void> {
        const docRef = doc(db, 'users', userId, 'topicQueueSnapshots', snapshotId);
        const updates: any = {
            queue,
            updatedAt: Timestamp.now(),
            status: 'pending' // Reset to pending so it re-processes if date was changed
        };
        if (genDate) {
            updates.genDate = Timestamp.fromMillis(genDate);
        }
        await updateDoc(docRef, updates);
    },

    async deleteSnapshot(userId: string, snapshotId: string): Promise<void> {
        const docRef = doc(db, 'users', userId, 'topicQueueSnapshots', snapshotId);
        await deleteDoc(docRef);
    },

    subscribeToQueueLogs(userId: string, callback: (logs: any[]) => void): () => void {
        const logsRef = collection(db, 'users', userId, 'queueLogs');
        const q = query(logsRef, orderBy('timestamp', 'asc'), limit(50));

        return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
            const logs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    timestamp: timestampToNumber(data.timestamp)
                };
            });
            callback(logs);
        });
    }
};

// Public Service (Cross-User Content)
import { collectionGroup } from 'firebase/firestore';
import type { PublicPost } from '../types';

export const publicService = {
    async getPublicContent(): Promise<PublicPost[]> {
        const postsQuery = query(
            collectionGroup(db, 'posts'),
            where('status', '==', 'live'),
            orderBy('createdAt', 'desc')
        );

        const articlesQuery = query(
            collectionGroup(db, 'articles'),
            where('status', '==', 'published'),
            orderBy('createdAt', 'desc')
        );

        const [postsSnap, articlesSnap] = await Promise.all([
            getDocs(postsQuery),
            getDocs(articlesQuery)
        ]);

        const posts = postsSnap.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            createdAt: timestampToNumber(doc.data().createdAt),
            updatedAt: timestampToNumber(doc.data().updatedAt)
        } as Post));

        const articles = articlesSnap.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            createdAt: timestampToNumber(doc.data().createdAt),
            updatedAt: timestampToNumber(doc.data().updatedAt),
            scheduleDate: doc.data().scheduleDate ? timestampToNumber(doc.data().scheduleDate) : undefined
        } as Article));

        const allContent = [...posts, ...articles].sort((a, b) => b.createdAt - a.createdAt);
        return allContent;
    }
};

// Users Service
export const usersService = {
    async updateFavorites(userId: string, favorites: string[]): Promise<void> {
        const favoritesRef = doc(db, 'users', userId, 'data', 'favorites');
        await setDoc(favoritesRef, { articleIds: favorites }, { merge: true });
    },

    async getFavorites(userId: string): Promise<string[]> {
        const favoritesRef = doc(db, 'users', userId, 'data', 'favorites');
        const snap = await getDoc(favoritesRef);
        return snap.exists() ? snap.data().articleIds || [] : [];
    }
};

// Generation History Service
export const genHistoryService = {
    async getAll(userId: string): Promise<GenHistory[]> {
        const historyRef = collection(db, 'users', userId, 'genHistory');
        const q = query(historyRef, orderBy('processDateTime', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            processDateTime: timestampToNumber(doc.data().processDateTime)
        } as GenHistory));
    },

    async create(userId: string, record: Omit<GenHistory, 'id'>): Promise<string> {
        const historyRef = collection(db, 'users', userId, 'genHistory');
        const docRef = await addDoc(historyRef, {
            ...record,
            processDateTime: Timestamp.fromMillis(record.processDateTime)
        });
        return docRef.id;
    },

    async update(userId: string, id: string, updates: Partial<GenHistory>): Promise<void> {
        const docRef = doc(db, 'users', userId, 'genHistory', id);
        const updateData: any = { ...updates };
        if (updateData.processDateTime) {
            updateData.processDateTime = Timestamp.fromMillis(updateData.processDateTime);
        }
        await updateDoc(docRef, updateData);
    },

    async delete(userId: string, id: string): Promise<void> {
        const docRef = doc(db, 'users', userId, 'genHistory', id);
        await deleteDoc(docRef);
    },

    async clearAll(userId: string): Promise<void> {
        const historyRef = collection(db, 'users', userId, 'genHistory');
        const snapshot = await getDocs(historyRef);

        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    },

    subscribe(userId: string, callback: (history: GenHistory[]) => void): () => void {
        const historyRef = collection(db, 'users', userId, 'genHistory');
        const q = query(historyRef, orderBy('processDateTime', 'desc'), limit(100));

        return onSnapshot(q, (snapshot) => {
            const history = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
                processDateTime: timestampToNumber(doc.data().processDateTime)
            } as GenHistory));
            callback(history);
        });
    }
};
