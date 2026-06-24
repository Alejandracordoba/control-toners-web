const FIREBASE_URL = "https://controltonersweb-default-rtdb.firebaseio.com/";

// Elementos Solapa 1
const comboCodigos1 = document.getElementById('comboCodigos1');
const vistaStock1 = document.getElementById('vistaStock1');
const tablaHistorial = document.getElementById('tablaHistorial');
const btnRegistrar = document.getElementById('btnRegistrar');

// Elementos Solapa 2
const comboCodigos2 = document.getElementById('comboCodigos2');
const vistaStock2 = document.getElementById('vistaStock2');
const numStock = document.getElementById('numStock');
const btnActualizarStock = document.getElementById('btnActualizarStock');

let stockLocal = {};

async function inicializar() {
    await verificarYCrearStockInicial();
    await cargarStock();
    await cargarHistorial();
}

async function verificarYCrearStockInicial() {
    try {
        const respuesta = await fetch(`${FIREBASE_URL}stock.json`);
        const datos = await respuesta.json();
        if (datos === null) {
            const stockInicial = {
                "66S4H00": 5, "75M4XYO": 1, "75M4XK0": 1, "75M4XM0": 1, "75M4XC0": 1
            };
            await fetch(`${FIREBASE_URL}stock.json`, { method: 'PUT', body: JSON.stringify(stockInicial) });
        }
    } catch (e) { console.error(e); }
}

async function cargarStock() {
    const respuesta = await fetch(`${FIREBASE_URL}stock.json`);
    stockLocal = await respuesta.json() || {};

    comboCodigos1.innerHTML = '';
    comboCodigos2.innerHTML = '';
    let htmlStock = "";

    Object.keys(stockLocal).forEach(codigo => {
        // Llenar combo de Solapa 1
        let opt1 = document.createElement('option');
        opt1.value = codigo; opt1.textContent = codigo;
        comboCodigos1.appendChild(opt1);

        // Llenar combo de Solapa 2
        let opt2 = document.createElement('option');
        opt2.value = codigo; opt2.textContent = codigo;
        comboCodigos2.appendChild(opt2);

        htmlStock += `📦 ${codigo.padEnd(12, ' ')} | ${stockLocal[codigo]} unidades\n`;
    });

    // Inyectar en los dos JTextArea web estilizados
    vistaStock1.innerText = htmlStock;
    vistaStock2.innerText = htmlStock;

    // Setear valor inicial en el casillero numérico según el modelo elegido
    actualizarInputNumerico();
}

function actualizarInputNumerico() {
    const seleccionado = comboCodigos2.value;
    if (seleccionado && stockLocal[seleccionado] !== undefined) {
        numStock.value = stockLocal[seleccionado];
    }
}

// Escuchar cuando el usuario cambia de modelo en la Solapa 2
comboCodigos2.addEventListener('change', actualizarInputNumerico);

async function cargarHistorial() {
    const respuesta = await fetch(`${FIREBASE_URL}historial.json`);
    const historial = await respuesta.json();
    tablaHistorial.innerHTML = '';

    if (!historial) {
        tablaHistorial.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">No hay registros cargados.</td></tr>`;
        return;
    }

    Object.keys(historial).reverse().forEach(id => {
        const r = historial[id];
        let tr = document.createElement('tr');
        // Agregamos la celda final con el botón de borrar que pasa el ID y los datos necesarios
        tr.innerHTML = `
            <td class="text-muted small">${r.fecha}</td>
            <td class="fw-semibold">${r.area}</td>
            <td>${r.base}</td>
            <td><span class="badge bg-secondary text-white">${r.codigo}</span></td>
            <td><span class="badge bg-light text-dark border">${r.remanente} u.</span></td>
            <td>
                <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="eliminarRegistro('${id}', '${r.codigo}')">
                    🗑️ Borrar
                </button>
            </td>
        `;
        tablaHistorial.appendChild(tr);
    });
}

// Nueva función global para eliminar el registro erróneo y devolver el stock
window.eliminarRegistro = async function(id, codigoToner) {
    if (confirm("¿Estás segura de que querés borrar este registro? Se devolverá 1 unidad al stock.")) {
        try {
            // 1. Borrar de la tabla historial en Firebase
            await fetch(`${FIREBASE_URL}historial.json/${id}.json`, { method: 'DELETE' });

            // 2. Devolver la unidad al stock local y actualizar Firebase
            if (stockLocal[codigoToner] !== undefined) {
                let nuevaCant = stockLocal[codigoToner] + 1;
                let up = {}; up[codigoToner] = nuevaCant;
                await fetch(`${FIREBASE_URL}stock.json`, { method: 'PATCH', body: JSON.stringify(up) });
            }

            // 3. Recargar la interfaz de usuario
            await cargarStock();
            await cargarHistorial();
        } catch (e) {
            console.error("Error al eliminar:", e);
            alert("No se pudo eliminar el registro.");
        }
    }
}

// Botón: Registrar Cambio (Descontar 1 unidad)
btnRegistrar.addEventListener('click', async () => {
    const area = document.getElementById('txtArea').value.trim();
    const base = document.getElementById('txtBase').value.trim();
    const codigo = comboCodigos1.value;

    if (!area || !base) { alert("Completa los campos de Área y Base."); return; }

    let cant = stockLocal[codigo];
    if (cant > 0) {
        cant--;
        let up = {}; up[codigo] = cant;
        await fetch(`${FIREBASE_URL}stock.json`, { method: 'PATCH', body: JSON.stringify(up) });

        const fecha = new Date().toLocaleString('es-AR');
        const registro = { fecha, area, base, codigo, remanente: cant };
        await fetch(`${FIREBASE_URL}historial.json`, { method: 'POST', body: JSON.stringify(registro) });

        document.getElementById('txtArea').value = "";
        await cargarStock();
        await cargarHistorial();
    } else {
        alert(`¡Alerta! Sin stock para el modelo ${codigo}`);
    }
});

// Botón Solapa 2: Guardar Stock (Suma o sobreescribe lo que llegó de tóners nuevos)
btnActualizarStock.addEventListener('click', async () => {
    const codigo = comboCodigos2.value;
    const nuevaCantidad = parseInt(numStock.value);

    if (isNaN(nuevaCantidad) || nuevaCantidad < 0) {
        alert("Por favor ingresa una cantidad válida.");
        return;
    }

    let up = {}; up[codigo] = nuevaCantidad;
    // Guardar cambio en Firebase
    await fetch(`${FIREBASE_URL}stock.json`, { method: 'PATCH', body: JSON.stringify(up) });

    await cargarStock();
    alert(`Stock de ${codigo} actualizado a ${nuevaCantidad} unidades exitosamente.`);
});

window.onload = inicializar;