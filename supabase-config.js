const SUPABASE_URL = 'https://yhixbsblmdvhnpqmrzei.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SRAhlecNA86RwPCoTG5GNA_Dow-Q63v';

async function fetchProducts() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=id`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('상품 로딩 실패:', e);
    return [];
  }
}
