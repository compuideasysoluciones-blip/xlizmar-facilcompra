document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
});

async function consultarRetiro(e) {
    e.preventDefault();
    if (!window.supabaseClient) return alert('No hay conexión a la central de datos.');

    const clave = document.getElementById('d-clave').value;
    const documento = document.getElementById('d-documento').value;
    const pin = document.getElementById('d-pin').value;
    const btn = document.getElementById('btn-consultar');

    btn.innerText = "Consultando con Satélite...";
    btn.disabled = true;

    try {
        const { data, error } = await window.supabaseClient.rpc('consultar_despacho_aliado', {
            p_clave_acceso: clave,
            p_document_id: documento,
            p_claim_pin: pin
        });

        if (error) throw error;

        if (data.success) {
            // Ocultamos formulario, mostramos el acta
            document.getElementById('despacho-form').style.display = 'none';
            document.getElementById('resultado-panel').style.display = 'block';

            document.getElementById('res-cliente').innerText = data.client_name;
            document.getElementById('res-producto').innerText = data.product + " (Inventario de " + data.store + ")";
            document.getElementById('res-queue-id').value = data.queue_id;

        } else {
            // Un error del sistema o PIN ya cobrado
            alert(data.error);
            document.getElementById('d-pin').value = ''; // Limpiamos el PIN por si se equivocaron tipeando
        }

    } catch(err) {
        alert("❌ Error de comunicación con la base principal: " + err.message);
    } finally {
        btn.innerHTML = `<i data-lucide="search" style="width:18px; display:inline; margin-right:5px;"></i> Validar Autenticidad en Servidor`;
        btn.disabled = false;
        lucide.createIcons();
    }
}

async function firmarDespacho() {
    let confirmacion = confirm("⚠️ ATENCIÓN BODEGA:\n\n¿Estás seguro que el cliente ya tiene el Producto físico y firmaron/facturaron la salida del inventario? Esta acción INHABILITA el PIN para siempre.");
    
    if(!confirmacion) return;

    const clave = document.getElementById('d-clave').value;
    const queueId = document.getElementById('res-queue-id').value;
    const btn = document.getElementById('btn-despachar');

    btn.innerText = "Firmando Electrónicamente...";
    btn.disabled = true;

    try {
        const { data, error } = await window.supabaseClient.rpc('entregar_articulo_aliado', {
            p_clave_acceso: clave,
            p_queue_id: queueId
        });

        if (error) throw error;

        if (data.success) {
            alert("🚚 ¡ÉXITO! " + data.message + "\n\nEl artículo ha sido descontado y el PIN inhabilitado.");
            reiniciarBodega(new Event('click')); // Reseteamos al cajero para el siguiente que venga en la fila
        } else {
            alert(data.error);
        }

    } catch(err) {
        alert("❌ Ocurrió un fallo registrando la entrega: " + err.message);
    } finally {
        btn.innerHTML = `<i data-lucide="box" style="width:18px; display:inline; margin-right:5px;"></i> MARCAR COMO ENTREGADO`;
        btn.disabled = false;
        lucide.createIcons();
    }
}

function reiniciarBodega(e) {
    if(e) e.preventDefault();
    document.getElementById('d-documento').value = '';
    document.getElementById('d-pin').value = '';
    
    document.getElementById('resultado-panel').style.display = 'none';
    document.getElementById('despacho-form').style.display = 'block';
}
