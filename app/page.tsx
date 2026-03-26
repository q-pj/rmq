'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Item = {
  id: number
  item_name: string
  category: string | null
  price: number
  is_pinned: boolean
}

type SelectedItem = {
  id: number
  item_name: string
  category: string | null
  price: number
}

const ITEMS_PER_PAGE = 20

export default function Home() {
  const [items, setItems] = useState<Item[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const router = useRouter()
  const [isManager, setIsManager] = useState(false)
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newItem, setNewItem] = useState({ item_name: '', category: '', price: '' })
  const [addErrors, setAddErrors] = useState({ item_name: '', price: ''})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null> (null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const isAddValid =
    newItem.item_name.trim() !== '' &&
    newItem.price !== '' &&
    parseFloat(newItem.price) > 0
  
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    const supabase = createClient()

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      setIsManager(user.email === 'quintelapj+manager@gmail.com')

      const cached = localStorage.getItem('pricelist')
      if (cached) {
        setItems(JSON.parse(cached))
        setLoading(false)
      }

      const { data } = await supabase.from('pricelist').select('*')
      if (data) {
        setItems(data)
        localStorage.setItem('pricelist', JSON.stringify(data))
        setLoading(false)
      }

      channel = supabase
        .channel('pricelist-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'pricelist'
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems(prev => [...prev, payload.new as Item])
          }
          if (payload.eventType === 'UPDATE') {
            setItems(prev => prev.map(item =>
              item.id === (payload.new as Item).id ? payload.new as Item : item))
          }
          if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(item => item.id !== (payload.old as Item).id))
          }
        }).subscribe()
    }

    init()

    async function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        const { data } = await supabase.from('pricelist').select('*')
        setItems(data ?? [])
      }
    }

    window.addEventListener('focus', handleVisibilityChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 👇 Now both channel and event listeners are cleaned up properly
    return () => {
      if (channel) supabase.removeChannel(channel)
      window.removeEventListener('focus', handleVisibilityChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  async function handleUpdate() {
    if (!selectedItem) return
    if (!selectedItem.price || selectedItem.price <= 0) return
    setIsUpdating(true)
    const supabase = createClient()

    const updatedCategory = selectedItem.category?.trim() === '' ? null : selectedItem.category  // 👈 add this

    await supabase.from('pricelist').update({
      category: updatedCategory,
      price: selectedItem.price,
    }).eq('id', selectedItem.id)

    setItems(items.map(item =>
      item.id === selectedItem.id ? { ...item, ...selectedItem, category: updatedCategory } : item  // 👈 updated
    ))
    setIsUpdating(false)
    setSelectedItem(null)
  }

  async function handleAdd() {
    const errors = { item_name: '', price: '' }

    if (newItem.item_name.trim() === '') {
      errors.item_name = 'Item name is required'
    }
    if (newItem.price === '' || parseFloat(newItem.price) <= 0) {
      errors.price = 'Price must be greater than 0'
    }

    setAddErrors(errors)
    if (errors.item_name || errors.price) return

    setIsSubmitting(true)

    const supabase = createClient()

    await supabase.from('pricelist').insert({
      item_name: newItem.item_name,
      category: newItem.category || null,
      price: parseFloat(newItem.price),
    })

    const { data } = await supabase.from('pricelist').select('*')
    setItems(data ?? [])

    setNewItem({ item_name: '', category: '', price: '' })
    setAddErrors({ item_name: '', price: '' })
    setIsSubmitting(false)
    setIsAdding(false)
  }

  async function handleDelete() {
    if (!selectedItem) return
    setIsDeleting(true)
    const supabase = createClient()

    await supabase.from('pricelist').delete().eq('id', selectedItem.id)

    setItems(items.filter(item => item.id !== selectedItem.id))
    setSelectedItem(null)
    setIsDeleting(false)
    showToast('Deleted successfully')
  }


  function openAddModal(){
    setNewItem({ item_name: '', category: '', price: '' })
    setAddErrors({ item_name: '', price: '' })
    setIsSubmitting(false)
    setIsAdding(true)
  }

  function showToast(message: string){
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

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

if (loading) return (
  <div style={{
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'var(--background)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  }}>
    <h1 style={{ fontSize: '48px', fontWeight: 'bold' }}>RMQ</h1>
    <div className="spinner" />
  </div>
)

  return (
    <main style={{ padding: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <h1>RMQ</h1>
      {isManager && (
        <button
          onClick={openAddModal}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'var(--green)',
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          +
        </button>
      )}
    </div>

    {/* Search Bar */}
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      <input
        ref={searchRef}
        type="text"
        placeholder="Search"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value)
          setCurrentPage(1)
        }}
        style={{ marginBottom: 0, flex: 1 }}
      />
      {searchQuery && (
        <button
          onClick={() => {
            setSearchQuery('')
            setCurrentPage(1)
            searchRef.current?.focus()
          }}
          style={{
            width: 'auto',
            padding: '0 16px',
            backgroundColor: 'var(--border)',
            color: 'var(--text-primary)',
            borderRadius: '8px',
            flexShrink: 0,
          }}
        >
          Clear
        </button>
      )}
    </div>

    {/* Pagination top */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
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

      {/* Price List Table */}
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
            <tr 
              key={item.id}
              onClick={() => {
                if (isManager) {
                  setIsUpdating(false)
                  setSelectedItem(item)
                }
              }}
              style={{ cursor: isManager ? 'pointer' : 'default' }}
              >
              <td>{item.item_name}</td>
              <td>{item.category ?? '-'}</td>
              <td>₱{item.price}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Edit modal */}
      {selectedItem && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: '16px' }}>{selectedItem.item_name}</h2>
            <label style={labelStyle}>Category</label>
            <input
              type="text"
              value={selectedItem.category ?? ''}
              onChange={(e) => setSelectedItem({ ...selectedItem, category: e.target.value })}
              style={{ marginBottom: '12px' }}
            />

            <label style={labelStyle}>Price</label>
            <input
              type="number"
              inputMode="decimal"
              value={selectedItem.price === 0 ? '' : selectedItem.price}
              onChange={(e) => setSelectedItem({ ...selectedItem, 
              price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
              style={{ marginBottom: '4px' }}
            />
            {selectedItem.price <= 0 && (
              <p style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '12px' }}>
              Price must be greater than 0
              </p>
            )}
            {selectedItem.price > 0 && <div style={{ marginBottom: '12px' }} />}

            <button
              onClick={handleUpdate}
              disabled={!selectedItem.price || selectedItem.price <= 0 || isUpdating}
              style={{
                marginBottom: '8px',
                backgroundColor: selectedItem.price > 0 && !isUpdating ? 'var(--accent)' : 'var(--border)',
                cursor: selectedItem.price > 0 && !isUpdating ? 'pointer' : 'not-allowed',
              }}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              onClick={handleDelete}
              disabled={isDeleting}
              style={{ marginBottom: '8px', backgroundColor: 'var(--error)', cursor: isDeleting ? 'not-allowed' : 'pointer' }}
            >
            {isDeleting ? 'Deleting...' : 'Delete Item'}
            </button>

            <button
              onClick={() => setSelectedItem(null)}
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)'}}
            >Cancel</button>
          </div>
        </div>
      )}
      
      {/* Add New Item Modal */}
      {isAdding && (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <h2 style={{ marginBottom: '16px' }}>Add New Item</h2>

          <label style={labelStyle}>Item Name *</label>
          <input
            type="text"
            value={newItem.item_name}
            onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
            style={{ marginBottom: '4px' }}
          />
          {addErrors.item_name && (
            <p style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '12px' }}>
              {addErrors.item_name}
            </p>
          )}
          {!addErrors.item_name && <div style={{ marginBottom: '12px' }} />}

          <label style={labelStyle}>Category</label>
          <input
            type="text"
            value={newItem.category}
            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
            style={{ marginBottom: '12px' }}
          />

          <label style={labelStyle}>Price *</label>
          <input
            type="number"
            inputMode="decimal"
            value={newItem.price}
            onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
            style={{ marginBottom: '4px' }}
          />
          {addErrors.price && (
            <p style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '20px' }}>
              {addErrors.price}
            </p>
          )}
          {!addErrors.price && <div style={{ marginBottom: '20px' }} />}

          <button
            onClick={handleAdd}
            disabled={!isAddValid || isSubmitting}
            style={{
              marginBottom: '8px',
              backgroundColor: isAddValid && !isSubmitting ? 'var(--green)' : 'var(--border)',
              cursor: isAddValid && !isSubmitting ? 'pointer' : 'not-allowed',
            }}
          >
            {isSubmitting ? 'Adding...' : 'Add Item'}
          </button>
          <button
            onClick={() => setIsAdding(false)}
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    )}

      {/* Pagination bottom */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px', marginBottom: '30px' }}>
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
    {toast && (
      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'var(--green)',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '15px',
        zIndex: 2000,
        whiteSpace: 'nowrap',
        }}>
        {toast}
      </div>
    )}
    </main>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '16px',
}

const modalStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface)',
  borderRadius: '12px',
  padding: '24px',
  width: '100%',
  maxWidth: '400px',
  display: 'flex',
  flexDirection: 'column',
}

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-secondary)',
  marginBottom: '4px',
}
