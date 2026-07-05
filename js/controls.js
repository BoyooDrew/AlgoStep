/* =====================================================
 * controls.js —— 控制栏事件绑定
 *
 * 推荐：只传一个 options 对象（controller + 各种回调）
 *
 *   bindControls({
 *       controller: controller,                 // 必须：StepController 实例
 *       onGenerate: () => { ... },              // 可选：点击"生成场景"
 *       onReset:    () => { ... },              // 可选：点击"重置"
 *       onReplay:   () => { ... },              // 可选：点击"重新播放"
 *       onStep:     (step, index) => { ... },   // 可选：每步额外执行的可视化
 *       speedLabel: { 400: '很快', 800: '快', 1500: '中等', 3000: '慢' }  // 可选
 *   });
 *
 * 绑定的 HTML 元素（全部可选，找不到则自动忽略）：
 *   按钮：#btnGenerate / #btnReset / #btnStart / #btnPause
 *         #btnPrev / #btnNext / #btnReplay
 *         (或旧版：#btn-play / #btn-pause / #btn-prev / #btn-next)
 *   速度：#speed-slider / #speed-value / #speed-label
 *   进度：#progress-slider / #progress-text
 *   键盘：空格 播放/暂停，←/→ 上一步/下一步，R 重置
 * ===================================================== */

function updateSliderFill(el) {
    if (!el) return;
    const min = Number(el.min) || 0;
    const max = Number(el.max) || 100;
    const val = Number(el.value) || 0;
    const percent = (max - min) === 0 ? 0 : Math.max(0, Math.min(100, Math.round((val - min) / (max - min) * 100)));
    el.style.setProperty('--percent', String(percent));
}

function bindControls(options) {
    if (!options) options = {};
    const controller = options.controller;
    if (!controller) {
        console.warn('[bindControls] 必须传入 controller');
        return;
    }

    // ===== 通用按钮绑定：新版命名优先，找不到则回退旧版 =====
    function bind(id, altId, fn) {
        const el = document.getElementById(id) || (altId && document.getElementById(altId));
        if (!el || !fn) return;
        el.addEventListener('click', (e) => {
            try { fn(e); } catch (err) { console.error('[bindControls]', err); }
        });
    }

    bind('btnGenerate', null, () => {
        if (typeof options.onGenerate === 'function') options.onGenerate();
        else if (typeof options.generate === 'function') options.generate();
    });

    bind('btnReset', null, () => {
        if (typeof options.onReset === 'function') options.onReset();
        else controller.reset();
    });

    bind('btnStart', 'btn-play', () => controller.play());
    bind('btnPause', 'btn-pause', () => controller.pause());
    bind('btnPrev',  'btn-prev',  () => {
        if (typeof options.onPrev === 'function') options.onPrev();
        else controller.prev();
    });
    bind('btnNext',  'btn-next',  () => {
        if (typeof options.onNext === 'function') options.onNext();
        else controller.next();
    });
    bind('btnReplay', null, () => {
        if (typeof options.onReplay === 'function') options.onReplay();
        else { controller.reset(); setTimeout(() => controller.play(), 30); }
    });

    // ===== 速度滑块 =====
    const speedSlider = document.getElementById('speed-slider');
    const speedValue  = document.getElementById('speed-value');
    const speedLabel  = document.getElementById('speed-label');

    function updateSpeed() {
        if (!speedSlider) return;
        const v = Math.max(50, Number(speedSlider.value) || 800);
        controller.setSpeed(v);
        if (speedValue) speedValue.textContent = v + 'ms';
        if (speedLabel) {
            let text = '中等';
            if (v <= 300) text = '很快';
            else if (v <= 600) text = '较快';
            else if (v <= 1200) text = '中等';
            else if (v <= 2000) text = '较慢';
            else text = '很慢';
            if (options.speedLabel && options.speedLabel[v] != null) {
                text = options.speedLabel[v];
            }
            speedLabel.textContent = text;
        }
        updateSliderFill(speedSlider);
    }
    if (speedSlider) {
        speedSlider.addEventListener('input', updateSpeed);
        updateSpeed();
    }

    // ===== 进度滑块 =====
    const progressSlider = document.getElementById('progress-slider');
    if (progressSlider) {
        progressSlider.addEventListener('input', () => {
            const idx = Math.max(0, Number(progressSlider.value) || 0) - 1;
            if (typeof options.onSeek === 'function') {
                options.onSeek(idx);
            } else {
                controller.goTo(idx);
            }
            updateSliderFill(progressSlider);
        });
        updateSliderFill(progressSlider);
    }

    // ===== 键盘快捷键 =====
    document.addEventListener('keydown', (e) => {
        if (!e.target) return;
        const tag = (e.target.tagName || '').toUpperCase();
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

        switch (e.key) {
            case ' ':
                e.preventDefault();
                controller.toggle();
                break;
            case 'ArrowRight':
                if (typeof options.onNext === 'function') options.onNext();
                else controller.next();
                break;
            case 'ArrowLeft':
                if (typeof options.onPrev === 'function') options.onPrev();
                else controller.prev();
                break;
            case 'r':
            case 'R':
                if (typeof options.onReset === 'function') options.onReset();
                else controller.reset();
                break;
            case 'g':
            case 'G':
                if (typeof options.onGenerate === 'function') options.onGenerate();
                break;
        }
    });

    // ===== 控制器回钩：每次步骤变化都刷新进度条填充色 =====
    const orig = controller.onStep.bind(controller);
    controller.onStep = function (a, b) {
        try { orig(a, b); } catch (_) {}
        try { updateSliderFill(progressSlider); } catch (_) {}
    };

    controller._onPlayStateChange(false);
    controller._syncUI();
}

if (typeof window !== 'undefined') {
    window.bindControls = bindControls;
    window.updateSliderFill = updateSliderFill;
}
