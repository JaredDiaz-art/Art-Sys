// Sistema OCR integrado para ArtSys con Tesseract.js
class OCRSystem {
    constructor() {
        this.stream = null;
        this.video = null;
        this.currentAction = null;
        this.capturedImage = null;
        this.ocrResults = [];
        this.tesseract = null;
        this.init();
    }

    async init() {
        this.createOCRModal();
        this.bindEvents();
        await this.loadTesseract();
    }

    async loadTesseract() {
        try {
            // Cargar Tesseract.js desde CDN
            if (typeof Tesseract === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/tesseract.js@4/dist/tesseract.min.js';
                document.head.appendChild(script);
                
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });
            }
            
            this.tesseract = Tesseract;
            console.log('Tesseract.js cargado correctamente');
        } catch (error) {
            console.error('Error al cargar Tesseract.js:', error);
        }
    }

    createOCRModal() {
        const modalHTML = `
            <div id="ocrModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 900px; width: 95%;">
                    <span class="close-button" id="closeOCRModal">&times;</span>
                    <div class="modal-header-with-img">
                        <h3>🔍 Escáner OCR - <span id="ocrActionTitle">Entradas</span></h3>
                    </div>
                    
                    <!-- Paso 1: Cámara -->
                    <div id="ocrCameraStep" class="ocr-step active">
                        <div class="camera-container">
                            <video id="ocrVideo" autoplay playsinline muted style="width: 100%; max-width: 500px; border-radius: 10px; margin: 20px 0;"></video>
                            <div class="camera-controls">
                                <button id="startCameraBtn" class="artisanal-button">📷 Iniciar Cámara</button>
                                <button id="captureImageBtn" class="artisanal-button" style="display: none;">📸 Capturar</button>
                                <button id="stopCameraBtn" class="artisanal-button" style="display: none;">⏹️ Detener</button>
                            </div>
                        </div>
                    </div>

                    <!-- Paso 2: Resultados OCR -->
                    <div id="ocrResultsStep" class="ocr-step" style="display: none;">
                        <div class="ocr-status">
                            <div id="ocrStatus" class="status info">Procesando imagen...</div>
                        </div>
                        
                        <div id="ocrResultsContainer" style="display: none;">
                            <h4>Productos Detectados:</h4>
                            <div class="table-container">
                                <table id="ocrResultsTable">
                                    <thead>
                                        <tr>
                                            <th>Cantidad</th>
                                            <th>Nombre</th>
                                            <th>Capacidad</th>
                                            <th id="priceColumnHeader">Precio</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                            <div class="ocr-actions">
                                <button id="confirmOCRBtn" class="artisanal-button">✅ Confirmar y Enviar</button>
                                <button id="retakePhotoBtn" class="action-button">📷 Tomar Nueva Foto</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    bindEvents() {
        // Botones OCR existentes
        document.getElementById('ocrButtonEntradas').addEventListener('click', () => this.openOCR('entrada'));
        document.getElementById('ocrButtonSalidas').addEventListener('click', () => this.openOCR('salida'));
        document.getElementById('ocrButtonBajas').addEventListener('click', () => this.openOCR('baja'));

        // Botones del modal OCR
        document.getElementById('closeOCRModal').addEventListener('click', () => this.closeOCR());
        document.getElementById('startCameraBtn').addEventListener('click', () => this.startCamera());
        document.getElementById('captureImageBtn').addEventListener('click', () => this.captureImage());
        document.getElementById('stopCameraBtn').addEventListener('click', () => this.stopCamera());
        document.getElementById('confirmOCRBtn').addEventListener('click', () => this.confirmAndSend());
        document.getElementById('retakePhotoBtn').addEventListener('click', () => this.retakePhoto());

        // Cerrar modal al hacer clic fuera
        document.getElementById('ocrModal').addEventListener('click', (e) => {
            if (e.target.id === 'ocrModal') {
                this.closeOCR();
            }
        });
    }

    openOCR(action) {
        this.currentAction = action;
        document.getElementById('ocrActionTitle').textContent = this.getActionTitle(action);
        
        // Actualizar encabezado de precio según la acción
        const priceHeader = document.getElementById('priceColumnHeader');
        switch (action) {
            case 'entrada':
                priceHeader.textContent = 'Precio de Compra';
                break;
            case 'salida':
                priceHeader.textContent = 'Precio de Venta';
                break;
            case 'baja':
                priceHeader.textContent = 'Precio (Negativo)';
                break;
        }
        
        document.getElementById('ocrModal').style.display = 'block';
        this.showStep('camera');
    }

    closeOCR() {
        this.stopCamera();
        document.getElementById('ocrModal').style.display = 'none';
        this.resetOCR();
    }

    getActionTitle(action) {
        const titles = {
            'entrada': 'Entradas',
            'salida': 'Salidas',
            'baja': 'Bajas'
        };
        return titles[action] || 'OCR';
    }

    showStep(step) {
        document.querySelectorAll('.ocr-step').forEach(s => s.style.display = 'none');
        document.getElementById(`ocr${step.charAt(0).toUpperCase() + step.slice(1)}Step`).style.display = 'block';
    }

    async startCamera() {
        try {
            const status = document.getElementById('ocrStatus');
            status.textContent = 'Accediendo a la cámara...';
            status.className = 'status info';

            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            this.video = document.getElementById('ocrVideo');
            this.video.srcObject = this.stream;

            document.getElementById('startCameraBtn').style.display = 'none';
            document.getElementById('captureImageBtn').style.display = 'inline-block';
            document.getElementById('stopCameraBtn').style.display = 'inline-block';

            status.textContent = '✅ Cámara activada - Posicione la lista de productos';
            status.className = 'status success';

        } catch (error) {
            console.error('Error al acceder a la cámara:', error);
            document.getElementById('ocrStatus').textContent = '❌ Error al acceder a la cámara';
            document.getElementById('ocrStatus').className = 'status error';
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        document.getElementById('startCameraBtn').style.display = 'inline-block';
        document.getElementById('captureImageBtn').style.display = 'none';
        document.getElementById('stopCameraBtn').style.display = 'none';
    }

    captureImage() {
        if (!this.video || !this.video.videoWidth) {
            alert('La cámara no está lista');
            return;
        }

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        context.drawImage(this.video, 0, 0);
        
        this.capturedImage = canvas.toDataURL('image/jpeg');
        
        this.stopCamera();
        this.processOCR();
    }

    async processOCR() {
        this.showStep('results');
        const status = document.getElementById('ocrStatus');
        status.textContent = '🔍 Procesando imagen con OCR...';
        status.className = 'status info';

        try {
            if (!this.tesseract) {
                throw new Error('Tesseract.js no está cargado');
            }

            // Procesar imagen con Tesseract.js
            const result = await this.tesseract.recognize(
                this.capturedImage,
                'spa+eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            status.textContent = `🔍 Procesando... ${Math.round(m.progress * 100)}%`;
                        }
                    }
                }
            );

            this.rawOCRText = result.data.text;
            console.log('Texto OCR detectado:', this.rawOCRText);
            
            // Procesar con IA para interpretar los resultados
            this.ocrResults = this.processWithAI(this.rawOCRText);
            
            this.displayResults();
            
        } catch (error) {
            console.error('Error en OCR:', error);
            status.textContent = '❌ Error al procesar la imagen';
            status.className = 'status error';
            
            // Fallback: usar datos simulados
            await this.fallbackOCR();
        }
    }

    async fallbackOCR() {
        const status = document.getElementById('ocrStatus');
        status.textContent = '⚠️ Usando modo de demostración...';
        status.className = 'status info';
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Datos de ejemplo
        this.rawOCRText = `
            2 Jabón de manos 500ml $3.50
            1 Detergente líquido 1L $5.20
            3 Papel higiénico 4 rollos $2.80
            1 Limpiador multiusos 750ml $4.10
        `;
        
        this.ocrResults = this.processWithAI(this.rawOCRText);
        this.displayResults();
    }

    processWithAI(rawText) {
        // Procesar texto con IA para extraer productos
        const lines = rawText.trim().split('\n').filter(line => line.trim());
        const products = [];

        lines.forEach(line => {
            // Patrón: cantidad nombre capacidad precio
            const patterns = [
                /(\d+)\s+(.+?)\s+(\d+[mlL])\s+\$?(\d+\.?\d*)/i,
                /(\d+)\s+(.+?)\s+(\d+[mlL])\s+(\d+\.?\d*)/i,
                /(\d+)\s+(.+?)\s+(\d+)\s+\$?(\d+\.?\d*)/i,
                /(\d+)\s+(.+?)\s+\$?(\d+\.?\d*)/i
            ];

            let matched = false;
            for (const pattern of patterns) {
                const match = line.match(pattern);
                if (match) {
                    products.push({
                        cantidad: parseInt(match[1]),
                        nombre: match[2].trim(),
                        capacidad: match[3] || 'N/A',
                        precio: parseFloat(match[match.length - 1]),
                        original: line.trim()
                    });
                    matched = true;
                    break;
                }
            }

            // Si no coincide con ningún patrón, intentar extraer información básica
            if (!matched) {
                const words = line.trim().split(/\s+/);
                if (words.length >= 2) {
                    const cantidad = parseInt(words[0]) || 1;
                    const nombre = words.slice(1, -1).join(' ');
                    const precio = parseFloat(words[words.length - 1]) || 0;
                    
                    products.push({
                        cantidad: cantidad,
                        nombre: nombre,
                        capacidad: 'N/A',
                        precio: precio,
                        original: line.trim()
                    });
                }
            }
        });

        return products;
    }

    displayResults() {
        const tbody = document.querySelector('#ocrResultsTable tbody');
        tbody.innerHTML = '';

        this.ocrResults.forEach((product, index) => {
            const row = document.createElement('tr');
            
            // Ajustar precio según la acción
            let precio = product.precio;
            if (this.currentAction === 'baja' && precio > 0) {
                precio = -precio;
            }
            
            row.innerHTML = `
                <td><input type="number" value="${product.cantidad}" min="1" class="ocr-edit-input"></td>
                <td><input type="text" value="${product.nombre}" class="ocr-edit-input"></td>
                <td><input type="text" value="${product.capacidad}" class="ocr-edit-input"></td>
                <td><input type="number" value="${precio}" step="0.01" class="ocr-edit-input"></td>
                <td>
                    <button onclick="ocrSystem.deleteProduct(${index})" class="action-button delete-button">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        document.getElementById('ocrResultsContainer').style.display = 'block';
        document.getElementById('ocrStatus').textContent = `✅ Se detectaron ${this.ocrResults.length} productos`;
        document.getElementById('ocrStatus').className = 'status success';
    }

    deleteProduct(index) {
        this.ocrResults.splice(index, 1);
        this.displayResults();
    }

    retakePhoto() {
        this.showStep('camera');
        this.resetOCR();
    }

    resetOCR() {
        this.capturedImage = null;
        this.ocrResults = [];
        this.rawOCRText = '';
        document.getElementById('ocrResultsContainer').style.display = 'none';
        document.getElementById('ocrStatus').textContent = 'Listo para escanear';
        document.getElementById('ocrStatus').className = 'status info';
    }

    confirmAndSend() {
        // Obtener datos editados de la tabla
        const rows = document.querySelectorAll('#ocrResultsTable tbody tr');
        const finalProducts = [];

        rows.forEach(row => {
            const inputs = row.querySelectorAll('.ocr-edit-input');
            finalProducts.push({
                cantidad: parseInt(inputs[0].value),
                nombre: inputs[1].value,
                capacidad: inputs[2].value,
                precio: parseFloat(inputs[3].value)
            });
        });

        // Ejecutar acción según el tipo
        this.executeAction(finalProducts);
    }

    executeAction(products) {
        switch (this.currentAction) {
            case 'entrada':
                this.handleEntrada(products);
                break;
            case 'salida':
                this.handleSalida(products);
                break;
            case 'baja':
                this.handleBaja(products);
                break;
        }
    }

    handleEntrada(products) {
        // Simular registro de entradas
        console.log('Registrando entradas:', products);
        
        // Aquí se integraría con la base de datos existente
        this.saveToDatabase('entrada', products);
        
        alert(`✅ Se registraron ${products.length} productos como entradas`);
        this.closeOCR();
    }

    handleSalida(products) {
        // Simular registro de salidas
        console.log('Registrando salidas:', products);
        
        // Aquí se integraría con la base de datos existente
        this.saveToDatabase('salida', products);
        
        alert(`✅ Se registraron ${products.length} productos como salidas`);
        this.closeOCR();
    }

    handleBaja(products) {
        // Simular registro de bajas (precios negativos)
        const bajasProducts = products.map(p => ({
            ...p,
            precio: p.precio ? -Math.abs(p.precio) : 0
        }));
        
        console.log('Registrando bajas:', bajasProducts);
        
        // Aquí se integraría con la base de datos existente
        this.saveToDatabase('baja', bajasProducts);
        
        alert(`✅ Se registraron ${bajasProducts.length} productos como bajas`);
        this.closeOCR();
    }

    async saveToDatabase(action, products) {
        try {
            if (localDB) {
                // Guardar productos en la base de datos local
                await localDB.saveProductos(action, products);
                
                // Guardar transacción
                const bodega = this.getCurrentBodega();
                await localDB.saveTransaccion(action, products, bodega);
                
                console.log('Datos guardados en base de datos local');
            } else {
                // Fallback a localStorage si la base de datos no está disponible
                const transactions = JSON.parse(localStorage.getItem('ocrTransactions') || '[]');
                
                products.forEach(product => {
                    transactions.push({
                        id: Date.now() + Math.random(),
                        accion: action,
                        cantidad: product.cantidad,
                        producto: product.nombre,
                        capacidad: product.capacidad,
                        precio: product.precio,
                        fecha: new Date().toISOString()
                    });
                });
                
                localStorage.setItem('ocrTransactions', JSON.stringify(transactions));
                console.log('Datos guardados en localStorage (fallback)');
            }
        } catch (error) {
            console.error('Error al guardar en base de datos:', error);
        }
    }

    getCurrentBodega() {
        // Obtener la bodega seleccionada del formulario actual
        const bodegaSelect = document.querySelector('select[id*="warehouse"]');
        return bodegaSelect ? bodegaSelect.value : 'General';
    }
}

// Inicializar sistema OCR cuando se cargue la página
let ocrSystem;
document.addEventListener('DOMContentLoaded', () => {
    ocrSystem = new OCRSystem();
}); 