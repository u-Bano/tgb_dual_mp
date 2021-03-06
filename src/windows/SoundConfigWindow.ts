import * as Electron from "electron";
import * as path from "path";
import * as url from "url";

import { ipcMain, IpcMessageEvent } from "electron";
import { EventEmitter } from "events";
import { Config } from "../config/Config";
import { SoundConfig } from "../config/SoundConfig";

module Settings {
	export const Width: number = 175;
	export const Height: number = 295;
	export const Title: string = "Sound Settings";
	export const Content: string = "../../html/SoundConfig.html";
}

export class SoundConfigWindow extends EventEmitter {
	public static Settings = Settings;
	public browserWindow: Electron.BrowserWindow = null;
	public soundConfig: SoundConfig = new SoundConfig();

	constructor(parent: Electron.BrowserWindow = null, config: Config = null) {
		super();

		if (config != null && config.sound != null) {
			this.soundConfig = config.sound;
		}

		this.initWindow(parent, config);
		this.addIpcEvents();
	}

	public show(): void {
		this.browserWindow.show();
	}

	public destroy(): void {
		this.browserWindow.destroy();
	}

	protected initWindow(parent: Electron.BrowserWindow, config: Config): void {
		if (config == null) {
			config = new Config();
		}
		this.browserWindow = new Electron.BrowserWindow({
			parent: parent,
			title: Settings.Title,
			type: "toolbar",
			useContentSize: true,
			width: Settings.Width,
			height: Settings.Height,
			x: config.window.soundX,
			y: config.window.soundY,
			acceptFirstMouse: true,
			minimizable: false,
			maximizable: false,
			resizable: false,
			fullscreenable: false,
			autoHideMenuBar: true,
			show: false
		});
		this.browserWindow.setMenu(null);
		this.browserWindow.loadURL(url.format({
			pathname: path.join(__dirname, Settings.Content),
			protocol: "file:",
			slashes: true
		}));
		this.browserWindow.once("close", () => {
			this.removeIpcEvents();
		});
	}
	
	protected addIpcEvents(): void {
		ipcMain.once("SoundConfigWindow.init", (event: IpcMessageEvent, arg: any): void => {
			const languageJson = Config.getLanguageJson();
			event.returnValue = {
				languageJson: languageJson,
				soundConfig: this.soundConfig
			};
		});
		ipcMain.on("SoundConfigWindow.apply", (event: IpcMessageEvent, arg: any): void => {
			this.soundConfig = arg;
			this.emit("apply", this.soundConfig);
			event.returnValue = null;
		});
	}

	protected removeIpcEvents(): void {
		ipcMain.removeAllListeners("SoundConfigWindow.init");
		ipcMain.removeAllListeners("SoundConfigWindow.apply");
	}
}
