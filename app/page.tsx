'use client'
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useEffect } from "react";

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px',
  borderBottom: '2px solid #ccc'
}

const tdStyle: React.CSSProperties = {
  padding: '8px',
  borderBottom: '1px solid #eee'
}

type Item = {
  id: number
  item_name: string
  category: string
  price: number
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function fetchItems(){
      const supabase = createClient();
      const { data } = await supabase.from('pricelist').select('*')
      setItems(data ?? [])
    }
    fetchItems()
  }, [])

  const filtered = items.filter(item =>
  item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  item.category.toLowerCase().includes(searchQuery.toLowerCase())
)
  console.log(items)
  
  return (
  <main style={{ padding: '16px' }}>
    <h1>RMQ</h1>

    {/* Search Bar */}
    <input
      type="text"
      placeholder="Search items..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      style={{ width: '100%', padding: '8px', marginBottom: '16px', boxSizing: 'border-box' }}
    />

    {/* Table */}
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={thStyle}>Item Name</th>
          <th style={thStyle}>Category</th>
          <th style={thStyle}>Price</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map(item => (
          <tr key={item.id}>
            <td style={tdStyle}>{item.item_name}</td>
            <td style={tdStyle}>{item.category}</td>
            <td style={tdStyle}>₱{item.price}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </main>
);
}