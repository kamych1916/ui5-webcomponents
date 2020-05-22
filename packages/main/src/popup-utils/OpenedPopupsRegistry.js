import { isEscape } from "@ui5/webcomponents-base/dist/Keys.js";

let registry = [];

const addOpenedPopup = (instance, parentPopovers = []) => {
	if (!registry.includes(instance)) {
		registry.push({
			instance,
			parentPopovers,
		});
	}

	if (registry.length === 1) {
		attachGlobalListener();
	}
};

const removeOpenedPopup = instance => {
	registry = registry.filter(el => {
		return el !== instance.instance;
	});

	if (!registry.length) {
		detachGlobalListener();
	}
};

const getOpenedPopups = () => {
	return [...registry];
};

const _keydownListener = event => {
	if (isEscape(event)) {
		const topPopup = registry[registry.length - 1];

		topPopup && topPopup.instance.close(true);
	}
};

const attachGlobalListener = () => {
	document.addEventListener("keydown", _keydownListener);
};

const detachGlobalListener = () => {
	document.removeEventListener("keydown", _keydownListener);
};

export { addOpenedPopup, removeOpenedPopup, getOpenedPopups };
