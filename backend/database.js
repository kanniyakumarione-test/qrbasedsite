const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const usingServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY) must be set in environment variables.');
} else if (!usingServiceRole) {
  console.warn('Using SUPABASE_ANON_KEY on backend; RLS policies may hide data. Prefer SUPABASE_SERVICE_ROLE_KEY on server.');
}

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

function checkClient() {
  if (!supabase) {
    throw new Error('Supabase client not initialized. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in Vercel settings.');
  }
}

// ── Menu operations ──────────────────────────────────────────────────────────

async function getMenu(onlyAvailable = true) {
  checkClient();
  let query = supabase.from('menu').select('*');
  if (onlyAvailable) query = query.eq('available', true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getMenuItem(id) {
  checkClient();
  const { data, error } = await supabase.from('menu').select('*').eq('id', id).single();
  if (error) return null;
  return data;
}

async function addMenuItem(item) {
  checkClient();
  const { data, error } = await supabase.from('menu').insert([item]).select().single();
  if (error) throw error;
  return data;
}

async function updateMenuItem(id, item) {
  checkClient();
  const { data, error } = await supabase.from('menu').update(item).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function deleteMenuItem(id) {
  checkClient();
  const { error } = await supabase.from('menu').delete().eq('id', id);
  if (error) throw error;
}

// ── Order operations ─────────────────────────────────────────────────────────

async function getOrders(filters = {}) {
  checkClient();
  // Postgres lowercases unquoted column names, so use lowercase here
  let query = supabase.from('orders').select('*').order('createdat', { ascending: false });

  if (filters.tableId) {
    query = query.eq('tableid', filters.tableId);
  }

  if (filters.mode === 'kitchen') {
    query = query.in('status', ['NEW', 'PREPARING', 'READY']);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getOrder(id) {
  checkClient();
  const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
  if (error) return null;
  return data;
}

async function addOrder(order) {
  checkClient();
  const { data, error } = await supabase.from('orders').insert([order]).select().single();
  if (error) throw error;
  return data;
}

async function updateOrderStatus(id, status, updatedAt) {
  checkClient();
  const { error } = await supabase.from('orders').update({ status, updatedat: updatedAt }).eq('id', id);
  if (error) throw error;
}

// ── Table operations ─────────────────────────────────────────────────────────

async function getTables() {
  checkClient();
  const { data, error } = await supabase.from('tables').select('*').order('id');
  if (error) throw error;
  return data || [];
}

async function updateTable(id, name) {
  checkClient();
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
