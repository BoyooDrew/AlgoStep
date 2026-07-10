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

// 每个 controller 关联的监听器引用，支持重复绑定前自动解绑旧的
const _bindings = new WeakMap();

function updateSliderFill(el) {
    if (!el) return;
    const min = Number(el.min) || 0;
    const max = Number(el.max) || 100;
    const val = Number(el.value) || 0;
    const percent = (max - min) === 0 ? 0 : Math.max(0, Math.min(100, Math.round((val - min) / (max - min) * 100)));
    el.style.setProperty('--percent', String(percent));
}

// 解析速度标签：
//   - 新格式：[{ max: 300, text: '很快' }, { max: 600, text: '较快' }, ...]
//   - 旧格式：{ 400: '很快', 800: '快', 1500: '中等', 3000: '慢' }（精确值）
// 返回命中的文字，未命中返回 null，交由调用方做兜底。
function resolveSpeedLabel(v, speedLabel) {
    if (!speedLabel) return null;

    if (Array.isArray(speedLabel)) {
        for (const item of speedLabel) {
            if (item && item.max != null && v <= Number(item.max)) {
                return item.text;
            }
        }
        return null;
    }

    if (typeof speedLabel === 'object') {
        if (speedLabel[v] != null) return speedLabel[v];
        // 兜底：若未命中精确值，尝试把 key 当数值找最近的上界（<= key 的最大 key）
        let bestKey = null;
        for (const k of Object.keys(speedLabel)) {
            const nk = Number(k);
            if (!Number.isNaN(nk) && v <= nk) {
                if (bestKey === null || nk < bestKey) bestKey = nk;
            }
        }
        if (bestKey !== null && speedLabel[bestKey] != null) return speedLabel[bestKey];
    }

    return null;
}

function _unbindController(controller) {
    if (!controller) return;
    const prev = _bindings.get(controller);
    if (!prev) return;

    // 移除键盘快捷键
    if (prev.keydownHandler) {
        document.removeEventListener('keydown', prev.keydownHandler);
    }

    // 移除滑块 input 监听
    if (prev.speedHandler && prev.speedSlider) {
        prev.speedSlider.removeEventListener('input', prev.speedHandler);
    }
    if (prev.progressHandler && prev.progressSlider) {
        prev.progressSlider.removeEventListener('input', prev.progressHandler);
    }

    // 移除按钮 click 监听
    if (Array.isArray(prev.buttonBindings)) {
        prev.buttonBindings.forEach(({ el, handler }) => {
            if (el && handler) el.removeEventListener('click', handler);
        });
    }

    // 还原 controller.onStep（仅当还是我们包装的那个时才还原，避免覆盖外部更新）
    if (typeof prev.origOnStep === 'function') {
        if (controller.onStep === prev.wrappedOnStep) {
            controller.onStep = prev.origOnStep;
        }
    }

    _bindings.delete(controller);
}

function bindControls(options) {
    if (!options) options = {};
    const controller = options.controller;
    if (!controller) {
        console.warn('[bindControls] 必须传入 controller');
        return;
    }

    // 如果之前绑定过同一个 controller，先完整解绑旧的监听器，防止叠加
    _unbindController(controller);

    const buttonBindings = [];

    // ===== 通用按钮绑定：新版命名优先，找不到则回退旧版 =====
    function bind(id, altId, fn) {
        const el = document.getElementById(id) || (altId && document.getElementById(altId));
        if (!el || !fn) return;
        const handler = (e) => {
            try { fn(e); } catch (err) { console.error('[bindControls]', err); }
        };
        el.addEventListener('click', handler);
        buttonBindings.push({ el, handler });
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
            // 先尝试用 speedLabel 命中（支持数组区间与旧对象精确/上界匹配）
            let text = resolveSpeedLabel(v, options.speedLabel);
            // 未命中则用内置区间兜底
            if (!text) {
                if (v <= 300) text = '很快';
                else if (v <= 600) text = '较快';
                else if (v <= 1200) text = '中等';
                else if (v <= 2000) text = '较慢';
                else text = '很慢';
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
    let progressHandler = null;
    if (progressSlider) {
        progressHandler = () => {
            const idx = Math.max(0, Number(progressSlider.value) || 0) - 1;
            if (typeof options.onSeek === 'function') {
                options.onSeek(idx);
            } else {
                controller.goTo(idx);
            }
            updateSliderFill(progressSlider);
        };
        progressSlider.addEventListener('input', progressHandler);
        updateSliderFill(progressSlider);
    }

    // ===== 键盘快捷键 =====
    const keydownHandler = (e) => {
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
    };
    document.addEventListener('keydown', keydownHandler);

    // ===== 控制器回钩：每次步骤变化都刷新进度条填充色 =====
    // 保存当前（原始的或上游的）onStep，并用稳定包装函数替换，
    // 这样多次调用 bindControls 时会先在 _unbindController 中还原，
    // 避免 controller.onStep 被层层嵌套。
    const origOnStep = controller.onStep;
    const wrappedOnStep = function (a, b) {
        try { if (typeof origOnStep === 'function') origOnStep.call(controller, a, b); } catch (_) {}
        try { updateSliderFill(progressSlider); } catch (_) {}
    };
    controller.onStep = wrappedOnStep;

    // 保存所有监听器引用，供下次调用 bindControls 时自动解绑
    _bindings.set(controller, {
        keydownHandler: keydownHandler,
        speedHandler: speedSlider ? updateSpeed : null,
        speedSlider: speedSlider,
        progressHandler: progressHandler,
        progressSlider: progressSlider,
        buttonBindings: buttonBindings,
        origOnStep: origOnStep,
        wrappedOnStep: wrappedOnStep
    });

    controller._onPlayStateChange(false);
    controller._syncUI();
}

if (typeof window !== 'undefined') {
    window.bindControls = bindControls;
    window.updateSliderFill = updateSliderFill;
    window.resolveSpeedLabel = resolveSpeedLabel;
}
