import { supabase } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

// Types for realtime sync
export interface LiveState {
    liveItemId: string | null;
    liveSlideIndex: number;
    activeItemId: string | null;
    activeSlideIndex: number;
    isPreviewHidden: boolean;
    isTextHidden: boolean;
    isLogoActive: boolean;
    showSplitScreen: boolean;
    isKaraokeActive: boolean;
    karaokeIndex: number;
    lastUpdated: string;
    // Command from mobile to main
    command?: 'next' | 'prev' | 'blackout' | 'clear' | 'logo' | 'go_live' | null;
}

export interface RealtimeSyncService {
    subscribe: (userId: string, onStateChange: (state: LiveState) => void) => void;
    updateState: (userId: string, state: Partial<LiveState>) => Promise<void>;
    sendCommand: (userId: string, command: LiveState['command']) => Promise<void>;
    unsubscribe: () => void;
    isConnected: () => boolean;
}

let channel: RealtimeChannel | null = null;
let isSubscribed = false;

export const createRealtimeSyncService = (): RealtimeSyncService => {
    return {
        subscribe: (userId: string, onStateChange: (state: LiveState) => void) => {
            if (channel) {
                channel.unsubscribe();
            }

            channel = supabase
                .channel(`realtime_sync:${userId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'realtime_sync',
                        filter: `user_id=eq.${userId}`
                    },
                    (payload) => {
                        if (payload.new && (payload.new as any).live_state) {
                            onStateChange((payload.new as any).live_state as LiveState);
                        }
                    }
                )
                .subscribe((status) => {
                    isSubscribed = status === 'SUBSCRIBED';
                    console.log('Realtime sync status:', status);
                });
        },

        updateState: async (userId: string, state: Partial<LiveState>) => {
            try {
                // First try to get existing state
                const { data: existing } = await supabase
                    .from('realtime_sync')
                    .select('live_state')
                    .eq('user_id', userId)
                    .single();

                const existingState = (existing?.live_state as LiveState) || {
                    liveItemId: null,
                    liveSlideIndex: -1,
                    activeItemId: null,
                    activeSlideIndex: -1,
                    isPreviewHidden: false,
                    isTextHidden: false,
                    isLogoActive: false,
                    showSplitScreen: false,
                    isKaraokeActive: false,
                    karaokeIndex: -1,
                    lastUpdated: new Date().toISOString()
                };

                const newState: LiveState = {
                    ...existingState,
                    ...state,
                    lastUpdated: new Date().toISOString(),
                    command: null // Clear any pending command after processing
                };

                const { error } = await supabase
                    .from('realtime_sync')
                    .upsert({
                        user_id: userId,
                        live_state: newState,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });

                if (error) {
                    console.error('Error updating realtime state:', error);
                }
            } catch (e) {
                console.error('Realtime sync error:', e);
            }
        },

        sendCommand: async (userId: string, command: LiveState['command']) => {
            try {
                const { data: existing } = await supabase
                    .from('realtime_sync')
                    .select('live_state')
                    .eq('user_id', userId)
                    .single();

                const existingState = (existing?.live_state as LiveState) || {
                    liveItemId: null,
                    liveSlideIndex: -1,
                    activeItemId: null,
                    activeSlideIndex: -1,
                    isPreviewHidden: false,
                    isTextHidden: false,
                    isLogoActive: false,
                    showSplitScreen: false,
                    isKaraokeActive: false,
                    karaokeIndex: -1,
                    lastUpdated: new Date().toISOString()
                };

                const newState: LiveState = {
                    ...existingState,
                    command,
                    lastUpdated: new Date().toISOString()
                };

                const { error } = await supabase
                    .from('realtime_sync')
                    .upsert({
                        user_id: userId,
                        live_state: newState,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });

                if (error) {
                    console.error('Error sending command:', error);
                }
            } catch (e) {
                console.error('Command send error:', e);
            }
        },

        unsubscribe: () => {
            if (channel) {
                channel.unsubscribe();
                channel = null;
                isSubscribed = false;
            }
        },

        isConnected: () => isSubscribed
    };
};

// Action History Service
export interface ActionHistoryEntry {
    id?: string;
    user_id?: string;
    action_type: string;
    description: string;
    metadata?: Record<string, any>;
    created_at?: string;
}

export const actionHistoryService = {
    async log(userId: string | undefined, actionType: string, description: string, metadata?: Record<string, any>) {
        const entry: ActionHistoryEntry = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            user_id: userId || 'local',
            action_type: actionType,
            description,
            metadata: metadata || {},
            created_at: new Date().toISOString()
        };

        // Always save to localStorage as immediate feedback/fallback
        try {
            const localHistory = JSON.parse(localStorage.getItem('oasis_action_history') || '[]');
            localStorage.setItem('oasis_action_history', JSON.stringify([entry, ...localHistory].slice(0, 100)));
        } catch (e) {
            console.error('Local history save error:', e);
        }

        // If logged in, also save to Supabase
        if (userId && userId !== 'local') {
            try {
                const { error } = await supabase
                    .from('action_history')
                    .insert({
                        user_id: userId,
                        action_type: actionType,
                        description,
                        metadata: metadata || {}
                    });

                if (error) {
                    console.error('Error logging action to cloud:', error);
                }
            } catch (e) {
                console.error('Cloud action log error:', e);
            }
        }
    },

    async getHistory(userId: string | undefined, limit: number = 50): Promise<ActionHistoryEntry[]> {
        let history: ActionHistoryEntry[] = [];

        // 1. Get from localStorage
        try {
            const localData = JSON.parse(localStorage.getItem('oasis_action_history') || '[]');
            history = localData;
        } catch (e) {
            console.error('Local history fetch error:', e);
        }

        // 2. If logged in, try to fetch from cloud and merge/sync
        if (userId && userId !== 'local') {
            try {
                const { data, error } = await supabase
                    .from('action_history')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (!error && data) {
                    // Combine and sort by date, removing duplicates by ID if they exist
                    const combined = [...data, ...history];
                    const unique = Array.from(new Map(combined.map(item => [item.id || item.created_at, item])).values());
                    history = (unique as ActionHistoryEntry[])
                        .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
                        .slice(0, limit);
                }
            } catch (e) {
                console.error('Cloud history fetch error:', e);
            }
        }

        return history.slice(0, limit);
    },

    async clearHistory(userId: string | undefined) {
        // Clear local
        localStorage.removeItem('oasis_action_history');

        // Clear cloud if logged in
        if (userId && userId !== 'local') {
            try {
                await supabase
                    .from('action_history')
                    .delete()
                    .eq('user_id', userId);
            } catch (e) {
                console.error('History clear error:', e);
            }
        }
    }
};

// Singleton instance
export const realtimeSyncService = createRealtimeSyncService();
