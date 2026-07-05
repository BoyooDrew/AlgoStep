/* =====================================================
 * code-panel.js —— CodePanel 代码面板组件
 *
 * 两种使用方式：
 *
 * 【方式一 · 手写 HTML（推荐，最清晰）】
 *   HTML 中：
 *     <div class="code-panel" id="codePanel">
 *       <div class="code-line" id="line-0">// 第 1 行</div>
 *       <div class="code-line" id="line-1">int solve(int n) {</div>
 *       ...
 *     </div>
 *   JS 中：
 *     const panel = new CodePanel('#codePanel');   // 只做"语法着色"
 *     panel.highlight(2);                          // 高亮第 3 行
 *     panel.highlight([2, 6]);                     // 同时高亮多行
 *     panel.clearHighlight();                      // 清除高亮
 *
 * 【方式二 · JS 构造（兼容旧版）】
 *     new CodePanel('#codePanel', lines, 'cpp');   // lines 为 string[]
 *     new CodePanel('#codePanel', { language: 'cpp', code: '...' });
 *
 * 语法着色：
 *   不依赖 Prism.js，内部用轻量正则按关键字/数字/字符串/注释着色。
 *   已支持：cpp / javascript / java / python（仅关键字不同）
 * ===================================================== */

(function () {
    const KW_MAP = {
        cpp: ['int', 'void', 'double', 'float', 'char', 'bool', 'string',
              'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
              'continue', 'return', 'class', 'struct', 'using', 'namespace',
              'const', 'auto', 'static', 'new', 'delete', 'true', 'false',
              'null', 'nullptr', 'this', 'long', 'short', 'size_t',
              'include', 'define', 'vector', 'map', 'set', 'unordered_map'],
        javascript: ['var', 'let', 'const', 'function', 'if', 'else',
                     'for', 'while', 'do', 'return', 'break', 'continue',
                     'true', 'false', 'null', 'undefined', 'new', 'this',
                     'class', 'extends', 'import', 'from', 'export',
                     'async', 'await', 'try', 'catch', 'finally', 'throw'],
        java: ['int', 'void', 'double', 'float', 'char', 'boolean', 'String',
               'if', 'else', 'for', 'while', 'do', 'return', 'break',
               'continue', 'class', 'public', 'private', 'protected',
               'static', 'final', 'new', 'this', 'true', 'false', 'null',
               'import', 'package', 'extends', 'implements', 'try', 'catch'],
        python: ['def', 'class', 'if', 'elif', 'else', 'for', 'while',
                 'return', 'break', 'continue', 'import', 'from', 'in',
                 'and', 'or', 'not', 'True', 'False', 'None', 'pass',
                 'lambda', 'with', 'as', 'try', 'except', 'finally',
                 'print', 'range', 'self']
    };

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
    }

    // 单行着色：先处理 // 注释，再处理字符串、数字、运算符、关键字
    function highlightLineText(text, language) {
        const kw = KW_MAP[language] || KW_MAP.cpp;

        // 1) 拆分出"注释"（// 直到行尾）
        let before = text;
        let comment = '';
        const commentIdx = text.indexOf('//');
        if (commentIdx !== -1) {
            before = text.slice(0, commentIdx);
            comment = text.slice(commentIdx);
        }

        // 2) 在非注释部分中处理双引号字符串 + 其它 token
        //    使用 match 把字符串当整体保留
        const parts = [];
        const re = /("[^"\n]*"|'[^'\n]*'|[a-zA-Z_][a-zA-Z0-9_]*|\d+\.?\d*|<=|>=|==|!=|\|\||&&|[+\-*/%=<>!;&|(){}\[\],:])/g;
        let last = 0;
        let m;
        while ((m = re.exec(before)) !== null) {
            if (m.index > last) {
                parts.push({ type: 'plain', text: before.slice(last, m.index) });
            }
            const tok = m[0];
            if (/^"[^"\n]*"$/.test(tok) || /^'[^'\n]*'$/.test(tok)) {
                parts.push({ type: 'str', text: tok });
            } else if (/^[0-9]+(\.[0-9]+)?$/.test(tok)) {
                parts.push({ type: 'num', text: tok });
            } else if (/^(<=|>=|==|!=|\|\||&&|[+\-*/%=<>!;&|(){}\[\],:])$/.test(tok)) {
                parts.push({ type: 'op', text: tok });
            } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tok) && kw.indexOf(tok) !== -1) {
                parts.push({ type: 'kw', text: tok });
            } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tok)) {
                parts.push({ type: 'plain', text: tok });
            } else {
                parts.push({ type: 'plain', text: tok });
            }
            last = m.index + tok.length;
        }
        if (last < before.length) {
            parts.push({ type: 'plain', text: before.slice(last) });
        }

        let html = '';
        parts.forEach(p => {
            if (p.type === 'plain') html += escapeHtml(p.text);
            else if (p.type === 'str') html += `<span class="cp-str">${escapeHtml(p.text)}</span>`;
            else if (p.type === 'num') html += `<span class="cp-num">${escapeHtml(p.text)}</span>`;
            else if (p.type === 'op') html += `<span class="cp-op">${escapeHtml(p.text)}</span>`;
            else if (p.type === 'kw') html += `<span class="cp-kw">${escapeHtml(p.text)}</span>`;
        });

        if (comment) html += `<span class="cp-com">${escapeHtml(comment)}</span>`;
        return html;
    }

    class CodePanel {
        constructor(selector, arg2, arg3) {
            this.el = typeof selector === 'string'
                ? document.querySelector(selector)
                : selector;
            if (!this.el) {
                console.warn('[CodePanel] 找不到容器:', selector);
                return;
            }

            this.language = 'cpp';
            this.lines = [];
            this._lineNodes = [];

            // 模式 A：没有内容参数 => 读取容器内已有的 .code-line
            if (arguments.length === 1) {
                this._collectExistingLines();
                return;
            }

            // 模式 B：options 对象 { language, code }
            if (arg2 && typeof arg2 === 'object' && !Array.isArray(arg2)) {
                this.language = arg2.language || 'cpp';
                const raw = arg2.code || '';
                this.lines = String(raw).split('\n');
                this._renderFromLines();
                return;
            }

            // 模式 C：lines 数组 + 可选 language
            if (Array.isArray(arg2)) {
                this.lines = arg2.slice();
                this.language = arg3 || 'cpp';
                this._renderFromLines();
                return;
            }

            // 模式 D：第二个参数是整段 code 字符串
            this.language = 'cpp';
            this.lines = String(arg2 || '').split('\n');
            this._renderFromLines();
        }

        _collectExistingLines() {
            this.el.classList.add('code-panel');
            this._lineNodes = Array.from(this.el.querySelectorAll('.code-line'));
            this._lineNodes.forEach((node, i) => {
                const text = node.textContent;
                node.innerHTML = highlightLineText(text, this.language);
                node.dataset.line = String(i + 1);
            });
        }

        _renderFromLines() {
            this.el.classList.add('code-panel');
            // 清空
            this.el.innerHTML = '';
            this._lineNodes = [];

            for (let i = 0; i < this.lines.length; i++) {
                const div = document.createElement('div');
                div.className = 'code-line';
                div.dataset.line = String(i + 1);
                div.innerHTML = highlightLineText(this.lines[i] || '', this.language);
                this.el.appendChild(div);
                this._lineNodes.push(div);
            }
        }

        highlight(arg) {
            if (!this._lineNodes || !this._lineNodes.length) return;
            this.clearHighlight();

            let indices = [];
            if (arg === undefined || arg === null || arg === false) return;
            if (Array.isArray(arg)) indices = arg;
            else if (typeof arg === 'number') indices = [arg];
            else if (typeof arg === 'string' && arg.length) indices = [parseInt(arg, 10)];

            indices = indices
                .map(i => Number(i))
                .filter(i => !isNaN(i) && i >= 0 && i < this._lineNodes.length);

            indices.forEach(i => this._lineNodes[i].classList.add('active'));

            const first = indices[0];
            if (first !== undefined && this._lineNodes[first]) {
                try { this._lineNodes[first].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (_) {}
            }
        }

        clearHighlight() {
            if (!this._lineNodes) return;
            this._lineNodes.forEach(n => n.classList.remove('active'));
        }

        setCode(code, language) {
            this.lines = String(code || '').split('\n');
            if (language) this.language = language;
            this._renderFromLines();
        }
    }

    // 内联样式（注入到 <head> 一次），确保任何页面都能工作
    function injectInlineStyle() {
        if (document.getElementById('code-panel-inline-style')) return;
        const style = document.createElement('style');
        style.id = 'code-panel-inline-style';
        style.textContent = `
            .code-panel .cp-kw  { color: #c678dd; font-weight: 600; }
            .code-panel .cp-str { color: #98c379; }
            .code-panel .cp-num { color: #d19a66; }
            .code-panel .cp-op  { color: #56b6c2; }
            .code-panel .cp-com { color: #5c6370; font-style: italic; }
        `;
        document.head.appendChild(style);
    }

    if (typeof window !== 'undefined') {
        window.CodePanel = CodePanel;
        if (typeof document !== 'undefined' && document.head) {
            if (document.body) injectInlineStyle();
            else document.addEventListener('DOMContentLoaded', injectInlineStyle);
        }
    }
})();
