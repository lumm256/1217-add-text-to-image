// 应用状态管理
const AppState = {
    uploadedImage: null,
    watermarkImage: null,
    watermarkPosition: 'bottom-right',
    generatedImageData: null
};

// 常量配置
const CONFIG = {
    LINE_HEIGHT_RATIO: 1.3,  // 行高为字体大小的1.3倍
    SUBTITLE_PADDING: 40,    // 字幕区域上下内边距
    IMAGE_QUALITY: 0.9,      // JPEG压缩质量
    SUBTITLE_GAP: 3          // 字幕行间距（像素值，百叶窗缝隙）
};

// DOM元素引用
const elements = {
    fileInput: document.getElementById('fileInput'),
    uploadBtn: document.getElementById('uploadBtn'),
    fileName: document.getElementById('fileName'),
    generateBtn: document.getElementById('generateBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    previewContainer: document.getElementById('previewContainer'),

    fontSize: document.getElementById('fontSize'),
    fontColor: document.getElementById('fontColor'),
    outlineColor: document.getElementById('outlineColor'),
    subtitleText: document.getElementById('subtitleText'),

    watermarkEnabled: document.getElementById('watermarkEnabled'),
    watermarkControls: document.getElementById('watermarkControls'),
    watermarkType: document.getElementsByName('watermarkType'),
    watermarkText: document.getElementById('watermarkText'),
    watermarkImage: document.getElementById('watermarkImage'),
    watermarkSize: document.getElementById('watermarkSize'),
    watermarkSizeValue: document.getElementById('watermarkSizeValue'),
    watermarkOpacity: document.getElementById('watermarkOpacity'),
    watermarkOpacityValue: document.getElementById('watermarkOpacityValue'),
    watermarkColor: document.getElementById('watermarkColor'),
    watermarkTextGroup: document.getElementById('watermarkTextGroup'),
    watermarkImageGroup: document.getElementById('watermarkImageGroup'),
    watermarkColorGroup: document.getElementById('watermarkColorGroup')
};

// 初始化事件监听
function initEventListeners() {
    elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleImageUpload);
    elements.generateBtn.addEventListener('click', generateImage);
    elements.downloadBtn.addEventListener('click', downloadImage);

    elements.watermarkEnabled.addEventListener('change', toggleWatermarkControls);
    elements.watermarkSize.addEventListener('input', updateSizeDisplay);
    elements.watermarkOpacity.addEventListener('input', updateOpacityDisplay);
    elements.watermarkImage.addEventListener('change', handleWatermarkImageUpload);

    elements.watermarkType.forEach(radio => {
        radio.addEventListener('change', handleWatermarkTypeChange);
    });

    document.querySelectorAll('.position-btn').forEach(btn => {
        btn.addEventListener('click', handlePositionSelect);
    });
}

// 图片上传处理 - 修改：直接显示预览
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('请上传JPG、PNG或WEBP格式的图片！');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            AppState.uploadedImage = img;
            elements.fileName.textContent = file.name;
            elements.generateBtn.disabled = false;

            // 直接显示原图预览
            elements.previewContainer.innerHTML = `<img src="${e.target.result}" alt="上传的图片">`;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 水印图片上传处理
function handleWatermarkImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            AppState.watermarkImage = img;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 水印控制面板显示切换
function toggleWatermarkControls() {
    elements.watermarkControls.style.display =
        elements.watermarkEnabled.checked ? 'block' : 'none';
}

// 水印类型切换
function handleWatermarkTypeChange(event) {
    const isText = event.target.value === 'text';
    elements.watermarkTextGroup.style.display = isText ? 'block' : 'none';
    elements.watermarkImageGroup.style.display = isText ? 'none' : 'block';
    elements.watermarkColorGroup.style.display = isText ? 'block' : 'none';
}

// 水印位置选择
function handlePositionSelect(event) {
    document.querySelectorAll('.position-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    AppState.watermarkPosition = event.target.dataset.position;
}

// 更新滑块显示值
function updateSizeDisplay() {
    elements.watermarkSizeValue.textContent = elements.watermarkSize.value;
}

function updateOpacityDisplay() {
    elements.watermarkOpacityValue.textContent = elements.watermarkOpacity.value;
}

// 核心：生成图片 - 向下拼接模式
function generateImage() {
    if (!AppState.uploadedImage) {
        alert('请先上传图片！');
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const img = AppState.uploadedImage;
    const lines = elements.subtitleText.value.split('\n').filter(line => line.trim());
    const fontSize = parseInt(elements.fontSize.value);
    const lineHeight = fontSize * CONFIG.LINE_HEIGHT_RATIO;

    // 计算字幕区域总高度（每行lineHeight + 行间gap）
    const gap = CONFIG.SUBTITLE_GAP;
    const subtitleAreaHeight = lines.length > 0
        ? lines.length * lineHeight + (lines.length - 1) * gap
        : 0;

    // 设置Canvas尺寸：原图高度 + 字幕区域高度
    canvas.width = img.width;
    canvas.height = img.height + subtitleAreaHeight;

    // 1. 绘制完整原图
    ctx.drawImage(img, 0, 0);

    // 2. 在原图底部拼接字幕行
    if (lines.length > 0) {
        drawSubtitlesStitched(ctx, canvas, img, lines, fontSize, lineHeight);
    }

    // 3. 绘制水印（只在原图区域）
    if (elements.watermarkEnabled.checked) {
        drawWatermark(ctx, img.width, img.height);
    }

    // 根据原图格式决定输出格式和质量
    const imageFormat = getImageFormat();
    const resultImage = canvas.toDataURL(imageFormat.mimeType, imageFormat.quality);
    AppState.generatedImageData = resultImage;

    elements.previewContainer.innerHTML = `<img src="${resultImage}" alt="生成的图片">`;
    elements.downloadBtn.disabled = false;
}

// 获取图片格式和质量
function getImageFormat() {
    const uploadedFile = elements.fileInput.files[0];
    if (uploadedFile && uploadedFile.type === 'image/jpeg') {
        return { mimeType: 'image/jpeg', quality: CONFIG.IMAGE_QUALITY };
    }
    // PNG和WEBP保持原样
    return { mimeType: 'image/png', quality: 1.0 };
}

// 绘制字幕 - 向下拼接模式（在原图底部追加字幕行）
function drawSubtitlesStitched(ctx, canvas, img, lines, fontSize, lineHeight) {
    const fontColor = elements.fontColor.value;
    const outlineColor = elements.outlineColor.value;
    const gap = CONFIG.SUBTITLE_GAP;

    // 设置字体
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;

    // 裁剪原图最底部一行作为"模板背景"（所有字幕行都复制这个）
    const templateSourceY = img.height - lineHeight;

    // 逐行在原图底部拼接字幕
    lines.forEach((line, index) => {
        // 计算当前行在Canvas上的Y坐标（原图高度 + 之前字幕行的高度 + 间隙）
        const canvasY = img.height + index * (lineHeight + gap);

        // 1. 绘制原图底部切片作为背景（所有行都复制同一个底部切片）
        ctx.drawImage(
            img,
            0, templateSourceY, img.width, lineHeight,  // 源：原图最底部一行
            0, canvasY, canvas.width, lineHeight         // 目标：拼接位置
        );

        // 2. 叠加半透明黑色遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, canvasY, canvas.width, lineHeight);

        // 3. 绘制文字（每行文字不同）
        const textX = canvas.width / 2;
        const textY = canvasY + lineHeight / 2;

        // 绘制描边
        ctx.strokeStyle = outlineColor;
        ctx.strokeText(line, textX, textY);

        // 绘制文字
        ctx.fillStyle = fontColor;
        ctx.fillText(line, textX, textY);
    });

    // 4. 绘制行间间隙（复制原图底部对应位置）
    for (let i = 0; i < lines.length - 1; i++) {
        const gapCanvasY = img.height + (i + 1) * lineHeight + i * gap;

        // 间隙也从原图底部附近裁剪
        ctx.drawImage(
            img,
            0, templateSourceY, img.width, gap,
            0, gapCanvasY, canvas.width, gap
        );
    }
}

// 绘制水印
function drawWatermark(ctx, canvasWidth, canvasHeight) {
    const watermarkType = Array.from(elements.watermarkType).find(r => r.checked).value;
    const opacity = parseInt(elements.watermarkOpacity.value) / 100;

    ctx.globalAlpha = opacity;

    if (watermarkType === 'text') {
        drawTextWatermark(ctx, canvasWidth, canvasHeight);
    } else {
        drawImageWatermark(ctx, canvasWidth, canvasHeight);
    }

    ctx.globalAlpha = 1.0;
}

// 绘制文字水印
function drawTextWatermark(ctx, canvasWidth, canvasHeight) {
    const text = elements.watermarkText.value;
    if (!text) return;

    const size = parseInt(elements.watermarkSize.value);
    const color = elements.watermarkColor.value;

    ctx.font = `${size}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'bottom';  // 设置基线为底部

    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = size;

    const position = calculateWatermarkPosition(canvasWidth, canvasHeight, textWidth, textHeight);

    // 根据位置设置文字对齐方式
    if (position.align === 'left') {
        ctx.textAlign = 'left';
    } else if (position.align === 'right') {
        ctx.textAlign = 'right';
    } else {
        ctx.textAlign = 'center';
    }

    ctx.fillText(text, position.x, position.y);
}

// 绘制图片水印
function drawImageWatermark(ctx, canvasWidth, canvasHeight) {
    if (!AppState.watermarkImage) return;

    const wmImg = AppState.watermarkImage;
    const scale = parseInt(elements.watermarkSize.value) / 60;
    const wmWidth = wmImg.width * scale * 0.3;
    const wmHeight = wmImg.height * scale * 0.3;

    const position = calculateWatermarkPosition(canvasWidth, canvasHeight, wmWidth, wmHeight);

    ctx.drawImage(wmImg, position.x, position.y - wmHeight, wmWidth, wmHeight);
}

// 计算水印位置（文字水印使用textAlign，返回对齐信息）
function calculateWatermarkPosition(canvasWidth, canvasHeight, width, height) {
    const padding = 20;
    const positions = {
        'top-left': { x: padding, y: padding + height, align: 'left' },
        'top-center': { x: canvasWidth / 2, y: padding + height, align: 'center' },
        'top-right': { x: canvasWidth - padding, y: padding + height, align: 'right' },
        'middle-left': { x: padding, y: canvasHeight / 2, align: 'left' },
        'middle-center': { x: canvasWidth / 2, y: canvasHeight / 2, align: 'center' },
        'middle-right': { x: canvasWidth - padding, y: canvasHeight / 2, align: 'right' },
        'bottom-left': { x: padding, y: canvasHeight - padding, align: 'left' },
        'bottom-center': { x: canvasWidth / 2, y: canvasHeight - padding, align: 'center' },
        'bottom-right': { x: canvasWidth - padding, y: canvasHeight - padding, align: 'right' }
    };

    return positions[AppState.watermarkPosition] || positions['bottom-right'];
}

// 下载图片 - 根据格式设置文件扩展名
function downloadImage() {
    if (!AppState.generatedImageData) {
        alert('请先生成图片！');
        return;
    }

    const uploadedFile = elements.fileInput.files[0];
    const extension = uploadedFile && uploadedFile.type === 'image/jpeg' ? 'jpg' : 'png';

    const link = document.createElement('a');
    link.download = `subtitle-image-${Date.now()}.${extension}`;
    link.href = AppState.generatedImageData;
    link.click();
}

// 初始化应用
initEventListeners();
