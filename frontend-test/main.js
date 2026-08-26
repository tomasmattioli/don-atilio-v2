const API_URL = 'http://localhost:8000';

document.getElementById('btn-cargar-ventas').addEventListener('click', async () => {
  const container = document.getElementById('lista-ventas');
  container.innerHTML = 'Cargando...';
  
  try {
    const response = await fetch(`${API_URL}/ventas`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const ventas = await response.json();
    
    if (ventas.length === 0) {
      container.innerHTML = '<p>No hay ventas registradas aún.</p>';
      return;
    }

    container.innerHTML = ventas.map(v => `
      <div class="venta-item">
        <strong>Venta #${v.id_venta}</strong> - $${v.total} <br/>
        <small>Estado: ${v.estado} | Ítems: ${v.detalles ? v.detalles.length : 'Error lazy loading'}</small>
        <pre>${JSON.stringify(v.detalles, null, 2)}</pre>
      </div>
    `).join('');
  } catch (error) {
    console.error(error);
    container.innerHTML = `<p style="color:red">Error al cargar: ${error.message}</p>`;
  }
});

// Prueba rápida de salud
fetch(`${API_URL}/`)
  .then(res => res.json())
  .then(data => {
    document.getElementById('estado-api').innerHTML = `<p style="color:green">✅ Backend online: ${data.mensaje}</p>`;
  })
  .catch(err => {
    document.getElementById('estado-api').innerHTML = `<p style="color:red">❌ Backend offline o error de CORS.</p>`;
  });
