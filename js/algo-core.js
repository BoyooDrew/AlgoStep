/* ============================================================
 * AlgoStep v2.0 · algo-core.js
 * 算法展示页通用能力：
 *   - StepController  步骤播放控制器
 *   - CodePanel       代码面板（行号 / 语法着色 / 高亮 / 字号）
 *   - bindPlayback    播放 / 上一步 / 下一步 / 重置 / 速度 / 键盘
 *   - bindFontControls 代码字号缩放
 *   - bindTraceList   执行轨迹点击跳转
 *   - bindCopyButton  代码一键复制
 *   - showToast / copyText
 *
 * 依赖：css/algo.css（代码面板样式）
 * ============================================================ */
(function () {
    'use strict';

    /* =======================================================
     * StepController —— 步骤播放控制器
     * ======================================================= */
    function StepController(options) {
        options = options || {};
        this.onStep = options.onStep || function () {};
        this.onFinish = options.onFinish || function () {};
        this.onPlayChange = options.onPlayChange || function () {};
        this.onStepsChange = options.onStepsChange || function () {};
        this.onProgressChange = options.onProgressChange || function () {};

        this.steps = [];
        this.index = -1;
        this.playing = false;
        this.speed = 1;         // 倍速
        this.baseDelay = 1300;  // 基础间隔 ms
        this._timer = null;
    }

    StepController.prototype.setSteps = function (steps) {
        this.steps = Array.isArray(steps) ? steps : [];
        this.reset();
        try { this.onStepsChange(this.steps.length); } catch (e) { console.error('[StepController] onStepsChange:', e); }
    };

    Object.defineProperties(StepController.prototype, {
        totalSteps: { get: function () { return this.steps.length; } },
        currentIndex: { get: function () { return Math.max(0, this.index); } }
    });

    StepController.prototype.goTo = function (i) {
        if (!this.steps.length) return;
        var clamped = Math.max(-1, Math.min(this.steps.length - 1, i));
        if (clamped === this.index) return;
        this.index = clamped;

        if (this.index >= 0) {
            try { this.onStep(this.steps[this.index], this.index); }
            catch (e) { console.error('[StepController] onStep:', e); }
        }
        try { this.onProgressChange(this.index, this.steps.length); }
        catch (e) { console.error('[StepController] onProgressChange:', e); }
        if (this.index >= this.steps.length - 1) {
            try { this.onFinish(); } catch (_) {}
        }
    };

    StepController.prototype.next = function () {
        if (this.index >= this.steps.length - 1) { this.pause(); return; }
        this.goTo(this.index + 1);
    };

    StepController.prototype.prev = function () {
        if (this.index <= -1) return;
        this.goTo(this.index - 1);
    };

    StepController.prototype.reset = function () {
        this.pause();
        this.goTo(-1);
    };

    StepController.prototype.play = function () {
        if (!this.steps.length) return;
        if (this.playing) return;
        if (this.index >= this.steps.length - 1) this.index = -1;
        this.playing = true;
        try { this.onPlayChange(true); } catch (_) {}
        this._scheduleNext();
    };

    StepController.prototype.pause = function () {
        this.playing = false;
        if (this._timer) { clearTimeout(this._timer); this._timer = null; }
        try { this.onPlayChange(false); } catch (_) {}
    };

    StepController.prototype.toggle = function () {
        this.playing ? this.pause() : this.play();
    };

    StepController.prototype.setSpeed = function (v) {
        this.speed = Number(v) || 1;
        if (this.playing) { this.pause(); this.play(); }
    };

    StepController.prototype._scheduleNext = function () {
        var self = this;
        if (!this.playing) return;
        var delay = Math.round(this.baseDelay / this.speed);
        this._timer = setTimeout(function () {
            self.next();
            if (self.playing && self.index < self.steps.length - 1) {
                self._scheduleNext();
            } else if (self.playing) {
                self.pause();
            }
        }, delay);
    };

    /* =======================================================
     * CodePanel —— 代码面板
     * API：
     *   new CodePanel(containerSelector)
     *   setCode(linesArray)    设置代码行数组
     *   highlight(lineIndex)   高亮指定行（0-based）
     *   clearHighlight()       清除所有高亮
     *   setFontSize(px)        设置字号
     * ======================================================= */
    function CodePanel(selector) {
        this.body = typeof selector === 'string'
            ? document.querySelector(selector)
            : selector;
        this.lines = [];
        this.activeLine = -1;
        this.fontSize = 14;
    }

    CodePanel.prototype._tokenize = function (text) {
        // 先分离注释，避免后续关键字替换误伤已插入的 span 标记
        var before = text;
        var comment = '';
        var commentIdx = text.indexOf('//');
        if (commentIdx !== -1) {
            before = text.slice(0, commentIdx);
            comment = text.slice(commentIdx);
        }

        var kw = /\b(int|void|double|float|char|boolean|String|if|else|for|while|do|return|break|continue|class|public|private|protected|static|final|new|this|true|false|null|package|import|extends|implements|try|catch)\b/g;

        var html = before
            .replace(kw, '<span class="tok-kw">$1</span>')
            .replace(/\b(\d+)\b/g, '<span class="tok-num">$1</span>');

        if (comment) {
            html += '<span class="tok-com">' + comment + '</span>';
        }
        return html;
    };

    CodePanel.prototype.setCode = function (lines) {
        this.lines = Array.isArray(lines) ? lines : [];
        if (!this.body) return;

        this.body.innerHTML = this.lines.map(function (line, i) {
            var escaped = String(line)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            var highlighted = this._tokenize(escaped);
            return '<div class="code-line" data-line="' + i + '">'
                + '<span class="line-no">' + (i + 1) + '</span>'
                + '<span class="line-code">' + highlighted + '</span>'
                + '</div>';
        }, this).join('');

        this.setActiveLine(-1);
    };

    /* 清除所有高亮态（is-active 与 is-active-<variant>） */
    CodePanel.prototype._clearActiveClasses = function () {
        if (!this.body) return;
        this.body.querySelectorAll('.code-line').forEach(function (row) {
            var kept = row.className.split(/\s+/).filter(function (c) {
                return c && c.indexOf('is-active') !== 0;
            });
            row.className = kept.join(' ');
        });
    };

    /* 多行高亮：indices 为 0-based 行号数组（也兼容单个数字）；
       variant 可选，如 'recursion' → 附加 .is-active-recursion 样式 */
    CodePanel.prototype.setActiveLines = function (indices, variant) {
        var list = Array.isArray(indices) ? indices.slice()
            : (typeof indices === 'number' && indices >= 0 ? [indices] : []);
        this.activeLine = list.length ? list[0] : -1;
        if (!this.body) return;

        this._clearActiveClasses();
        var cls = 'is-active' + (variant ? '-' + variant : '');
        var rows = this.body.querySelectorAll('.code-line');
        rows.forEach(function (row) {
            var i = Number(row.getAttribute('data-line'));
            if (list.indexOf(i) !== -1) row.classList.add(cls);
        });

        var infoEl = document.getElementById('codeLineInfo');
        if (infoEl) {
            infoEl.textContent = list.length
                ? '第 ' + list.map(function (i) { return i + 1; }).join('·') + ' 行'
                : '第 — 行';
        }

        if (list.length && rows[list[0]]) {
            rows[list[0]].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    };

    CodePanel.prototype.setActiveLine = function (index) {
        this.setActiveLines(typeof index === 'number' && index >= 0 ? [index] : []);
    };

    Object.defineProperties(CodePanel.prototype, {
        highlight: {
            value: function (indices, variant) { this.setActiveLines(indices, variant); },
            writable: true
        },
        clearHighlight: {
            value: function () { this.setActiveLines([]); },
            writable: true
        }
    });

    CodePanel.prototype.setFontSize = function (px) {
        this.fontSize = px;
        if (this.body) this.body.style.fontSize = px + 'px';
    };

    /* =======================================================
     * 轻提示 & 复制
     * ======================================================= */
    function showToast(message) {
        var el = document.getElementById('algoToast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'algoToast';
            el.className = 'toast';
            el.setAttribute('role', 'status');
            el.setAttribute('aria-live', 'polite');
            document.body.appendChild(el);
        }
        el.textContent = message;
        el.classList.add('show');
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(function () {
            el.classList.remove('show');
        }, 1600);
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        document.body.removeChild(ta);
        return ok;
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).then(function () { return true; }, function () {
                return fallbackCopy(text);
            });
        }
        return Promise.resolve(fallbackCopy(text));
    }

    function bindCopyButton(button, getText, options) {
        if (!button) return;
        options = options || {};
        var labelEl = options.labelEl || null;
        var defaultLabel = labelEl ? labelEl.textContent : '';
        var doneLabel = options.doneLabel || '已复制';

        button.addEventListener('click', function () {
            var text = typeof getText === 'function' ? getText() : String(getText == null ? '' : getText);
            copyText(text).then(function (ok) {
                if (!ok) return;
                showToast(options.toast || '已复制到剪贴板');
                button.classList.add('copied');
                if (labelEl) labelEl.textContent = doneLabel;
                setTimeout(function () {
                    button.classList.remove('copied');
                    if (labelEl) labelEl.textContent = defaultLabel;
                }, 1500);
            });
        });
    }

    /* =======================================================
     * 播放控制绑定（按钮 + 速度 + 键盘）
     * ======================================================= */
    function bindPlayback(options) {
        options = options || {};
        var controller = options.controller;
        if (!controller) return;

        if (options.prevBtn) options.prevBtn.addEventListener('click', function () { controller.prev(); });
        if (options.nextBtn) options.nextBtn.addEventListener('click', function () { controller.next(); });
        if (options.playBtn) options.playBtn.addEventListener('click', function () { controller.toggle(); });

        if (options.resetBtn) {
            options.resetBtn.addEventListener('click', function () {
                if (options.onReset) options.onReset();
                else controller.reset();
            });
        }

        if (options.speedGroup) {
            var speedBtns = options.speedGroup.querySelectorAll('[data-speed]');
            speedBtns.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var v = Number(btn.getAttribute('data-speed')) || 1;
                    controller.setSpeed(v);
                    speedBtns.forEach(function (b) {
                        b.classList.toggle('active', Number(b.getAttribute('data-speed')) === v);
                    });
                    if (options.onSpeedChange) options.onSpeedChange(v);
                });
            });
        }

        document.addEventListener('keydown', function (e) {
            var target = e.target;
            var tag = target && target.tagName ? target.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea' || tag === 'select' ||
                (target && target.isContentEditable)) return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    controller.toggle();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    controller.prev();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    controller.next();
                    break;
                case 'r':
                case 'R':
                    if (options.onReset) options.onReset();
                    else controller.reset();
                    break;
            }
        });
    }

    /* =======================================================
     * 代码字号缩放
     * ======================================================= */
    function bindFontControls(options) {
        options = options || {};
        var panel = options.codePanel;
        var min = options.min != null ? options.min : 12;
        var max = options.max != null ? options.max : 20;
        var size = options.initial != null ? options.initial : 14;

        var minus = options.minusBtn || document.getElementById('fontMinus');
        var plus = options.plusBtn || document.getElementById('fontPlus');
        var label = options.labelEl || document.getElementById('fontSizeLabel');

        function apply(px) {
            size = Math.max(min, Math.min(max, px));
            if (panel) panel.setFontSize(size);
            if (label) label.textContent = String(size);
            if (minus) minus.disabled = size <= min;
            if (plus) plus.disabled = size >= max;
            if (options.onChange) options.onChange(size);
        }

        if (minus) minus.addEventListener('click', function () { apply(size - 1); });
        if (plus) plus.addEventListener('click', function () { apply(size + 1); });
        apply(size);

        return {
            get size() { return size; },
            set: apply
        };
    }

    /* =======================================================
     * 执行轨迹点击跳转
     * ======================================================= */
    function bindTraceList(listEl, controller) {
        if (!listEl || !controller) return;
        listEl.addEventListener('click', function (e) {
            var btn = e.target.closest('.trace-item');
            if (!btn) return;
            controller.pause();
            controller.goTo(Number(btn.getAttribute('data-step')));
        });
    }

    /* =======================================================
     * 导出
     * ======================================================= */
    window.AlgoV2 = {
        StepController: StepController,
        CodePanel: CodePanel,
        showToast: showToast,
        copyText: copyText,
        bindCopyButton: bindCopyButton,
        bindPlayback: bindPlayback,
        bindFontControls: bindFontControls,
        bindTraceList: bindTraceList
    };

    /* 兼容习惯写法：new StepController(...) / new CodePanel(...) */
    window.StepController = window.StepController || StepController;
    window.CodePanel = window.CodePanel || CodePanel;
})();
