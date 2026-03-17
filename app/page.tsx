'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Item = {
  id: number
  item_name: string
  category: string | null
  price: number
  is_pinned: boolean
}

const ITEMS_PER_PAGE = 20

export default function Home() {
  const [items, setItems] = useState<Item[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      localStorage.setItem('pricelist', JSON.stringify(items))
    }
  }, [items, loading])

  useEffect(() => {
    async function init() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const cached = localStorage.getItem('pricelist')
      if (cached){
        setItems(JSON.parse(cached))
        setLoading(false)
      }

      // initial fetch
      const { data } = await supabase.from('pricelist').select('*')
      if (data) {
        setItems(data ?? [])
        localStorage.setItem('pricelist', JSON.stringify(data))
        setLoading(false)
      }

      // Real time listener
      const channel = supabase
        .channel('pricelist-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'pricelist'
        }, (payload) => {
          if (payload.eventType === 'INSERT'){
            setItems(prev => [...prev, payload.new as Item])
          }
          if (payload.eventType === 'UPDATE'){
            setItems(prev => prev.map(item => 
              item.id === (payload.new as Item).id ? payload.new as Item : item))
          }
          if (payload.eventType === 'DELETE'){
            setItems(prev => prev.filter(item => item.id !== (payload.old as Item).id))
          }
        }).subscribe()

        // Cleanup on unmount
        return () => {
          supabase.removeChannel(channel)
        }
    }
    init()
  }, [])

  // Sort: pinned items first, then the rest
  // const sorted = [
  //   ...items.filter(item => item.is_pinned === true).sort((a, b) => a.item_name.localeCompare(b.item_name)),
  //   ...items.filter(item => item.is_pinned !== true).sort((a, b) => a.item_name.localeCompare(b.item_name))
  // ]

  function sortItems(a: Item, b: Item) {
    const catA = a.category
    const catB = b.category

    if (catA === null && catB !== null) return 1
    if (catA !== null && catB === null) return -1
    if (catA !== null && catB !== null && catA !== catB) {
      return catA.localeCompare(catB)
    }
    return a.item_name.localeCompare(b.item_name)
  }

  const sorted = [
    ...items.filter(item => item.is_pinned === true).sort(sortItems),
    ...items.filter(item => item.is_pinned !== true).sort(sortItems)
  ]

  // Filter by search query
  const filtered = sorted.filter(item =>
    item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.category?.toLowerCase() ?? '').includes(searchQuery.toLowerCase())
  )

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset to page 1 when search query changes
  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
  }

  if (loading) return null

  return (
    <main style={{ padding: '16px' }}>
      <h1 style={{ marginBottom: '16px' }}>RMQ</h1>

      <input
        type="text"
        placeholder="Search items..."
        value={searchQuery}
        onChange={handleSearch}
        style={{ marginBottom: '16px' }}
      />

      <table>
        <thead>
          <tr>
            <th>Item Name</th>
            <th>Category</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map(item => (
            <tr key={item.id}>
              <td>{item.item_name}</td>
              <td>{item.category ?? '-'}</td>
              <td>₱{item.price}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
          <button
            onClick={() => setCurrentPage(p => p - 1)}
            disabled={currentPage === 1}
            style={{ width: 'auto', padding: '8px 16px' }}
          >
            ← Prev
          </button>
          <span style={{ color: 'var(--text-secondary)' }}>
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={currentPage === totalPages}
            style={{ width: 'auto', padding: '8px 16px' }}
          >
            Next →
          </button>
        </div>
      )}
    </main>
  )
}