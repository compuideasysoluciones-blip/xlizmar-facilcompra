/**
 * @project: XLizmar Fácil Compra
 * @copyright: © 2026 Compuideas y Soluciones. Todos los derechos reservados.
 * @author: Compuideas y Soluciones
 */

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
});

// Función para consultar retiro con PIN
async function consultarRetiro(e) {
    e.preventDefault();
    const clave = document.getElementById('d-clave').value;
    const documento = document.getElementById('d-documento').value;
    const pin = document.getElementById('d-pin').value.toUpperCase();
    
    let btn = document.getElementById('btn-consultar');
    btn.innerText = "Buscando en servidor...";
    btn.disabled = true;

    try {
        const { data, error } = await window.supabaseClient.rpc('consultar_despacho_aliado', {
            p_clave_acceso: clave,
            p_document_id: documento,
            p_claim_pin: pin
        });

        if (error) throw error;

        if (data.success) {
            // Mostrar resultados
            document.getElementById('despacho-form').style.display = 'none';
            document.getElementById('resultado-panel').style.display = 'block';
            
            document.getElementById('res-cliente').innerText = data.client_name;
            document.getElementById('res-producto').innerText = data.product;
            document.getElementById('res-queue-id').value = data.queue_id;
            
            lucide.createIcons();
        } else {
            alert("❌ Denegado: " + data.error);
        }
    } catch (err) {
        alert("❌ Error de red: " + err.message);
    } finally {
        btn.innerText = "Validar Autenticidad en Servidor";
        btn.disabled = false;
    }
}

async function firmarDespacho() {
    const queueId = document.getElementById('res-queue-id').value;
    const clave = document.getElementById('d-clave').value;
    
    let btn = document.getElementById('btn-despachar');
    btn.innerText = "Firmando salida...";
    btn.disabled = true;

    try {
        const { data, error } = await window.supabaseClient.rpc('entregar_articulo_aliado', {
            p_clave_acceso: clave,
            p_queue_id: queueId
        });

        if (error) throw error;

        if (data.success) {
            alert("✅ ¡ÉXITO! Entrega el producto al cliente. El sistema ya marcó esta salida.");
            location.reload();
        } else {
            alert("❌ Error al firmar: " + data.error);
        }
    } catch (err) {
        alert("❌ Error crítico: " + err.message);
    } finally {
        btn.innerText = "MARCAR COMO ENTREGADO";
        btn.disabled = false;
    }
}

function reiniciarBodega(e) {
    if(e) e.preventDefault();
    location.reload();
}
