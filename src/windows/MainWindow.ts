import * as Electron from "electron";
import * as path from "path";
import * as url from "url";
import * as fs from "fs";

import { MenuItem, ipcMain, IpcMessageEvent, MenuItemConstructorOptions } from "electron";
import { Constants } from "../Constants";
import { Config } from "../config/Config";
import { KeyConfig } from "../config/KeyConfig";
import { MainMenu } from "../MainMenu";
import { OpenDialog } from "../dialogs/OpenDialog";
import { KeyConfigWindow } from "./KeyConfigWindow";
import { VersionWindow } from "./VersionWindow";

module Settings {
	export const Title: string = "TGB Dual MP [no file loaded]";
	export const Content: string = "../../html/Main.html";
	export const DevTools: boolean = true;
}

declare module "electron" {
	interface MenuItem {
		id: string;
		submenu: Electron.Menu;
	}
}

export class MainWindow {
	public browserWindow: Electron.BrowserWindow = null;
	protected _keyConfigWindow: KeyConfigWindow;
	protected _versionWindow: VersionWindow;
	protected _config: Config;

	constructor(parent: Electron.BrowserWindow = null) {
		// load config.json
		this._config = Config.load();

		this.initWindow(parent);
		this.addIpcEvents();
	}

	public show(): void {
		this.browserWindow.show();
		if (Config.isDevMode() && Settings.DevTools) {
			this.browserWindow.webContents.openDevTools();
		}
	}

	public destroy(): void {
		this.browserWindow.destroy();
	}

	public log(...args: any[]): void {
		this.send("log", ...args);
	}

	public send(channel: string, ...args: any[]): void {
		const webContents = this.browserWindow.webContents;
		webContents.send(channel, ...args);
	}
	
	protected initWindow(parent: Electron.BrowserWindow): void {
		this.browserWindow = new Electron.BrowserWindow({
			title: Settings.Title,
			useContentSize: true,
			width: this._config.window.width,
			height: this._config.window.height,
			minWidth: Constants.ScreenWidth,
			minHeight: Constants.ScreenHeight,
			acceptFirstMouse: true,
			//titleBarStyle: "hidden",
			show: false,
			//icon: "../icon.png",
			webPreferences: {
				//webgl: false,
				//experimentalFeatures: true,
				//experimentalCanvasFeatures: true
				//nodeIntegration: false
			}
		});

		this.browserWindow.loadURL(url.format({
			pathname: path.join(__dirname, Settings.Content),
			protocol: "file:",
			slashes: true,
		}), {
			/*
			postData: [{
				type: "rawData",
				bytes: Buffer.from("hello=world")
			}],
			*/
		});

		// resize
		this.browserWindow.on("resize", () => {
			if (this.browserWindow.isFullScreen()) {
				return;
			}
			if (this.browserWindow.isMaximized()) {
				return;
			}
			const size = this.browserWindow.getContentSize();
			this._config.window.width = size[0];
			this._config.window.height = size[1];
		});

		// fullscreen
		this.browserWindow.on("enter-full-screen", () => {
			this.browserWindow.setAutoHideMenuBar(true);
			//this.browserWindow.setMenuBarVisibility(false);
		});
		this.browserWindow.on("leave-full-screen", () => {
			this.browserWindow.setAutoHideMenuBar(false);
			this.browserWindow.setMenuBarVisibility(true);
		});

		/*
		// suspend / resume
		Electron.powerMonitor.on("suspend", () => {
			this.send("suspend");
		});
		Electron.powerMonitor.on("resume", () => {
			this.send("resume");
		});

		// lock
		this.browserWindow.on("hide", () => {
			this.send("hide");
		});
		this.browserWindow.on("show", () => {
			this.send("show");
		});
		//*/

		this.browserWindow.on("unresponsive", () => {
			this.send("blur");
		});
		this.browserWindow.once("close", () => {
			this.removeIpcEvents();

			// save config.json
			this._config.save();
		});
	}

	protected addIpcEvents(): void {
		// this log event can also be used in other window
		ipcMain.on("log", (event: IpcMessageEvent, ...args: any[]) => {
			this.log(...args);
			event.returnValue = null;
		})
		ipcMain.on("App.menu.click", (item: MenuItem, focusedWindow: Electron.BrowserWindow) => {
			this.onClickMenuItem(item, focusedWindow, null);
		})
		ipcMain.on("MainWindow.init", (event: IpcMessageEvent, arg: any) => {
			this.send("MainWindow.init", process.argv);
			event.returnValue = process.argv;
		})
		ipcMain.on("Get.Config", (event: IpcMessageEvent, arg: any) => {
			event.sender.send("Get.Config", this._config);
			event.returnValue = this._config;
		});
		ipcMain.on("update.menu.save-state", (event: IpcMessageEvent, arg: any) => {
			if (arg == null || arg === "") {
				MainMenu.call("disableAllSaveLoadState");
				return;
			}
			let filePath: string = arg;
			const pathInfo = path.parse(filePath);
			filePath = pathInfo.name + ".";
			filePath = path.join(this._config.path.save, filePath);

			const menu = Electron.Menu.getApplicationMenu();
			if (menu == null) {
				MainMenu.call("disableAllSaveLoadState");
				return;
			}

			for (let i = 1; i < 10; i++) {
				const loadItemId = "file.load-state." + i;
				const loadItem = menu.getMenuItemById(loadItemId);
				const saveItemId = "file.save-state." + i;
				const saveItem = menu.getMenuItemById(saveItemId);
				if (loadItem == null || saveItem == null) {
					continue;
				}
				saveItem.enabled = true;
				const saveFile = filePath + "sv" + i;
				if (!fs.existsSync(saveFile)) {
					loadItem.enabled = false;
					continue;
				}
				loadItem.enabled = true;
			}
		});
	}

	protected removeIpcEvents(): void {
		ipcMain.removeAllListeners("log");
		ipcMain.removeAllListeners("MainWindow.init");
		ipcMain.removeAllListeners("Get.Config");
		ipcMain.removeAllListeners("update.menu.save-state");
	}

	protected onClickMenuItem = (item: MenuItem, focusedWindow: Electron.BrowserWindow, event: Event): void => {
		const id: string = item.id;
		if (id == null) {
			return;
		}

		switch (id) {
			case "file.load-slot1":
				this.openFileOpenDialog();
				return;
			case "option.key":
				this.openKeyConfigWindow();
				return;
			case "help.open-app-folder":
				Electron.shell.openItem(Config.getCurrentPath());
				return;
			case "help.version":
				this.openVersionWindow();
				return;
		}

		if (id.indexOf("option.screen.x") == 0) {
			const scale = Number(id.substr(-1, 1));
			const width = Constants.ScreenWidth * scale;
			const height = Constants.ScreenHeight * scale;
			this.setWindowSize(width, height);
			return;
		}
		this.send("menu", item);
	}

	protected setWindowSize(width: number, height: number): void {
		this.browserWindow.setContentSize(width, height, false);
	}

	protected openFileOpenDialog() {
		let dialog = new OpenDialog();
		dialog.defaultPath = Config.getCurrentPath();
		dialog.addFilter("Game Boy Rom Image", ["gb", "gbc", "zip"]);
		dialog.addFilter("All Files", ["*"]);
		dialog.on("select", (filenames) => {
			if (filenames.length <= 0) {
				return;
			}
			this.send("load", filenames[0]);
			dialog = null;
		});
		dialog.show();
	}

	protected openKeyConfigWindow(): void {
		if (this._keyConfigWindow != null) {
			this._keyConfigWindow.show();
			return;
		}

		this._keyConfigWindow = new KeyConfigWindow(this.browserWindow, this._config.key);
		this._keyConfigWindow.browserWindow.once("ready-to-show", () => {
			this._keyConfigWindow.show();
		});
		this._keyConfigWindow.browserWindow.once("close", () => {
			this._keyConfigWindow.destroy();
			this._keyConfigWindow = null;
		});
		this._keyConfigWindow.once("close", (keyConfig: KeyConfig) => {
			this._config.key = keyConfig;
			this.send("Get.Config", this._config);
		});
	}

	protected openVersionWindow(): void {
		if (this._versionWindow != null) {
			this._versionWindow.show();
			return;
		}

		this._versionWindow = new VersionWindow(this.browserWindow);
		this._versionWindow.browserWindow.once("ready-to-show", () => {
			this._versionWindow.show();
		});
		this._versionWindow.browserWindow.once("close", () => {
			this._versionWindow.destroy();
			this._versionWindow = null;
		});
	}
}