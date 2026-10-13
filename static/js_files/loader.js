/**
 * Chess Pieces Spawning Loader Helper
 * Provides showChessLoader, updateChessLoaderTask, and hideChessLoader functions.
 */

(function () {
    function getLoaderElements() {
        return {
            overlay: document.getElementById("loader-overlay"),
            title: document.getElementById("loader-task-title"),
            desc: document.getElementById("loader-task-desc"),
            badge: document.getElementById("loader-task-step")
        };
    }

    window.showChessLoader = function (title = "Loading...", desc = "Please wait while we process your request...", badge = "Processing") {
        const els = getLoaderElements();
        if (els.title && title) els.title.textContent = title;
        if (els.desc && desc) els.desc.textContent = desc;
        if (els.badge && badge) els.badge.textContent = badge;

        if (els.overlay) {
            els.overlay.style.display = "flex";
            document.body.classList.add("loading");
        }
    };

    window.updateChessLoaderTask = function (desc, badge = null, title = null) {
        const els = getLoaderElements();
        if (els.desc && desc) els.desc.textContent = desc;
        if (els.badge && badge) els.badge.textContent = badge;
        if (els.title && title) els.title.textContent = title;
    };

    window.hideChessLoader = function () {
        const els = getLoaderElements();
        if (els.overlay) {
            els.overlay.style.display = "none";
        }
        document.body.classList.remove("loading");
    };

    // Shorthand aliases for universal use
    window.showLoader = window.showChessLoader;
    window.updateLoaderTask = window.updateChessLoaderTask;
    window.hideLoader = window.hideChessLoader;
})();
