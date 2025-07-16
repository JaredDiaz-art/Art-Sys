// Preprocesamiento de imagen: binarización y aumento de contraste
function preprocessImage(imageDataUrl, callback) {
    const img = new window.Image();
    img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        // Binarización simple
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const avg = (imageData.data[i] + imageData.data[i+1] + imageData.data[i+2]) / 3;
            const bin = avg > 180 ? 255 : 0;
            imageData.data[i] = imageData.data[i+1] = imageData.data[i+2] = bin;
        }
        ctx.putImageData(imageData, 0, 0);
        callback(canvas.toDataURL('image/png'));
    };
    img.src = imageDataUrl;
}

// Clase Producto y parser tolerante
class Producto {
    constructor(cantidad, nombre, capacidad, tipo, precio, original) {
        this.cantidad = cantidad;
        this.nombre = nombre;
        this.capacidad = capacidad;
        this.tipo = tipo;
        this.precio = precio;
        this.original = original;
    }
}

class ProductoParser {
    static normalizar(line) {
        // Corrige errores comunes de OCR manuscrito
        return line
            .replace(/I/g, '1')
            .replace(/l/g, '1')
            .replace(/rn/g, 'm')
            .replace(/O/g, '0')
            .replace(/[^\\w\\d\\s\\/$\\.]/g, '') // Elimina caracteres raros
            .replace(/\\s{2,}/g, ' ')
            .trim();
    }

    static parseLine(line) {
        line = this.normalizar(line);
        // Solo si inicia con número
        const cantidadMatch = line.match(/^\\s*(\\d+)\\s+/);
        if (!cantidadMatch) return null;
        const cantidad = parseInt(cantidadMatch[1]);
        let rest = line.replace(/^\\s*\\d+\\s+/, '');

        // Buscar todos los números (capacidad, precio, etc.)
        const numeros = [...rest.matchAll(/(\\d+[\\/.]?\\d*)/g)].map(m => m[1]);
        if (numeros.length < 1) return null;
        const capacidad = numeros[0];
        // Nombre: todo antes de la capacidad
        const nombre = rest.substring(0, rest.indexOf(capacidad)).replace(/\\s+/g, ' ').trim();
        // Tipo: palabra después de capacidad
        let afterCap = rest.substring(rest.indexOf(capacidad) + capacidad.length).trim();
        const tipoMatch = afterCap.match(/^([a-zA-ZáéíóúüñÑ]+)/);
        const tipo = tipoMatch ? tipoMatch[1] : '';
        // Precio: después de $ o último número
        let precio = 0;
        const precioMatch = afterCap.match(/\\$\\s*(\\d+)/);
        if (precioMatch) precio = parseInt(precioMatch[1]);
        else if (numeros.length > 1) precio = parseInt(numeros[numeros.length - 1]);
        return new Producto(cantidad, nombre, capacidad, tipo, precio, line.trim());
    }

    static parseText(text) {
        return text.split('\\n').map(l => this.parseLine(l)).filter(Boolean);
    }
}

// OCRSystem principal
class OCRSystem {
    constructor() {
        this.stream = null;
        this.video = null;
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
    }

    createOCRModal() {
        const modalHTML = `
            <div id="ocrModal" class="modal" style="display: none;">
                <div class="modal-content">
                    <span class="close-button" id="closeOCRModal">&times;</span>
                    <div class="modal-header-with-img">
                        <h3>Escanear Lista de Productos</h3>
                    </div>
                    <div id="ocrCameraStep" class="ocr-step active">
                        <div class="camera-container">
                            <video id="ocrVideo" autoplay playsinline muted></video>
                            <div class="camera-controls">
                                <button id="startCameraBtn" class="artisanal-button">Iniciar Cámara</button>
                                <button id="captureImageBtn" class="artisanal-button" style="display: none;">Capturar</button>
                                <button id="stopCameraBtn" class="artisanal-button" style="display: none;">Detener</button>
                            </div>
                        </div>
                    </div>
                    <div id="ocrConfirmStep" class="ocr-step" style="display: none; text-align:center;">
                        <h4>¿La foto es clara?</h4>
                        <img id="ocrCapturedImage" style="max-width: 400px; border-radius: 10px; margin: 20px 0;" />
                        <div class="ocr-actions">
                            <button id="confirmPhotoBtn" class="artisanal-button">Usar esta foto</button>
                            <button id="retakePhotoBtn2" class="action-button">Tomar otra foto</button>
                        </div>
                    </div>
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
                                            <th>Tipo</th>
                                            <th>Precio</th>
                                            <th>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                            <div class="ocr-actions">
                                <button id="confirmOCRBtn" class="artisanal-button">Confirmar y Enviar</button>
                                <button id="retakePhotoBtn3" class="action-button">Tomar Nueva Foto</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    bindEvents() {
        document.getElementById('startCameraBtn').addEventListener('click', () => this.startCamera());
        document.getElementById('captureImageBtn').addEventListener('click', () => this.captureImage());
        document.getElementById('stopCameraBtn').addEventListener('click', () => this.stopCamera());
        document.getElementById('closeOCRModal').addEventListener('click', () => this.closeOCR());
        document.getElementById('confirmPhotoBtn').addEventListener('click', () => this.processOCR());
        document.getElementById('retakePhotoBtn2').addEventListener('click', () => this.retakePhoto());
        document.getElementById('confirmOCRBtn').addEventListener('click', () => this.confirmAndSend());
        document.getElementById('retakePhotoBtn3').addEventListener('click', () => this.retakePhoto());
        document.getElementById('ocrModal').addEventListener('click', (e) => {
            if (e.target.id === 'ocrModal') this.closeOCR();
        });
    }

    openOCR() {
        document.getElementById('ocrModal').style.display = 'block';
        this.showStep('camera');
    }

    closeOCR() {
        this.stopCamera();
        document.getElementById('ocrModal').style.display = 'none';
        this.resetOCR();
    }

    showStep(step) {
        document.querySelectorAll('.ocr-step').forEach(s => s.style.display = 'none');
        if (step === 'camera') document.getElementById('ocrCameraStep').style.display = 'block';
        if (step === 'confirm') document.getElementById('ocrConfirmStep').style.display = 'block';
        if (step === 'results') document.getElementById('ocrResultsStep').style.display = 'block';
    }

    async startCamera() {
        this.stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        this.video = document.getElementById('ocrVideo');
        this.video.srcObject = this.stream;
        document.getElementById('startCameraBtn').style.display = 'none';
        document.getElementById('captureImageBtn').style.display = 'inline-block';
        document.getElementById('stopCameraBtn').style.display = 'inline-block';
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
        document.getElementById('ocrCapturedImage').src = this.capturedImage;
        this.showStep('confirm');
    }

    retakePhoto() {
        this.showStep('camera');
        this.resetOCR();
    }

    resetOCR() {
        this.capturedImage = null;
        this.ocrResults = [];
        document.getElementById('ocrResultsContainer').style.display = 'none';
        document.getElementById('ocrStatus').textContent = 'Listo para escanear';
        document.getElementById('ocrStatus').className = 'status info';
    }

    async processOCR() {
        this.showStep('results');
        const status = document.getElementById('ocrStatus');
        status.textContent = 'Procesando imagen...';
        status.className = 'status info';
        // Preprocesar imagen antes de OCR
        preprocessImage(this.capturedImage, async (preprocessedDataUrl) => {
            try {
                const result = await this.tesseract.recognize(
                    preprocessedDataUrl,
                    'spa+eng',
                    {
                        logger: m => {
                            if (m.status === 'recognizing text') {
                                status.textContent = `Procesando... ${Math.round(m.progress * 100)}%`;
                            }
                        }
                    }
                );
                const rawText = result.data.text;
                this.ocrResults = ProductoParser.parseText(rawText);
                this.displayResults();
            } catch (error) {
                status.textContent = 'Error al procesar la imagen';
                status.className = 'status error';
            }
        });
    }

    displayResults() {
        const tbody = document.querySelector('#ocrResultsTable tbody');
        tbody.innerHTML = '';
        this.ocrResults.forEach((product, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="number" value="${product.cantidad || ''}" min="1" class="ocr-edit-input"></td>
                <td><input type="text" value="${product.nombre || ''}" class="ocr-edit-input"></td>
                <td><input type="text" value="${product.capacidad || ''}" class="ocr-edit-input"></td>
                <td><input type="text" value="${product.tipo || ''}" class="ocr-edit-input"></td>
                <td><input type="number" value="${product.precio || ''}" min="0" class="ocr-edit-input"></td>
                <td><button onclick="ocrSystem.deleteProduct(${index})" class="action-button delete-button">🗑️</button></td>
            `;
            tbody.appendChild(row);
        });
        document.getElementById('ocrResultsContainer').style.display = 'block';
        document.getElementById('ocrStatus').textContent = `Se detectaron ${this.ocrResults.length} productos`;
        document.getElementById('ocrStatus').className = 'status success';
    }

    deleteProduct(index) {
        this.ocrResults.splice(index, 1);
        this.displayResults();
    }

    confirmAndSend() {
        // Aquí puedes guardar los productos o hacer lo que necesites
        alert(`Se registraron ${this.ocrResults.length} productos`);
        this.closeOCR();
    }
}

// Inicializar sistema OCR
let ocrSystem;
document.addEventListener('DOMContentLoaded', () => {
    ocrSystem = new OCRSystem();
    // Puedes abrir el modal con ocrSystem.openOCR();
}); 