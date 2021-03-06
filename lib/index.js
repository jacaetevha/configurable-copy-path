'use babel';

import {$, CompositeDisposable} from "atom";
import path from "path";
import configSettings from './config.js';

module.exports = {

  subscriptions: null,

  ignorePath: null,

  config: configSettings,

  activate() {
    this.ignorePath = atom.config.get('configurable-copy-path.ignorePath');
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(atom.commands.add("atom-workspace", {
      "configurable-copy-path:copy-as-import-statement": (e) => this.copyAsImportStatement(e),
      "configurable-copy-path:copy-as-require-statement": (e) => this.copyAsRequireStatement(e),
      "configurable-copy-path:copy-after-path": (e) => this.copyAfterPath(e),
      "configurable-copy-path:copy-basename": (e) => this.copyBasename(e),
      "configurable-copy-path:copy-extension": (e) => this.copyExtension(e),
      "configurable-copy-path:copy-basename-wo-extension": (e) => this.copyBasenameWithoutExtension(e),
      "configurable-copy-path:copy-project-relative-path": (e) => this.copyProjectRelativePath(e),
      "configurable-copy-path:copy-full-path": (e) => this.copyFullPath(e),
      "configurable-copy-path:copy-base-dirname": (e) => this.copyBaseDirname(e),
      "configurable-copy-path:copy-project-relative-dirname": (e) => this.copyProjectRelativeDirname(e),
      "configurable-copy-path:copy-full-dirname": (e) => this.copyFullDirname(e),
      "configurable-copy-path:copy-line-reference": (e) => this.copyLineReference(e)
    }));
    if (process.platform === "win32") {
      this.activateForWin();
    }
  },

  activateForWin() {
    this.subscriptions.add(atom.commands.add("atom-workspace", {
      "configurable-copy-path:copy-project-relative-path-web": (e) => this.copyProjectRelativePathForWeb(e)
    }));
    atom.packages.onDidActivatePackage((pkg) => {
      if (pkg.name !== "configurable-copy-path") {
        return;
      }
      pkg.menuManager.add([
        {
          label: "Packages",
          submenu: [
            {
              label: "Copy Path",
              submenu: [
                {
                  label: "Copy Project-Relative Path for Web",
                  command: "configurable-copy-path:copy-project-relative-path-web"
                }
              ]
            }
          ]
        }
      ]);
      pkg.contextMenuManager.add({
        ".tab": [
          {
            label: "Copy Path",
            submenu: [
              {
                label: "Copy Project-Relative Path for Web",
                command: "configurable-copy-path:copy-project-relative-path-web"
              }
            ]
          }
        ]
      })
    });
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  getTargetEditorPath(e) {
    // NOTE: DOM tree around a tab is like:
    //
    // ul.tab-bar
    //   li.tab ... (1)
    //     div.title[data-path=<absolute-path>] ... (2)
    //
    // Opening the context menu on the tab, the target element will be (1) or (2).

    // If the event was emitted by "context-menu".".tab" (see configurable-copy-path.cson),
    // e.currentTarget must be .tab element.
    if (e.currentTarget.classList.contains("tab")) {
      const elTitle = e.currentTarget.querySelector(".title");
      if (elTitle && elTitle.dataset.path) {
        return elTitle.dataset.path;
      }
    }

    // command palette etc.
    const item = atom.workspace.getActivePaneItem();
    if (!item) {
      return ""; // no active pane
    }
    return item.getPath ? item.getPath() : "";
  },

  writeToClipboardIfValid(str) {
    if (!str || str === "") {
      return;
    }
    atom.clipboard.write(str);
  },

  parseTargetEditorPath(e) {
    return path.parse(this.getTargetEditorPath(e));
  },

  getProjectRelativePath(p) {
    [projectPath, relativePath] = atom.project.relativizePath(p);
    return relativePath;
  },

  copyBasename(e) {
    const {base} = this.parseTargetEditorPath(e);
    this.writeToClipboardIfValid(base);
  },

  copyExtension(e) {
    const {ext} = this.parseTargetEditorPath(e);
    this.writeToClipboardIfValid(ext);
  },

  copyBasenameWithoutExtension(e) {
    const {name} = this.parseTargetEditorPath(e);
    this.writeToClipboardIfValid(name);
  },

  copyProjectRelativePath(e) {
    this.writeToClipboardIfValid(this.getProjectRelativePath(this.getTargetEditorPath(e)));
  },

  copyAfterPath(e) {
    this.writeToClipboardIfValid(this.resultWithoutPathChunk(e));
  },

  copyAsImportStatement(e) {
    const {name} = this.parseTargetEditorPath(e);
    this.writeToClipboardIfValid(
      `import ${name} from '${this.resultWithoutPathChunk(e)}';`
    );
  },

  copyAsRequireStatement(e) {
    const {name} = this.parseTargetEditorPath(e);
    this.writeToClipboardIfValid(
      `const ${name} = require('${this.resultWithoutPathChunk(e)}');`
    );
  },

  copyFullPath(e) {
    this.writeToClipboardIfValid(this.getTargetEditorPath(e));
  },

  copyBaseDirname(e) {
    const {dir} = this.parseTargetEditorPath(e);
    this.writeToClipboardIfValid(path.basename(dir));
  },

  copyProjectRelativeDirname(e) {
    const {dir} = this.parseTargetEditorPath(e);
    this.writeToClipboardIfValid(this.getProjectRelativePath(dir));
  },

  copyFullDirname(e) {
    const {dir} = this.parseTargetEditorPath(e);
    this.writeToClipboardIfValid(dir);
  },

  copyLineReference(e) {
    const editor = atom.workspace.getActiveTextEditor();
    const lineNumber = editor.getCursorBufferPosition().row + 1;
    const relativePath = this.getProjectRelativePath(editor.getPath());
    this.writeToClipboardIfValid(`${relativePath}:${lineNumber}`);
  },

  copyProjectRelativePathForWeb(e) {
    var path = this.getProjectRelativePath(this.getTargetEditorPath(e)).replace(/\\/g, '/');
    this.writeToClipboardIfValid(path);
  },

  resultWithoutPathChunk(e) {
    const result = this
      .getProjectRelativePath(this.getTargetEditorPath(e))
      .split(this.ignorePath);
    if (!result) {
      return "";
    } else if (result.length == 1) {
      return result[0] || "";
    } else {
      return result[1] || "";
    }
  }
};
