import { Config } from "./Config";
import { Constants } from "../Constants";

export class WindowConfig {
	public width: number = Constants.ScreenWidth * 3;
	public height: number = Constants.ScreenHeight * 3;

	public static fromJSON(json: any): WindowConfig {
		const windowConfig = new WindowConfig();
		if (json == null) {
			return windowConfig;
		}

		for (var name in windowConfig) {
			if (!windowConfig.hasOwnProperty(name)) {
				continue;
			}
			windowConfig[name] = json[name];
		}
		return windowConfig;
	}
}