// Sistema de base de datos local para ArtSys OCR
class LocalDatabase {
    constructor() {
        this.dbName = 'artsys_ocr_db';
        this.dbVersion = 1;
        this.db = null;
        this.init();
    }

    async init() {
        try {
            this.db = await this.openDatabase();
            console.log('Base de datos local inicializada');
        } catch (error) {
            console.error('Error al inicializar la base de datos:', error);
        }
    }

    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                reject(new Error('Error al abrir la base de datos'));
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Crear tabla de productos
                if (!db.objectStoreNames.contains('productos')) {
                    const productosStore = db.createObjectStore('productos', { keyPath: 'id', autoIncrement: true });
                    productosStore.createIndex('accion', 'accion', { unique: false });
                    productosStore.createIndex('fecha', 'fecha', { unique: false });
                }

                // Crear tabla de transacciones
                if (!db.objectStoreNames.contains('transacciones')) {
                    const transaccionesStore = db.createObjectStore('transacciones', { keyPath: 'id', autoIncrement: true });
                    transaccionesStore.createIndex('tipo', 'tipo', { unique: false });
                    transaccionesStore.createIndex('fecha', 'fecha', { unique: false });
                    transaccionesStore.createIndex('bodega', 'bodega', { unique: false });
                }

                // Crear tabla de bodegas
                if (!db.objectStoreNames.contains('bodegas')) {
                    const bodegasStore = db.createObjectStore('bodegas', { keyPath: 'id', autoIncrement: true });
                    bodegasStore.createIndex('nombre', 'nombre', { unique: true });
                }
            };
        });
    }

    // Métodos para productos
    async saveProductos(accion, productos) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['productos'], 'readwrite');
            const store = transaction.objectStore('productos');

            let completed = 0;
            const total = productos.length;

            productos.forEach(producto => {
                const item = {
                    accion: accion,
                    cantidad: producto.cantidad,
                    producto: producto.nombre,
                    capacidad: producto.capacidad,
                    precio: producto.precio,
                    fecha: new Date().toISOString(),
                    bodega: this.getCurrentBodega()
                };

                const request = store.add(item);
                request.onsuccess = () => {
                    completed++;
                    if (completed === total) {
                        resolve({ success: true, message: `${total} productos guardados` });
                    }
                };
                request.onerror = () => {
                    reject(new Error('Error al guardar producto'));
                };
            });
        });
    }

    async getProductos(accion = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['productos'], 'readonly');
            const store = transaction.objectStore('productos');

            let request;
            if (accion) {
                const index = store.index('accion');
                request = index.getAll(accion);
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => {
                reject(new Error('Error al obtener productos'));
            };
        });
    }

    // Métodos para transacciones
    async saveTransaccion(tipo, productos, bodega) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['transacciones'], 'readwrite');
            const store = transaction.objectStore('transacciones');

            const transaccion = {
                tipo: tipo,
                productos: productos,
                bodega: bodega,
                fecha: new Date().toISOString(),
                total: productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0)
            };

            const request = store.add(transaccion);
            request.onsuccess = () => {
                resolve({ success: true, message: 'Transacción guardada' });
            };
            request.onerror = () => {
                reject(new Error('Error al guardar transacción'));
            };
        });
    }

    async getTransacciones(tipo = null, fechaInicio = null, fechaFin = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['transacciones'], 'readonly');
            const store = transaction.objectStore('transacciones');

            let request = store.getAll();

            request.onsuccess = () => {
                let transacciones = request.result;

                // Filtrar por tipo si se especifica
                if (tipo) {
                    transacciones = transacciones.filter(t => t.tipo === tipo);
                }

                // Filtrar por fecha si se especifica
                if (fechaInicio || fechaFin) {
                    transacciones = transacciones.filter(t => {
                        const fecha = new Date(t.fecha);
                        const inicio = fechaInicio ? new Date(fechaInicio) : null;
                        const fin = fechaFin ? new Date(fechaFin) : null;

                        if (inicio && fin) {
                            return fecha >= inicio && fecha <= fin;
                        } else if (inicio) {
                            return fecha >= inicio;
                        } else if (fin) {
                            return fecha <= fin;
                        }
                        return true;
                    });
                }

                resolve(transacciones);
            };
            request.onerror = () => {
                reject(new Error('Error al obtener transacciones'));
            };
        });
    }

    // Métodos para bodegas
    async saveBodega(nombre) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['bodegas'], 'readwrite');
            const store = transaction.objectStore('bodegas');

            const bodega = {
                nombre: nombre,
                fechaCreacion: new Date().toISOString()
            };

            const request = store.add(bodega);
            request.onsuccess = () => {
                resolve({ success: true, message: 'Bodega guardada' });
            };
            request.onerror = () => {
                reject(new Error('Error al guardar bodega'));
            };
        });
    }

    async getBodegas() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['bodegas'], 'readonly');
            const store = transaction.objectStore('bodegas');

            const request = store.getAll();
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => {
                reject(new Error('Error al obtener bodegas'));
            };
        });
    }

    // Métodos de utilidad
    getCurrentBodega() {
        // Obtener la bodega seleccionada del formulario
        const bodegaSelect = document.querySelector('select[id*="warehouse"]');
        return bodegaSelect ? bodegaSelect.value : 'General';
    }

    // Métodos para estadísticas
    async getEstadisticas() {
        try {
            const [productos, transacciones] = await Promise.all([
                this.getProductos(),
                this.getTransacciones()
            ]);

            const stats = {
                totalProductos: productos.length,
                totalTransacciones: transacciones.length,
                entradas: productos.filter(p => p.accion === 'entrada').length,
                salidas: productos.filter(p => p.accion === 'salida').length,
                bajas: productos.filter(p => p.accion === 'baja').length,
                valorTotal: transacciones.reduce((sum, t) => sum + t.total, 0)
            };

            return stats;
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            return null;
        }
    }

    // Método para exportar datos
    async exportData() {
        try {
            const [productos, transacciones, bodegas] = await Promise.all([
                this.getProductos(),
                this.getTransacciones(),
                this.getBodegas()
            ]);

            const data = {
                productos,
                transacciones,
                bodegas,
                exportDate: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `artsys_data_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error al exportar datos:', error);
        }
    }

    // Método para importar datos
    async importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Importar bodegas
                    if (data.bodegas) {
                        for (const bodega of data.bodegas) {
                            await this.saveBodega(bodega.nombre);
                        }
                    }

                    // Importar productos
                    if (data.productos) {
                        for (const producto of data.productos) {
                            await this.saveProductos(producto.accion, [producto]);
                        }
                    }

                    // Importar transacciones
                    if (data.transacciones) {
                        for (const transaccion of data.transacciones) {
                            await this.saveTransaccion(transaccion.tipo, transaccion.productos, transaccion.bodega);
                        }
                    }

                    resolve({ success: true, message: 'Datos importados correctamente' });
                } catch (error) {
                    reject(new Error('Error al importar datos'));
                }
            };
            reader.onerror = () => reject(new Error('Error al leer archivo'));
            reader.readAsText(file);
        });
    }
}

// Inicializar base de datos global
let localDB;
document.addEventListener('DOMContentLoaded', async () => {
    localDB = new LocalDatabase();
}); 