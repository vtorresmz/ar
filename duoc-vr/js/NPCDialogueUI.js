import * as THREE from 'three';

const DEFAULT_THEME = Object.freeze({
    backgroundTop: 'rgba(3, 14, 42, 0.98)',
    backgroundBottom: 'rgba(6, 22, 58, 0.98)',
    panelColor: 0x030e2a,
    panelBorderColor: 0x3a9fff,
    titleColor: '#7ecfff',
    subtitleColor: '#3d6a8e',
    textColor: '#b8d4f0',
    closeStroke: 'rgba(255, 120, 120, 0.7)',
    closeText: '#ffb0b0',
    optionGradientStart: 'rgba(58, 159, 255, 0.09)',
    optionGradientEnd: 'rgba(58, 159, 255, 0.14)',
    optionBorder: 'rgba(58, 159, 255, 0.35)',
    footerColor: '#3d6a8e'
});

export class NPCDialogueUI {
    constructor(config = {}) {
        this.name = config.name || 'NPC';
        this.role = config.role || 'Asistente Virtual';
        this.basePosition = (config.basePosition || new THREE.Vector3()).clone();
        this.offset = (config.offset || new THREE.Vector3(1.8, 1.5, 0.5)).clone();

        this.panelWidth = config.panelWidth || 3.5;
        this.panelHeight = config.panelHeight || 2.5;
        this.textPlaneScale = config.textPlaneScale || 0.96;
        this.pixelsPerUnit = config.pixelsPerUnit || 360;
        this.minCanvasHeight = config.minCanvasHeight || 720;
        this.maxCanvasHeight = config.maxCanvasHeight || 1200;
        this.fixedCanvasSize = Number.isFinite(config.canvasWidth) && Number.isFinite(config.canvasHeight);
        this.canvasWidth = Number.isFinite(config.canvasWidth) ? config.canvasWidth : null;
        this.canvasHeight = Number.isFinite(config.canvasHeight) ? config.canvasHeight : null;
        this.theme = { ...DEFAULT_THEME, ...(config.theme || {}) };
        this.fontSizeOffset = Number.isFinite(config.fontSizeOffset) ? config.fontSizeOffset : 2;
        this.showHitbox = config.showHitbox === true;

        this.vrButtons = [];
        this.group = new THREE.Group();
        this.group.visible = false;
        this.group.position.copy(this.basePosition).add(this.offset);

        this.computeCanvasSize();
        this.createBaseMeshes();
    }

    computeCanvasSize() {
        const aspect = this.panelWidth / this.panelHeight;
        if (this.fixedCanvasSize) {
            this.canvasHeight = Math.max(2, Math.round(this.canvasHeight));
            this.canvasWidth = Math.max(2, Math.round(this.canvasHeight * aspect));
            return;
        }

        const dynamicHeight = Math.round(this.panelHeight * this.pixelsPerUnit);
        const clampedHeight = Math.max(this.minCanvasHeight, Math.min(this.maxCanvasHeight, dynamicHeight));
        this.canvasHeight = Math.max(2, clampedHeight);
        this.canvasWidth = Math.max(2, Math.round(this.canvasHeight * aspect));
    }

    createBaseMeshes() {
        const panelGeometry = new THREE.PlaneGeometry(this.panelWidth, this.panelHeight);
        const panelMaterial = new THREE.MeshBasicMaterial({
            color: this.theme.panelColor,
            transparent: true,
            opacity: 0.98,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false
        });
        this.panel = new THREE.Mesh(panelGeometry, panelMaterial);
        this.panel.renderOrder = 1000;
        this.group.add(this.panel);

        const borderGeometry = new THREE.EdgesGeometry(panelGeometry);
        const borderMaterial = new THREE.LineBasicMaterial({
            color: this.theme.panelBorderColor,
            linewidth: 2,
            depthTest: false
        });
        this.border = new THREE.LineSegments(borderGeometry, borderMaterial);
        this.border.renderOrder = 1001;
        this.group.add(this.border);

        if (this.showHitbox) {
            const debugPanelGeometry = new THREE.PlaneGeometry(this.panelWidth, this.panelHeight);
            const debugPanelMaterial = new THREE.MeshBasicMaterial({
                color: 0x39ff9a,
                wireframe: true,
                transparent: true,
                opacity: 0.68,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false
            });
            this.debugPanelHitbox = new THREE.Mesh(debugPanelGeometry, debugPanelMaterial);
            this.debugPanelHitbox.position.z = 0.12;
            this.debugPanelHitbox.renderOrder = 1010;
            this.group.add(this.debugPanelHitbox);
        }

        this.canvas = document.createElement('canvas');
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error('No se pudo inicializar el contexto 2D del canvas de dialogo');
        }

        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;
        this.texture.needsUpdate = true;

        const textGeometry = new THREE.PlaneGeometry(
            this.panelWidth * this.textPlaneScale,
            this.panelHeight * this.textPlaneScale
        );
        const textMaterial = new THREE.MeshBasicMaterial({
            map: this.texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false
        });
        this.textMesh = new THREE.Mesh(textGeometry, textMaterial);
        this.textMesh.position.z = 0.01;
        this.textMesh.renderOrder = 1002;
        this.group.add(this.textMesh);

        this.buttonsContainer = new THREE.Group();
        this.buttonsContainer.position.z = 0.08;
        this.buttonsContainer.renderOrder = 1003;
        this.group.add(this.buttonsContainer);

        this.closeButton = this.createHitButton(0, 0, 0.2, 0.12, -1, 0xff5555);
        this.closeButton.userData.action = 'close';
        this.closeButton.position.set(this.panelWidth / 2 - 0.18, this.panelHeight / 2 - 0.14, 0.1);
        this.group.add(this.closeButton);
    }

    setPanelSize(width, height) {
        if (width <= 0 || height <= 0) return;

        this.panelWidth = width;
        this.panelHeight = height;
        this.computeCanvasSize();
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;

        const panelGeometry = new THREE.PlaneGeometry(this.panelWidth, this.panelHeight);
        this.panel.geometry.dispose();
        this.panel.geometry = panelGeometry;

        this.border.geometry.dispose();
        this.border.geometry = new THREE.EdgesGeometry(panelGeometry);

        if (this.debugPanelHitbox) {
            this.debugPanelHitbox.geometry.dispose();
            this.debugPanelHitbox.geometry = new THREE.PlaneGeometry(this.panelWidth, this.panelHeight);
        }

        this.textMesh.geometry.dispose();
        this.textMesh.geometry = new THREE.PlaneGeometry(
            this.panelWidth * this.textPlaneScale,
            this.panelHeight * this.textPlaneScale
        );

        this.closeButton.position.set(this.panelWidth / 2 - 0.18, this.panelHeight / 2 - 0.14, 0.1);
        this.texture.needsUpdate = true;
    }

    attachToScene(scene) {
        scene.add(this.group);
    }

    setBasePosition(position) {
        this.basePosition.copy(position);
        this.group.position.copy(this.basePosition).add(this.offset);
    }

    setVisible(visible) {
        this.group.visible = visible;
    }

    clearOptionButtons() {
        this.vrButtons.forEach((button) => {
            this.buttonsContainer.remove(button);
            if (button.userData.buttonMesh) {
                button.userData.buttonMesh.geometry.dispose();
                button.userData.buttonMesh.material.dispose();
            }
        });
        this.vrButtons.length = 0;
    }

    createHitButton(x, y, width, height, optionIndex, color) {
        const buttonGroup = new THREE.Group();
        const buttonGeometry = new THREE.PlaneGeometry(width, height);
        const buttonMaterial = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: this.showHitbox ? 0.24 : 0.0,
            wireframe: this.showHitbox,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false
        });

        const buttonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);
        buttonMesh.renderOrder = 1003;
        buttonGroup.add(buttonMesh);

        buttonGroup.position.set(x, y, 0.08);
        buttonGroup.renderOrder = 1003;
        buttonGroup.userData.isVRButton = true;
        buttonGroup.userData.optionIndex = optionIndex;
        buttonGroup.userData.baseColor = color;
        buttonGroup.userData.buttonMesh = buttonMesh;
        return buttonGroup;
    }

    addOptionHitArea(rect, optionIndex) {
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;

        const hitPlaneWidth = this.panelWidth * this.textPlaneScale;
        const hitPlaneHeight = this.panelHeight * this.textPlaneScale;
        const worldX = ((centerX / this.canvasWidth) - 0.5) * hitPlaneWidth;
        const worldY = (0.5 - (centerY / this.canvasHeight)) * hitPlaneHeight;
        const worldWidth = (rect.width / this.canvasWidth) * hitPlaneWidth;
        const worldHeight = (rect.height / this.canvasHeight) * hitPlaneHeight;

        const button = this.createHitButton(worldX, worldY, worldWidth, worldHeight, optionIndex, 0x1a5aff);
        this.buttonsContainer.add(button);
        this.vrButtons.push(button);
    }

    updateCloseHitArea(rect) {
        if (!this.closeButton || !rect) return;

        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;
        const hitPlaneWidth = this.panelWidth * this.textPlaneScale;
        const hitPlaneHeight = this.panelHeight * this.textPlaneScale;
        const worldX = ((centerX / this.canvasWidth) - 0.5) * hitPlaneWidth;
        const worldY = (0.5 - (centerY / this.canvasHeight)) * hitPlaneHeight;
        const worldWidth = (rect.width / this.canvasWidth) * hitPlaneWidth;
        const worldHeight = (rect.height / this.canvasHeight) * hitPlaneHeight;

        this.closeButton.position.set(worldX, worldY, 0.1);
        if (this.closeButton.userData?.buttonMesh) {
            const mesh = this.closeButton.userData.buttonMesh;
            mesh.geometry.dispose();
            mesh.geometry = new THREE.PlaneGeometry(
                Math.max(0.01, worldWidth),
                Math.max(0.01, worldHeight)
            );
        }
    }

    splitLongWord(ctx, word, maxWidth) {
        const chunks = [];
        let chunk = '';
        for (let i = 0; i < word.length; i += 1) {
            const nextChunk = `${chunk}${word[i]}`;
            if (ctx.measureText(nextChunk).width > maxWidth && chunk.length > 0) {
                chunks.push(chunk);
                chunk = word[i];
            } else {
                chunk = nextChunk;
            }
        }
        if (chunk.length > 0) {
            chunks.push(chunk);
        }
        return chunks;
    }

    wrapText(ctx, text, maxWidth) {
        if (!text) return [''];
        const words = `${text}`.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach((word) => {
            const pieces = ctx.measureText(word).width > maxWidth
                ? this.splitLongWord(ctx, word, maxWidth)
                : [word];

            pieces.forEach((piece) => {
                const candidate = currentLine ? `${currentLine} ${piece}` : piece;
                if (ctx.measureText(candidate).width > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = piece;
                } else {
                    currentLine = candidate;
                }
            });
        });

        if (currentLine) lines.push(currentLine);
        return lines;
    }

    ellipsize(ctx, text, maxWidth) {
        if (ctx.measureText(text).width <= maxWidth) return text;
        let candidate = text;
        while (candidate.length > 4 && ctx.measureText(`${candidate}...`).width > maxWidth) {
            candidate = candidate.slice(0, -1);
        }
        return `${candidate}...`;
    }

    buildMetrics() {
        const scale = this.canvasHeight / 768;
        const fontOffset = this.fontSizeOffset;
        return {
            padding: Math.round(28 * scale),
            headerHeight: Math.round(112 * scale),
            footerHeight: Math.round(42 * scale),
            lineHeight: Math.round(30 * scale),
            optionHeight: Math.round(50 * scale),
            optionGap: Math.round(10 * scale),
            optionRadius: Math.round(10 * scale),
            titleFont: Math.round(28 * scale) + fontOffset,
            subtitleFont: Math.round(15 * scale) + fontOffset,
            bodyFont: Math.round(19 * scale) + fontOffset,
            optionFont: Math.round(16 * scale) + fontOffset,
            closeFont: Math.round(20 * scale) + fontOffset,
            footerFont: Math.round(13 * scale) + fontOffset,
            closeBoxWidth: Math.round(40 * scale),
            closeBoxHeight: Math.round(28 * scale),
            closeBoxTop: Math.round(16 * scale),
            closeBoxRightMargin: Math.round(28 * scale)
        };
    }

    render(lines, options = []) {
        const contentLines = Array.isArray(lines) ? lines : [String(lines || '')];
        const contentOptions = Array.isArray(options) ? options : [];
        this.clearOptionButtons();

        const ctx = this.ctx;
        const width = this.canvasWidth;
        const height = this.canvasHeight;
        const metrics = this.buildMetrics();

        ctx.clearRect(0, 0, width, height);

        const background = ctx.createLinearGradient(0, 0, 0, height);
        background.addColorStop(0, this.theme.backgroundTop);
        background.addColorStop(1, this.theme.backgroundBottom);
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);

        // Header
        ctx.fillStyle = this.theme.titleColor;
        ctx.font = `bold ${metrics.titleFont}px Arial, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(this.name, metrics.padding, Math.round(16 * (this.canvasHeight / 768)));

        ctx.fillStyle = this.theme.subtitleColor;
        ctx.font = `${metrics.subtitleFont}px Arial, sans-serif`;
        ctx.fillText(this.role, metrics.padding, Math.round(54 * (this.canvasHeight / 768)));

        // Close icon hint
        const closeX = width - metrics.closeBoxRightMargin - metrics.closeBoxWidth;
        const closeY = metrics.closeBoxTop;
        ctx.strokeStyle = this.theme.closeStroke;
        ctx.lineWidth = 2;
        ctx.strokeRect(closeX, closeY, metrics.closeBoxWidth, metrics.closeBoxHeight);
        ctx.save();
        ctx.fillStyle = this.theme.closeText;
        ctx.font = `bold ${metrics.closeFont}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('X', closeX + (metrics.closeBoxWidth / 2), closeY + (metrics.closeBoxHeight / 2));
        ctx.restore();
        this.updateCloseHitArea({
            x: closeX,
            y: closeY,
            width: metrics.closeBoxWidth,
            height: metrics.closeBoxHeight
        });

        ctx.strokeStyle = 'rgba(58, 159, 255, 0.22)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(metrics.padding, metrics.headerHeight);
        ctx.lineTo(width - metrics.padding, metrics.headerHeight);
        ctx.stroke();

        // Layout body/options
        const optionCount = contentOptions.length;
        const optionsBlockHeight = optionCount > 0
            ? optionCount * metrics.optionHeight + (optionCount - 1) * metrics.optionGap + 16
            : 0;
        const optionsTop = height - metrics.footerHeight - optionsBlockHeight;
        const bodyTop = metrics.headerHeight + 16;
        const bodyBottom = optionCount > 0 ? optionsTop - 14 : height - metrics.footerHeight - 14;
        const bodyMaxWidth = width - (metrics.padding * 2);

        // Main text content
        ctx.font = `${metrics.bodyFont}px Arial, sans-serif`;
        ctx.fillStyle = this.theme.textColor;
        let y = bodyTop;

        const flattenedLines = [];
        contentLines.forEach((line) => {
            if (!line) {
                flattenedLines.push('');
                return;
            }
            this.wrapText(ctx, line, bodyMaxWidth).forEach((wrapped) => flattenedLines.push(wrapped));
        });

        for (let i = 0; i < flattenedLines.length; i += 1) {
            const line = flattenedLines[i];
            const nextY = y + metrics.lineHeight;
            if (nextY > bodyBottom) {
                if (line && y + metrics.lineHeight <= bodyBottom + 8) {
                    ctx.fillText(this.ellipsize(ctx, line, bodyMaxWidth), metrics.padding, y);
                }
                break;
            }
            if (line === '') {
                y += Math.floor(metrics.lineHeight * 0.45);
            } else {
                ctx.fillText(line, metrics.padding, y);
                y += metrics.lineHeight;
            }
        }

        // Options
        contentOptions.forEach((option, index) => {
            const buttonY = optionsTop + 8 + index * (metrics.optionHeight + metrics.optionGap);
            const buttonWidth = width - (metrics.padding * 2);
            const radius = metrics.optionRadius;

            const optionGradient = ctx.createLinearGradient(
                metrics.padding,
                buttonY,
                width - metrics.padding,
                buttonY + metrics.optionHeight
            );
            optionGradient.addColorStop(0, this.theme.optionGradientStart);
            optionGradient.addColorStop(1, this.theme.optionGradientEnd);
            ctx.fillStyle = optionGradient;

            ctx.beginPath();
            ctx.moveTo(metrics.padding + radius, buttonY);
            ctx.lineTo(metrics.padding + buttonWidth - radius, buttonY);
            ctx.quadraticCurveTo(
                metrics.padding + buttonWidth,
                buttonY,
                metrics.padding + buttonWidth,
                buttonY + radius
            );
            ctx.lineTo(metrics.padding + buttonWidth, buttonY + metrics.optionHeight - radius);
            ctx.quadraticCurveTo(
                metrics.padding + buttonWidth,
                buttonY + metrics.optionHeight,
                metrics.padding + buttonWidth - radius,
                buttonY + metrics.optionHeight
            );
            ctx.lineTo(metrics.padding + radius, buttonY + metrics.optionHeight);
            ctx.quadraticCurveTo(
                metrics.padding,
                buttonY + metrics.optionHeight,
                metrics.padding,
                buttonY + metrics.optionHeight - radius
            );
            ctx.lineTo(metrics.padding, buttonY + radius);
            ctx.quadraticCurveTo(metrics.padding, buttonY, metrics.padding + radius, buttonY);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = this.theme.optionBorder;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = this.theme.titleColor;
            ctx.font = `${metrics.optionFont}px Arial, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                this.ellipsize(ctx, `${index + 1}. ${option}`, buttonWidth - 30),
                metrics.padding + 15,
                buttonY + metrics.optionHeight / 2
            );

            this.addOptionHitArea(
                { x: metrics.padding, y: buttonY, width: buttonWidth, height: metrics.optionHeight },
                index
            );
        });

        // Footer
        ctx.fillStyle = this.theme.footerColor;
        ctx.font = `${metrics.footerFont}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('VR: apunta + gatillo | PC: click o teclas 1-9 | X para cerrar', width / 2, height - 20);

        this.texture.needsUpdate = true;
    }
}
