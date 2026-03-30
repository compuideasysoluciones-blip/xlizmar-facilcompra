/**
 * @project: XLizmar Fácil Compra
 * @copyright: © 2026 Compuideas y Soluciones. Todos los derechos reservados.
 * @author: Compuideas y Soluciones
 */

// Archivo puente que conecta nuestro frontend con el backend

// Inicializando el cliente de Supabase
const supabaseUrl = CONFIG.SUPABASE_URL;
const supabaseKey = CONFIG.SUPABASE_ANON_KEY;

window.supabaseClient = supabaseUrl && supabaseKey !== 'PEGAR_AQUI_LA_API_KEY_ANON' 
    ? window.supabase.createClient(supabaseUrl, supabaseKey) 
    : null;

if (!window.supabaseClient) {
    console.warn("⚠️ Advertencia: Supabase no está conectado porque falta la API Key.");
}

// Ejemplo de función para revisar si hay una sesión activa de un usuario
async function checkCurrentSession() {
    if (!window.supabaseClient) return null;
    const { data, error } = await window.supabaseClient.auth.getSession();
    if (error) {
        console.error("Error obteniendo sesión", error);
        return null;
    }
    return data.session;
}
