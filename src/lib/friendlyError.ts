import { Alert, Platform } from "react-native";

/**
 * Maps Postgres/Supabase error codes to user-friendly Spanish messages.
 */
function friendlyMessage(e: unknown): string {
  if (!e || typeof e !== "object") return "Ocurrió un error. Intentá de nuevo.";

  const err = e as { code?: string; message?: string; status?: number };

  // P0001 = custom RAISE from our RPCs — already in Spanish
  if (err.code === "P0001") return err.message ?? "Ocurrió un error.";

  // Unique violation
  if (err.code === "23505") return "Ya existe un registro con estos datos.";

  // Foreign key violation
  if (err.code === "23503")
    return "No se puede completar: hay datos relacionados.";

  // JWT expired / auth error
  if (err.code === "PGRST301")
    return "Tu sesión expiró. Volvé a iniciar sesión.";

  // Network / fetch errors
  if (err.message && /fetch|network|timeout|abort/i.test(err.message))
    return "Error de conexión. Verificá tu internet e intentá de nuevo.";

  return err.message || "Ocurrió un error. Intentá de nuevo.";
}

/**
 * Show a user-friendly error alert (handles web vs native).
 */
export function showError(e: unknown): void {
  const msg = friendlyMessage(e);
  if (Platform.OS === "web") {
    window.alert(msg);
  } else {
    Alert.alert("Error", msg);
  }
}
