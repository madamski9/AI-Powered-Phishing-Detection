import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STATS_KEY = '@scan_stats'

interface Stats {
    scanned: number
    threats: number
}

interface StatsContextValue {
    stats: Stats
    recordScan: (isThreat: boolean) => void
}

const StatsContext = createContext<StatsContextValue | undefined>(undefined)

export function StatsProvider({ children }: { children: ReactNode }) {
    const [stats, setStats] = useState<Stats>({ scanned: 0, threats: 0 })

    useEffect(() => {
        AsyncStorage.getItem(STATS_KEY).then(raw => {
            if (!raw) return
            try {
                setStats(JSON.parse(raw))
            } catch {}
        })
    }, [])

    const recordScan = useCallback((isThreat: boolean) => {
        setStats(prev => {
            const updated: Stats = {
                scanned: prev.scanned + 1,
                threats: prev.threats + (isThreat ? 1 : 0),
            }
            AsyncStorage.setItem(STATS_KEY, JSON.stringify(updated))
            return updated
        })
    }, [])

    const value = useMemo<StatsContextValue>(() => ({ stats, recordScan }), [stats, recordScan])

    return React.createElement(StatsContext.Provider, { value }, children)
}

export function useStats(): StatsContextValue {
    const ctx = useContext(StatsContext)
    if (!ctx) throw new Error('useStats must be used within StatsProvider')
    return ctx
}
