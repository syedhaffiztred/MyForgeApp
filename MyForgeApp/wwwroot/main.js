import { initViewer, loadModel } from './viewer.js';

const viewer = await initViewer(document.getElementById('preview'))
const urn = window.location.hash?.substring(1);
setupModelSelection(viewer, urn);
setupModelUpload(viewer);

const customSceneIdentifier = 'custom-scene';
document.getElementById("add-geom").addEventListener("click", function () {
    const geom = new THREE.SphereGeometry(10, 10, 10);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const sphereMesh = new THREE.Mesh(geom, material);
    sphereMesh.position.set(
        Math.random() * 100 - 50,
        Math.random() * 100 - 50,
        0
    );
    if (!viewer.overlays.hasScene(customSceneIdentifier)) {
        viewer.overlays.addScene(customSceneIdentifier);
    }
    viewer.overlays.addMesh(sphereMesh, customSceneIdentifier);
});

async function loadEdit2D(viewer) {
    // Load Edit2D extension
    const options = {
        // If true, PolygonTool creates Paths instead of just Polygons. This lets you change segments to arcs.
        enableArcs: true
    };

    const edit2d = await viewer.loadExtension('Autodesk.Edit2D');

    // Register all standard tools in default configuration
    edit2d.registerDefaultTools();

    const ctx = edit2d.defaultContext;

    // {EditLayer} Edit layer containing your shapes
    ctx.layer

    // {EditLayer} An additional layer used by tools to display temporary shapes (e.g. dashed lines for snapping etc.)
    ctx.gizmoLayer

    // {UndoStack} Manages all modifications and tracks undo/redo history
    ctx.undoStack

    // {Selection} Controls selection and hovering highlight
    ctx.selection

    // {Edit2DSnapper} Edit2D snapper
    ctx.snapper

    // Before action
    ctx.undoStack.addEventListener(Autodesk.Edit2D.UndoStack.BEFORE_ACTION, () => {});

    // After action
    ctx.undoStack.addEventListener(Autodesk.Edit2D.UndoStack.BEFORE_ACTION, () => {});

    // Register your handler
    ctx.selection.addEventListener(Autodesk.Edit2D.Selection.Events.SELECTION_CHANGED, () => {});

    // Update UI state on hover changes
    ctx.selection.addEventListener(Autodesk.Edit2D.Selection.Events.SELECTION_HOVER_CHANGED, () => {});

    // Apply your selection from UI
    ctx.selection.selectOnly(myItem.shape);

    // Sync Edit2D state on UI-hover events
    ctx.selection.setHoverID(shape.id);

    // Facilitate access to extension and layer
    window.edit2d = NOP_VIEWER.getExtension('Autodesk.Edit2D');
    window.layer = edit2d.defaultContext.layer;
    window.tools = edit2d.defaultTools;

    startTool(edit2d.defaultTools.polygonTool)
}

// Convenience function for tool switching per console. E.g. startTool(tools.polygonTool)
var startTool = function (tool) {

    var controller = NOP_VIEWER.toolController;

    // Check if currently active tool is from Edit2D
    var activeTool = controller.getActiveTool();
    var isEdit2D = activeTool && activeTool.getName().startsWith("Edit2");

    // deactivate any previous edit2d tool
    if (isEdit2D) {
        controller.deactivateTool(activeTool.getName());
        activeTool = null;
    }

    // stop editing tools
    if (!tool) {
        return;
    }

    controller.activateTool(tool.getName());
}

async function setupModelSelection(viewer, selectedUrn) {
    const dropdown = document.getElementById('models');
    dropdown.innerHTML = '';
    try {
        const resp = await fetch('/api/models');
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const models = await resp.json();
        dropdown.innerHTML = models.map(model => `<option value=${model.urn} ${model.urn === selectedUrn ? 'selected' : ''}>${model.name}</option>`).join('\n');
        dropdown.onchange = () => onModelSelected(viewer, dropdown.value);
        if (dropdown.value) {
            onModelSelected(viewer, dropdown.value);
        }
    } catch (err) {
        alert('Could not list models. See the console for more details.');
        console.error(err);
    }
}

async function setupModelUpload(viewer) {
    const upload = document.getElementById('upload');
    const input = document.getElementById('input');
    const models = document.getElementById('models');
    upload.onclick = () => input.click();
    input.onchange = async () => {
        const file = input.files[0];
        let data = new FormData();
        data.append('model-file', file);
        if (file.name.endsWith('.zip')) { // When uploading a zip file, ask for the main design file in the archive
            const entrypoint = window.prompt('Please enter the filename of the main design inside the archive.');
            data.append('model-zip-entrypoint', entrypoint);
        }
        upload.setAttribute('disabled', 'true');
        models.setAttribute('disabled', 'true');
        showNotification(`Uploading model <em>${file.name}</em>. Do not reload the page.`);
        try {
            const resp = await fetch('/api/models', { method: 'POST', body: data });
            if (!resp.ok) {
                throw new Error(await resp.text());
            }
            const model = await resp.json();
            setupModelSelection(viewer, model.urn);
        } catch (err) {
            alert(`Could not upload model ${file.name}. See the console for more details.`);
            console.error(err);
        } finally {
            clearNotification();
            upload.removeAttribute('disabled');
            models.removeAttribute('disabled');
            input.value = '';
        }
    };
}

async function onModelSelected(viewer, urn) {
    if (window.onModelSelectedTimeout) {
        clearTimeout(window.onModelSelectedTimeout);
        delete window.onModelSelectedTimeout;
    }
    window.location.hash = urn;
    try {
        const resp = await fetch(`/api/models/${urn}/status`);
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const status = await resp.json();
        switch (status.status) {
            case 'n/a':
                showNotification(`Model has not been translated.`);
                break;
            case 'inprogress':
                showNotification(`Model is being translated (${status.progress})...`);
                window.onModelSelectedTimeout = setTimeout(onModelSelected, 5000, viewer, urn);
                break;
            case 'failed':
                showNotification(`Translation failed. <ul>${status.messages.map(msg => `<li>${JSON.stringify(msg)}</li>`).join('')}</ul>`);
                break;
            default:
                clearNotification();
                loadModel(viewer, urn);
                break;
        }
    } catch (err) {
        alert('Could not load model. See the console for more details.');
        console.error(err);
    }
}

function showNotification(message) {
    const overlay = document.getElementById('overlay');
    overlay.innerHTML = `<div class="notification">${message}</div>`;
    overlay.style.display = 'flex';
}

function clearNotification() {
    const overlay = document.getElementById('overlay');
    overlay.innerHTML = '';
    overlay.style.display = 'none';
}