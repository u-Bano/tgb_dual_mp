import * as Electron from "electron";

import { MainMenu } from "./MainMenu";
import { MainWindow } from "./windows/MainWindow";
import { KeyConfigWindow } from "./windows/KeyConfigWindow";
import { VersionWindow } from "./windows/VersionWindow";

class NodeMain {
	protected _app: Electron.App = null;
	protected _mainMenu: MainMenu = null;
	protected _mainWindow: MainWindow = null;

	constructor(app: Electron.App) {
		this._app = app;
		//this._app.disableHardwareAcceleration();
		this._app.once("ready", this.onReady);
		this._app.once("window-all-closed", this.onWindowAllClosed);
	}

	protected onReady = () => {
		//*
		this._mainMenu = new MainMenu();
		const menu = this._mainMenu.createMenu();
		Electron.Menu.setApplicationMenu(menu);
		//*/

		//*
		this._mainWindow = new MainWindow();
		this._mainWindow.browserWindow.once("ready-to-show", () => {
			this._mainWindow.show();
		});
		this._mainWindow.browserWindow.once("closed", () => {
			this._mainWindow.destroy();
		});
		//*/

		/*
		const keyConfig = new KeyConfigWindow();
		keyConfig.browserWindow.once("closed", () => {
			this._app.quit();
		});
		keyConfig.browserWindow.webContents.openDevTools();
		keyConfig.show();
		//*/

		/*
		const version = new VersionWindow();
		version.browserWindow.once("closed", () => {
			this._app.quit();
		});
		version.browserWindow.webContents.openDevTools();
		version.show();
		//*/
	}

	protected onWindowAllClosed = () => {
		if (process.platform != "darwin") {
			this._app.quit();
		}
	}
}

let main: NodeMain;
main = new NodeMain(Electron.app);
