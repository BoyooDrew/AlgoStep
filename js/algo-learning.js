/* ============================================================
 * AlgoStep v2.0 · algo-learning.js
 * 算法页学习进度恢复 / 节流上报 / 收藏（S2）
 * 依赖：api.js、algo-core.js、auth.js
 * ============================================================ */
(function () {
    'use strict';

    var SAVE_INTERVAL = 5000;

    function isLoggedIn() {
        return !!localStorage.getItem('algostep_token');
    }

    function toast(message) {
        if (window.AlgoV2 && typeof window.AlgoV2.showToast === 'function') {
            window.AlgoV2.showToast(message);
        }
    }

    function slugOfPage() {
        var file = location.pathname.split('/').pop() || '';
        try { file = decodeURIComponent(file); } catch (_) {}
        return file.replace(/\.html$/i, '');
    }

    function loginUrl() {
        var base = window.AlgoSite && window.AlgoSite.base ? window.AlgoSite.base : './';
        return base + 'login.html?redirect=' + encodeURIComponent(location.pathname + location.hash);
    }

    function createControls() {
        var header = document.querySelector('.info-header-content');
        if (!header) return null;

        header.insertAdjacentHTML('beforeend',
            '<div class="algo-learning-actions">' +
                '<button class="algo-favorite-btn" id="algoFavoriteBtn" type="button" ' +
                    'aria-pressed="false" disabled>' +
                    '<svg class="ico" aria-hidden="true"><use href="#i-star"/></svg>' +
                    '<span>收藏</span>' +
                '</button>' +
                '<span class="algo-sync-status" id="algoSyncStatus" role="status" aria-live="polite"></span>' +
            '</div>');

        return {
            button: document.getElementById('algoFavoriteBtn'),
            status: document.getElementById('algoSyncStatus')
        };
    }

    function attach(controller) {
        if (!controller || controller._algoLearningAttached || !window.AlgoAPI) return;
        controller._algoLearningAttached = true;

        var controls = createControls();
        if (!controls) return;

        var button = controls.button;
        var status = controls.status;
        var algorithm = null;
        var favorited = false;
        var stepsReady = false;
        var restoreStarted = false;
        var restoring = false;
        var userInteracted = false;
        var ready = false;
        var generation = 0;

        var studyTime = 0;
        var playStartedAt = 0;
        var dirty = false;
        var forceSave = false;
        var saving = false;
        var saveTimer = null;
        var lastAttemptAt = 0;

        function setStatus(text, state) {
            status.textContent = text || '';
            status.className = 'algo-sync-status' + (state ? ' is-' + state : '');
        }

        function renderFavorite() {
            button.classList.toggle('is-active', favorited);
            button.setAttribute('aria-pressed', favorited ? 'true' : 'false');
            button.querySelector('span').textContent = favorited
                ? '已收藏'
                : (isLoggedIn() ? '收藏' : '登录后收藏');
            button.title = favorited ? '取消收藏' : '收藏此算法';
        }

        function currentStudyTime() {
            var activeSeconds = playStartedAt
                ? Math.floor((Date.now() - playStartedAt) / 1000)
                : 0;
            return studyTime + activeSeconds;
        }

        function persist(keepalive) {
            if (saving || !dirty || !ready || !algorithm || !isLoggedIn()) return;

            saving = true;
            forceSave = false;
            lastAttemptAt = Date.now();
            dirty = false;
            setStatus('保存中…', 'saving');

            var data = {
                algorithmId: algorithm.id,
                stepIndex: Math.max(0, controller.index),
                totalSteps: controller.totalSteps,
                studyTime: currentStudyTime()
            };

            AlgoAPI.put('/progress', data, {
                silent: true,
                noLoading: true,
                keepalive: !!keepalive
            }).then(function () {
                if (!dirty) setStatus('进度已保存', 'saved');
            }).catch(function () {
                dirty = true;
                setStatus('保存失败，将自动重试', 'error');
            }).finally(function () {
                saving = false;
                if (dirty) requestSave(forceSave);
            });
        }

        function requestSave(immediate) {
            if (!ready || !algorithm || !isLoggedIn() || !dirty) return;
            if (immediate) forceSave = true;
            if (saving) return;

            if (saveTimer) {
                clearTimeout(saveTimer);
                saveTimer = null;
            }

            var delay = forceSave
                ? 0
                : Math.max(0, SAVE_INTERVAL - (Date.now() - lastAttemptAt));
            if (delay === 0) {
                persist(false);
                return;
            }

            setStatus('进度将在 ' + Math.ceil(delay / 1000) + ' 秒后保存', '');
            saveTimer = setTimeout(function () {
                saveTimer = null;
                persist(false);
            }, delay);
        }

        function maybeRestore() {
            if (restoreStarted || !stepsReady || !algorithm) return;
            restoreStarted = true;

            if (!isLoggedIn()) {
                setStatus('登录后自动保存进度', '');
                return;
            }

            var requestGeneration = generation;
            setStatus('进度加载中…', '');
            AlgoAPI.get('/progress/' + algorithm.id, { silent: true, noLoading: true })
                .then(function (progress) {
                    progress = progress || {};
                    studyTime = Math.max(0, Number(progress.studyTime) || 0);

                    var canRestore = requestGeneration === generation && !userInteracted &&
                        Number(progress.totalSteps) > 0 && controller.totalSteps > 0;
                    if (canRestore) {
                        var savedIndex = Math.max(0, Number(progress.stepIndex) || 0);
                        var target = Math.min(savedIndex, controller.totalSteps - 1);
                        restoring = true;
                        controller.goTo(target);
                        restoring = false;
                        setStatus('已恢复到第 ' + (target + 1) + ' 步', 'saved');
                    } else {
                        setStatus('进度将自动保存', '');
                    }

                    ready = true;
                    if (userInteracted) {
                        dirty = true;
                        requestSave(false);
                    }
                })
                .catch(function () {
                    ready = true;
                    setStatus('进度读取失败，将在操作后重试', 'error');
                    if (userInteracted) {
                        dirty = true;
                        requestSave(false);
                    }
                });
        }

        function loadFavorite() {
            if (!isLoggedIn()) {
                renderFavorite();
                return;
            }
            AlgoAPI.get('/favorites', { silent: true, noLoading: true })
                .then(function (list) {
                    favorited = (Array.isArray(list) ? list : []).some(function (item) {
                        return Number(item.algorithmId) === Number(algorithm.id);
                    });
                    renderFavorite();
                })
                .catch(renderFavorite);
        }

        button.addEventListener('click', function () {
            if (!algorithm) return;
            if (!isLoggedIn()) {
                location.href = loginUrl();
                return;
            }

            var next = !favorited;
            button.disabled = true;
            var request = next
                ? AlgoAPI.post('/favorites/' + algorithm.id, {}, { silent: true })
                : AlgoAPI.del('/favorites/' + algorithm.id, { silent: true });

            request.then(function () {
                favorited = next;
                renderFavorite();
                toast(favorited ? '已加入收藏' : '已取消收藏');
            }).catch(function (err) {
                toast((err && err.msg) || '收藏操作失败，请稍后重试');
            }).finally(function () {
                button.disabled = false;
            });
        });

        controller.onStepsChange = function (totalSteps) {
            stepsReady = totalSteps > 0;
            generation++;
            maybeRestore();
        };

        controller.onProgressChange = function (index) {
            if (restoring) return;
            if (!ready) {
                if (index >= 0 && stepsReady) userInteracted = true;
                return;
            }
            dirty = true;
            requestSave(index >= controller.totalSteps - 1 && controller.totalSteps > 0);
        };

        var pageOnPlayChange = controller.onPlayChange;
        controller.onPlayChange = function (playing) {
            pageOnPlayChange(playing);

            if (playing) {
                playStartedAt = Date.now();
            } else if (playStartedAt) {
                studyTime = currentStudyTime();
                playStartedAt = 0;
            }

            if (ready) {
                dirty = true;
                requestSave(false);
            }
        };

        document.addEventListener('visibilitychange', function () {
            if (document.hidden && controller.playing) controller.pause();
        });

        window.addEventListener('pagehide', function () {
            if (!ready || !algorithm || !isLoggedIn()) return;
            dirty = true;
            forceSave = true;
            if (saveTimer) {
                clearTimeout(saveTimer);
                saveTimer = null;
            }
            if (!saving) persist(true);
        });

        renderFavorite();
        AlgoAPI.get('/algorithms', { silent: true, noLoading: true })
            .then(function (list) {
                var slug = slugOfPage();
                algorithm = (Array.isArray(list) ? list : []).filter(function (item) {
                    return item && item.name === slug;
                })[0] || null;

                if (!algorithm) {
                    button.classList.add('hidden');
                    setStatus('当前页面未登记算法元数据', 'error');
                    return;
                }

                button.disabled = false;
                renderFavorite();
                loadFavorite();
                maybeRestore();
            })
            .catch(function () {
                setStatus(isLoggedIn() ? '后端未连接，进度暂不可保存' : '登录后自动保存进度', 'error');
            });
    }

    window.AlgoLearning = { attach: attach };
})();
