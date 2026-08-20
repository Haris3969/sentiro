import axios from 'axios'
import { supabase } from './supabase'

const baseURL = import.meta.env.VITE_API_URL as string

export const api = axios.create({ baseURL })

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface WatchlistItem {
  id: string
  ticker: string
  asset_type: 'stock' | 'crypto'
  created_at: string
}

export interface PricePoint {
  price: number
  change_pct: number | null
  volume: number | null
  fetched_at: string
}

export interface Insight {
  ticker: string
  asset_type: 'stock' | 'crypto'
  sentiment_score: number
  label: string
  narrative: string
  generated_at: string
  price: PricePoint | null
  /** Change vs. the closest snapshot ~24h ago; null when there's no prior one. */
  score_delta_24h: number | null
}

export type SeriesRange = '1D' | '1W' | '1M' | '3M' | '1Y'

export interface SeriesPoint {
  bucket: string
  avg_score: number
  min_score: number
  max_score: number
  avg_price: number | null
  sample_count: number
}

export interface SentimentSeries {
  ticker: string
  range: SeriesRange
  points: SeriesPoint[]
}

export interface NewsItem {
  id: string
  title: string
  source: string | null
  url: string
  published_at: string | null
  sentiment_score: number | null
  summary: string | null
}

export async function fetchWatchlist(): Promise<WatchlistItem[]> {
  const { data } = await api.get<WatchlistItem[]>('/watchlist')
  return data
}

export async function addWatchlistItem(
  ticker: string,
  assetType: 'stock' | 'crypto',
): Promise<WatchlistItem> {
  const { data } = await api.post<WatchlistItem>('/watchlist', {
    ticker,
    asset_type: assetType,
  })
  return data
}

export async function removeWatchlistItem(id: string): Promise<void> {
  await api.delete(`/watchlist/${id}`)
}

export async function fetchInsight(ticker: string): Promise<Insight | null> {
  try {
    const { data } = await api.get<Insight>(`/insights/${ticker}`)
    return data
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null
    }
    throw err
  }
}

export async function fetchPriceHistory(ticker: string): Promise<PricePoint[]> {
  const { data } = await api.get<PricePoint[]>(`/prices/${ticker}`)
  return data
}

export async function fetchSentimentSeries(
  ticker: string,
  range: SeriesRange,
): Promise<SentimentSeries> {
  const { data } = await api.get<SentimentSeries>(`/insights/${ticker}/series`, {
    params: { range },
  })
  return data
}

export async function fetchNews(ticker: string, limit = 5, offset = 0): Promise<NewsItem[]> {
  const { data } = await api.get<NewsItem[]>(`/news/${ticker}`, { params: { limit, offset } })
  return data
}

export async function askAI(question: string): Promise<string> {
  const { data } = await api.post<{ answer: string }>('/ask', { question }, { timeout: 45000 })
  return data.answer
}
