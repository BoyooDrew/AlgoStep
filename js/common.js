/* =====================================================
 * common.js —— StepController 步骤控制器
 *
 * 统一构造方式：
 *   const controller = new StepController({
 *       steps: [{ en, zh, codeLines?, formula? }, ...],
 *       autoSpeed: 800,                   // 每步间隔 (ms)
 *       statusElement: document.getElementById('status'), // 可选
 *       onStep: (step, index) => {},      // 进入新步骤时的回调
 *       onFinish: () => {},
 *       onReset: () => {},
 *       onChangeSpeed: (ms) => {}
 *   });
 *
 *  API：
 *   controller.play() / pause() / toggle()
 *   controller.prev() / next() / goTo(index)   // index 从 -1 开始
 *   controller.reset()
 *   controller.setSpeed(ms)
 *   controller.setSteps(stepsArray)            // 替换步骤并重置 UI
 *   controller.init()                          // 重置为 "准备中"
 *   controller.setStatus(text) / setStatusSuccess(text)
 *   controller.updateStepInfo() / updateProgress()
 *   controller.resetButtons() / _onPlayStateChange(bool)
 *
 *  只读属性：
 *   controller.step / controller.currentStep / controller.totalSteps
 *   controller.isPlaying
 * ===================================================== */

class StepController {
    constructor(options = {}) {
        this.config = options || {};
        this.steps = options.steps || [];
        this.autoSpeed = options.autoSpeed != null ? Number(options.autoSpeed) : (options.delay != null ? Number(options.delay) : 800);
        this.statusElement = options.statusElement || null;

        this.onStep = options.onStep || function () {};
        this.onFinish = options.onFinish || function () {};
        this.onReset = options.onReset || function () {};
        this.onChangeSpeed = options.onChangeSpeed || function () {};

        this.index = -1;
        this.playing = false;
        this._timer = null;
    }

    // ===== 只读属性 =====
    get currentStep() { return Math.max(0, this.index); }
    get totalSteps() { return this.steps.length; }
    get step() { return this.steps[this.index] || null; }
    get isPlaying() { return !!this.playing; }

    // ===== 批量替换步骤（保证页面动态修改后依然生效）=====
    setSteps(steps) {
        this.steps = Array.isArray(steps) ? steps : [];
        this.config.steps = this.steps;
        this.init();
    }

    // ===== 步骤跳转 =====
    goTo(index) {
        if (!this.steps.length) return;
        const clamped = Math.max(-1, Math.min(this.steps.length - 1, index));
        this.index = clamped;

        if (this.index >= 0) {
            // 同时兼容 onStep(step, index) 与 onStep(index)
            try {
                if (this.onStep.length >= 2) {
                    this.onStep(this.steps[this.index], this.index);
                } else {
                    this.onStep(this.index);
                }
            } catch (err) {
                console.error('[StepController] onStep 出错：', err);
            }
        }

        this.updateStepInfo();
        this.updateProgress();
        this._syncUI();

        if (this.index >= this.steps.length - 1) {
            try { this.onFinish(); } catch (_) {}
        }
    }

    next() {
        if (this.index >= this.steps.length - 1) { this.pause(); return; }
        this.goTo(this.index + 1);
    }

    prev() {
        if (this.index <= -1) return;
        this.goTo(this.index - 1);
    }

    reset() {
        this.pause();
        this.goTo(-1);
        try { this.onReset(); } catch (_) {}
    }

    // ===== 播放控制 =====
    play() {
        if (!this.steps.length) return;
        if (this.playing) return;
        if (this.index >= this.steps.length - 1) this.index = -1;
        this.playing = true;
        this._scheduleNext();
        this._syncUI();
        this._onPlayStateChange(true);
    }

    pause() {
        this.playing = false;
        if (this._timer) { clearTimeout(this._timer); this._timer = null; }
        this._syncUI();
        this._onPlayStateChange(false);
    }

    toggle() { this.playing ? this.pause() : this.play(); }

    setSpeed(ms) {
        this.autoSpeed = Math.max(80, Number(ms) || 1000);
        if (this.config && this.config.delay != null) this.config.delay = this.autoSpeed;
        try { this.onChangeSpeed(this.autoSpeed); } catch (_) {}
    }

    // ===== 初始化（canvas 页面调用）=====
    init() {
        this.index = -1;
        this.pause();
        if (this.statusElement) {
            this.statusElement.textContent = '准备中';
            this.statusElement.classList.remove('success');
        }
        this.updateStepInfo();
        this.updateProgress();
        this._syncUI();
    }

    // ===== 状态文本 =====
    setStatus(text) {
        if (!this.statusElement) return;
        this.statusElement.textContent = text;
        this.statusElement.classList.remove('success');
    }

    setStatusSuccess(text) {
        if (!this.statusElement) return;
        this.statusElement.textContent = text;
        this.statusElement.classList.add('success');
    }

    // ===== 自动更新步骤解释区（按 template.html 约定的 id 注入内容）=====
    updateStepInfo() {
        const enEl = document.getElementById('step-en');
        const zhEl = document.getElementById('step-zh');
        const formulaEl = document.getElementById('formula-text');
        const counter = document.querySelector('.step-info .step-counter');

        const step = this.steps[this.index] || null;

        if (counter) {
            counter.textContent = String(Math.max(0, this.index + 1));
        }

        if (!step) {
            // 准备阶段：显示默认提示
            if (enEl) enEl.textContent = 'Click "Generate" then "Start" to begin';
            if (zhEl) zhEl.textContent = '点击 "生成场景" 后按 "开始演示"';
            if (formulaEl) formulaEl.textContent = '';
            return;
        }

        if (enEl) enEl.textContent = step.en || step.title || '';
        if (zhEl) zhEl.textContent = step.zh || step.desc || '';
        if (formulaEl) formulaEl.textContent = step.formula || '';
    }

    // ===== 进度滑块与文本 =====
    updateProgress() {
        const slider = document.getElementById('progress-slider');
        const text = document.getElementById('progress-text');
        const total = this.steps.length;
        const current = Math.max(0, this.index + 1);

        if (slider) {
            slider.max = String(Math.max(1, total));
            slider.value = String(current);
            // 同步 CSS 变量用于渐变填充色
            if (typeof window.updateSliderFill === 'function') {
                try { window.updateSliderFill(slider); } catch (_) {}
            } else {
                const percent = Math.max(0, Math.min(100,
                    total <= 1 ? (current ? 100 : 0) : Math.round((current / total) * 100)));
                try { slider.style.setProperty('--percent', String(percent)); } catch (_) {}
            }
        }
        if (text) text.textContent = `${current}/${total}`;
    }

    resetButtons() {
        const ids = ['btnStart', 'btnPause', 'btnPrev', 'btnNext', 'btnReplay',
                     'btnReset', 'btnGenerate'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = false;
        });
        this._onPlayStateChange(false);
    }

    _onPlayStateChange(isPlaying) {
        const btnStart = document.getElementById('btnStart') || document.getElementById('btn-play');
        const btnPause = document.getElementById('btnPause') || document.getElementById('btn-pause');
        const btnPrev  = document.getElementById('btnPrev')  || document.getElementById('btn-prev');
        const btnNext  = document.getElementById('btnNext')  || document.getElementById('btn-next');

        if (btnStart) btnStart.disabled = !!isPlaying;
        if (btnPause) btnPause.disabled = !isPlaying;
        if (btnPrev)  btnPrev.disabled  = this.index <= -1;
        if (btnNext)  btnNext.disabled  = this.index >= this.steps.length - 1;
    }

    _scheduleNext() {
        if (!this.playing) return;
        this._timer = setTimeout(() => {
            this.next();
            if (this.playing && this.index < this.steps.length - 1) {
                this._scheduleNext();
            } else if (this.playing) {
                this.pause();
            }
        }, this.autoSpeed);
    }

    _syncUI() {
        // 兼容旧版按钮名（btn-play / btn-pause / btn-prev / btn-next）
        const ids = [
            ['btn-play', !!this.playing],
            ['btn-pause', !this.playing],
            ['btn-prev', this.index <= -1],
            ['btn-next', this.index >= this.steps.length - 1]
        ];
        ids.forEach(([id, disabled]) => {
            const el = document.getElementById(id);
            if (el) el.disabled = disabled;
        });

        const counter = document.getElementById('step-counter');
        if (counter) {
            const total = this.steps.length;
            const current = Math.max(0, this.index + 1);
            counter.textContent = `步骤 ${current} / ${total}`;
        }
    }
}

if (typeof window !== 'undefined') {
    window.StepController = StepController;
}

;(function() {
  var s = document.createElement('script');
  s.setAttribute('data-goatcounter', 'https://algo-step.goatcounter.com/count');
  s.setAttribute('async', '');
  s.src = '/js/goatcounter.js';
  document.body.appendChild(s);
})();