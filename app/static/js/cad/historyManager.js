(function () {
    "use strict";

    const DEFAULT_HISTORY_LIMIT = 100;

    const undoStack = [];
    const redoStack = [];

    let historyLimit = DEFAULT_HISTORY_LIMIT;

    function isValidHistoryAction(action) {
        return action && typeof action.undo === "function";
    }

    function getActionLabel(action) {
        if (action && typeof action.label === "string" && action.label.trim() !== "") {
            return action.label.trim();
        }

        return "CAD action";
    }

    function trimStack(stack) {
        while (stack.length > historyLimit) {
            stack.shift();
        }
    }

    function getHistoryState() {
        const nextUndoAction = undoStack[undoStack.length - 1] || null;
        const nextRedoAction = redoStack[redoStack.length - 1] || null;

        return {
            canUndo: undoStack.length > 0,
            canRedo: redoStack.length > 0,
            undoCount: undoStack.length,
            redoCount: redoStack.length,
            nextUndoLabel: nextUndoAction ? nextUndoAction.label : null,
            nextRedoLabel: nextRedoAction ? nextRedoAction.label : null
        };
    }

    function dispatchHistoryChanged() {
        window.dispatchEvent(new CustomEvent("cad:historyChanged", {
            detail: getHistoryState()
        }));
    }

    function pushHistoryAction(action) {
        if (!isValidHistoryAction(action)) {
            console.warn("History action must include an undo function.");
            return false;
        }

        undoStack.push(Object.assign({}, action, {
            label: getActionLabel(action)
        }));

        trimStack(undoStack);
        redoStack.length = 0;
        dispatchHistoryChanged();

        return true;
    }

    function undoLastAction() {
        const action = undoStack.pop();

        if (!action) {
            return false;
        }

        try {
            action.undo();

            if (typeof action.redo === "function") {
                redoStack.push(action);
                trimStack(redoStack);
            }

            dispatchHistoryChanged();
            return true;
        } catch (error) {
            undoStack.push(action);
            console.error("Undo failed:", error);
            dispatchHistoryChanged();
            return false;
        }
    }

    function redoLastAction() {
        const action = redoStack.pop();

        if (!action || typeof action.redo !== "function") {
            return false;
        }

        try {
            action.redo();
            undoStack.push(action);
            trimStack(undoStack);
            dispatchHistoryChanged();
            return true;
        } catch (error) {
            redoStack.push(action);
            console.error("Redo failed:", error);
            dispatchHistoryChanged();
            return false;
        }
    }

    function clearHistory() {
        undoStack.length = 0;
        redoStack.length = 0;
        dispatchHistoryChanged();
    }

    function setHistoryLimit(nextLimit) {
        const numericLimit = Number(nextLimit);

        if (!Number.isFinite(numericLimit) || numericLimit < 1) {
            return false;
        }

        historyLimit = Math.floor(numericLimit);
        trimStack(undoStack);
        trimStack(redoStack);
        dispatchHistoryChanged();

        return true;
    }

    window.CADHistory = {
        push: pushHistoryAction,
        undo: undoLastAction,
        redo: redoLastAction,
        clear: clearHistory,
        setLimit: setHistoryLimit,
        canUndo: function () {
            return undoStack.length > 0;
        },
        canRedo: function () {
            return redoStack.length > 0;
        },
        getState: getHistoryState
    };

    window.pushHistoryAction = pushHistoryAction;
    window.undoLastAction = undoLastAction;
    window.redoLastAction = redoLastAction;
    window.clearHistory = clearHistory;
})();