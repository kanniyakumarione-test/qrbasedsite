const { createClient } = require('@supabase/supabase-js');

// These will be provided by Vercel environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing. API will fail until SUPABASE_URL and SUPABASE_ANON_KEY are set in environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Menu operations
async function getMenu(onlyAvailable = true) {
  let query = supabase.from('menu').select('*');
  if (onlyAvailable) {
    query = query.eq('available', true);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function getMenuItem(id) {
  const { data, error } = await supabase.from('menu').select('*').eq('id', id).single();
  if (error) return null;
  return data;
}

async function addMenuItem(item) {
  const { data, error } = await supabase.from('menu').insert([item]).select().single();
  if (error) throw error;
  return data;
}

async function updateMenuItem(id, item) {
  const { data, error } = await supabase.from('menu').update(item).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function deleteMenuItem(id) {
  const { error } = await supabase.from('menu').delete().eq('id', id);
  if (error) throw error;
}

// Order operations
async function getOrders(filters = {}) {
  let query = supabase.from('orders').select('*').order('createdAt', { ascending: false });

  if (filters.tableId) {
    query = query.eq('tableId', filters.tableId);
  }

  if (filters.mode === 'kitchen') {
    query = query.in('status', ['NEW', 'PREPARING', 'READY']);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function getOrder(id) {
  const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
  if (error) return null;
  return data;
}

async function addOrder(order) {
  const { data, error } = await supabase.from('orders').insert([order]).select().single();
  if (error) throw error;
  return data;
}

async function updateOrderStatus(id, status, updatedAt) {
  const { error } = await supabase.from('orders').update({ status, updatedAt }).eq('id', id);
  if (error) throw error;
}

// Table operations
async function getTables() {
  const { data, error } = await supabase.from('tables').select('*').order('id');
  if (error) throw error;
  return data;
}

async function updateTable(id, name) {
  const { data, error } = await supabase.from('tables').update({ name }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

module.exports = {
  getMenu,
  getMenuItem,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getOrders,
  getOrder,
  addOrder,
  updateOrderStatus,
  getTables,
  updateTable
};