import { supabase } from "../lib/supabase";
import type { Category, CategoryUpdate, TransactionType } from "../types/database";

export async function getCategories(
  type?: TransactionType
): Promise<Category[]> {
  let query = supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(
  cat: Omit<Category, "id" | "user_id">
): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .insert(cat)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCategory(
  id: string,
  updates: CategoryUpdate
): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", id)
    .select();

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("No se pudo actualizar la categoría");
  }
  return data[0];
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
